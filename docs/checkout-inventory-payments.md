# Checkout, inventario y pagos

Reglas de referencia. Los módulos `cart`, `checkout`, `inventory`, `orders` y `payments` las aplican; no se
redefinen en otros documentos ([modules.md](modules.md)).

## 1. Dinero

- Todo importe se representa en **centavos enteros** (`amountCents`) con **moneda explícita** (`currency`, `USD`
  en v1). Tipo de referencia: `Money` en [`shared/src/money.ts`](../shared/src/money.ts).
- Prohibido usar números de coma flotante para importes, y sumar importes de monedas distintas.
- Los redondeos (impuestos, descuentos porcentuales) se hacen una vez, por línea y con una regla documentada
  (por defecto: redondeo al centavo más cercano, mitades hacia arriba).
- Formatear a texto solo en la capa de interfaz.

## 2. Totales calculados en el servidor

- El navegador nunca envía precios ni totales que se acepten como válidos; solo variantes y cantidades.
- El servidor calcula subtotal, envío, impuestos, descuentos y total con los precios vigentes al crear la sesión
  de checkout, y vuelve a validarlos antes de crear el pedido.
- El importe del intento de pago es exactamente el total del pedido. Al confirmar el pago se compara el importe y
  la moneda cobrados con el total del pedido; si no coinciden, el pedido queda en revisión y no se marca pagado.
- Envío e impuestos se calculan detrás de interfaces (`ShippingCalculator`, `TaxCalculator`) porque sus reglas
  están pendientes.

## 3. Disponibilidad de inventario

```text
disponible = físico (onHand) − reservado (reserved)
```

- Añadir al carrito **no** reserva inventario. El carrito puede mostrar disponibilidad, pero no la garantiza.
- La reserva se crea **al iniciar el checkout**, con vencimiento (`expiresAt`, valor propuesto: 15 minutos,
  pendiente de confirmar).
- Una reserva vencida se libera por el worker; además, cualquier cálculo de disponibilidad ignora reservas con
  `expiresAt` pasado aunque el worker aún no las haya procesado.
- Si el pago se confirma, la reserva se **consume**: se descuenta `onHand` y `reserved` en la misma transacción y
  se registra un movimiento `sale`.

## 4. Atomicidad y sobreventa

- Reservar es una operación atómica condicionada en PostgreSQL, por ejemplo:

  ```sql
  UPDATE stock_level
     SET reserved = reserved + :qty
   WHERE variant_id = :id AND on_hand - reserved >= :qty;
  -- 0 filas afectadas ⇒ sin stock suficiente
  ```

- Con varias líneas, todas las reservas de un checkout se crean en una única transacción corta; si alguna falla,
  no se reserva ninguna. Las filas se bloquean en orden determinista (por `variant_id`) para evitar interbloqueos.
- Restricciones de base de datos (`CHECK`) refuerzan `onHand ≥ 0` y `0 ≤ reserved ≤ onHand`.

## 5. Transacciones y proveedores externos

- **Nunca** se mantiene una transacción de base de datos abierta durante una llamada a un proveedor (pagos, correo,
  almacenamiento remoto).
- Patrón: transacción corta que registra la intención (p. ej. intento de pago `pending` con clave de
  idempotencia) → llamada al proveedor fuera de la transacción → transacción corta que guarda el resultado.
- Si el proceso cae entre pasos, el estado persistido y la clave de idempotencia permiten reanudar sin duplicar.

## 6. Confirmación del pago

- El pago solo se considera confirmado cuando el **servidor** lo verifica: webhook con firma válida o consulta
  directa al proveedor. La página de retorno del navegador nunca confirma un pago; solo muestra el estado actual.
- Al confirmar, en una sola transacción: registrar el evento, marcar el intento como `succeeded`, consumir las
  reservas, marcar el pedido como pagado y encolar el correo de confirmación (_outbox_).

## 7. Idempotencia

- **Eventos del proveedor**: se guarda cada evento con su identificador único del proveedor. Un evento ya
  procesado se responde con éxito sin repetir efectos.
- **Operaciones del cliente** (crear checkout, iniciar pago): aceptan `Idempotency-Key`
  ([api-conventions.md](api-conventions.md#idempotencia)); un reintento devuelve el mismo resultado.
- **Llamadas al proveedor**: se envía una clave de idempotencia derivada del intento o reembolso local.
- **Transiciones de estado**: se aplican de forma condicional (`WHERE status = 'esperado'`), de modo que aplicar
  dos veces la misma transición no tiene efecto.
- **Trabajos del worker**: diseñados para poder repetirse tras un fallo o reinicio.

## 8. Reintentos, duplicados y pagos tardíos

| Situación                              | Tratamiento                                                                                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evento duplicado                       | Detectado por identificador único; se ignora y se responde 2xx                                                                                                                        |
| Eventos fuera de orden                 | Las transiciones solo avanzan; un evento que retrocede el estado se registra y no se aplica                                                                                           |
| Webhook no recibido                    | El worker consulta al proveedor los intentos `pending` antiguos                                                                                                                       |
| Fallo al procesar un webhook           | Se responde error para que el proveedor reintente; el evento queda registrado para reprocesar                                                                                         |
| Pago confirmado tras vencer la reserva | Se intenta reservar y consumir de nuevo. Si hay stock, el pedido sigue adelante. Si no, el pedido queda en `needs_review` para que un admin decida (reembolso o espera de reposición) |
| Pago confirmado de un pedido cancelado | No se reactiva automáticamente; queda en revisión para reembolso                                                                                                                      |
| Doble envío del formulario de checkout | La clave de idempotencia devuelve la misma sesión/pedido                                                                                                                              |

## 9. Estados separados

Un pedido tiene tres dimensiones independientes:

| Dimensión           | Valores propuestos                                                                   | Propietario                                    |
| ------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Estado del pedido   | `pending_payment`, `confirmed`, `needs_review`, `canceled`, `completed`              | `orders`                                       |
| Estado de pago      | `unpaid`, `authorized`, `paid`, `partially_refunded`, `refunded`, `failed`           | `payments` (derivado de intentos y reembolsos) |
| Preparación / envío | `unfulfilled`, `processing`, `partially_shipped`, `shipped`, `delivered`, `returned` | `orders`                                       |

Combinar estados en un único campo no está permitido.

## 10. Copia histórica

Al crear el pedido se copian a sus líneas los datos vendidos (SKU, nombres, opciones, imagen, precio unitario,
impuestos) y al pedido las direcciones y el contacto. Cambios posteriores en el catálogo o en el cliente no
alteran pedidos existentes.

## 11. Reembolsos y devoluciones de inventario

- Son **operaciones distintas**: reembolsar dinero (`payments`, permiso `payments:refund`) no reingresa
  inventario, y reingresar inventario (`inventory` vía `orders`, permiso `inventory:restock`) no reembolsa.
- Cada una requiere un admin autorizado, motivo e importe/cantidad explícitos, y queda auditada.
- La suma de reembolsos no puede superar lo cobrado; la de reingresos no puede superar lo vendido.

## 12. Correo

- El correo se encola en la misma transacción que el cambio de negocio (_outbox_) y lo envía el worker con
  reintentos.
- **Un fallo de correo nunca invalida ni revierte una compra.** Los fallos se registran y se pueden reenviar
  desde el panel.
