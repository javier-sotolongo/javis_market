# Módulos de negocio

Los módulos viven en [`api/src/modules/`](../api/src/modules/). Este documento fija sus responsabilidades y límites.

Implementados: `access`, `catalog`, `inventory`, `cart` e `integrations` (Invello). Pendientes: `checkout`,
`orders`, `payments`, `customers` y `content`.

## Reglas generales

- Cada módulo expone sus servicios desde su propio `index.ts`. Los demás módulos usan esa entrada, nunca sus
  archivos internos ni sus tablas.
- **Un dato tiene un único módulo propietario**, el único que lo escribe. Los demás lo leen a través de servicios
  del propietario o mediante consultas de solo lectura acordadas.
- La autorización se comprueba dentro del servicio (no solo en la ruta HTTP), con el permiso que exige cada
  operación ([security.md](security.md)).
- Las reglas transversales de dinero, reservas, pagos e idempotencia están definidas **una sola vez** en
  [checkout-inventory-payments.md](checkout-inventory-payments.md). Los módulos las aplican, no las redefinen.
- Las operaciones que modifican varios módulos las coordina un único módulo orquestador (`checkout` para la
  compra, `payments` para la confirmación de pago), que llama a los servicios de los demás.

## Mapa de módulos

| Módulo         | Responsabilidad                                                                                | Datos propios                                 | No hace                                                         |
| -------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| `catalog`      | Productos, categorías, variantes/SKU, precios de venta, imágenes y visibilidad                 | Productos, categorías, variantes, imágenes    | Existencias; precio cobrado en un pedido ya creado              |
| `inventory`    | Existencias físicas, movimientos, reservas y disponibilidad                                    | Existencias, movimientos, reservas            | Decidir cuándo se reserva o se descuenta (lo pide su llamador)  |
| `cart`         | Carritos y líneas; recalcular importes indicativos con precios vigentes                        | Carritos, líneas de carrito                   | Reservar inventario; crear pedidos                              |
| `checkout`     | Orquestar la compra: validar carrito, calcular totales, reservar, crear pedido e iniciar pago  | Sesiones de checkout                          | Confirmar pagos; tarifas e impuestos definitivos (pendientes)   |
| `orders`       | Pedidos, líneas con copia histórica, estados del pedido y de preparación/envío, notas internas | Pedidos, líneas, envíos                       | Cobrar o reembolsar; mover inventario directamente              |
| `payments`     | Intentos de pago, eventos del proveedor, confirmación verificada, reembolsos                   | Intentos de pago, eventos de pago, reembolsos | Cambiar existencias por su cuenta; enviar correos               |
| `customers`    | Datos de contacto y direcciones de compradores (invitados en v1)                               | Clientes, direcciones                         | Autenticación del panel                                         |
| `access`       | Usuarios administrativos, sesiones, roles, permisos y auditoría                                | Usuarios admin, sesiones, roles, auditoría    | Reglas de negocio de otros módulos                              |
| `content`      | Páginas y textos editables (legales, informativos)                                             | Páginas de contenido                          | Catálogo                                                        |
| `integrations` | Catálogo del proveedor desde Invello (ADR 0008); futuras integraciones (Deliflow)              | Catálogo de Invello, estado de sincronización | Escribir en tablas de otros módulos sin pasar por sus servicios |

Adaptadores (no son módulos de negocio): `adapters/payments`, `adapters/email`, `adapters/storage`. Los usan los
módulos a través de interfaces; nunca se importa el SDK de un proveedor fuera de su adaptador.

## Quién puede modificar qué

### Inventario (existencias, reservas, movimientos)

Solo el módulo `inventory` escribe estos datos. Toda modificación genera un movimiento con motivo y actor.

| Operación                                   | Lo solicita                     | Actor autorizado                           |
| ------------------------------------------- | ------------------------------- | ------------------------------------------ |
| Crear reserva                               | `checkout`                      | Comprador (invitado) en su propio checkout |
| Liberar reserva (cancelación o vencimiento) | `checkout`, `worker`            | Sistema                                    |
| Convertir reserva en salida (venta)         | `payments` al confirmar el pago | Sistema, tras pago verificado              |
| Entrada / ajuste manual / recuento          | Panel                           | Admin con permiso `inventory:adjust`       |
| Reingreso por devolución                    | Panel (vía `orders`)            | Admin con permiso `inventory:restock`      |

### Pedidos

Solo `orders` escribe pedidos, líneas y envíos.

| Operación                             | Lo solicita                          | Actor autorizado                        |
| ------------------------------------- | ------------------------------------ | --------------------------------------- |
| Crear pedido (pendiente de pago)      | `checkout`                           | Comprador                               |
| Marcar como pagado                    | `payments`                           | Sistema, tras pago verificado           |
| Cambiar estado de preparación / envío | Panel                                | Admin con permiso `orders:fulfill`      |
| Cancelar                              | Panel o sistema (pago no completado) | Admin con `orders:cancel` / Sistema     |
| Editar datos de contacto o dirección  | Panel                                | Admin con `orders:edit`; queda auditado |
| Consultar un pedido de invitado       | Tienda                               | Portador del token de acceso del pedido |

Las líneas y los importes de un pedido pagado no se editan; las correcciones se hacen con operaciones explícitas
(cancelación, reembolso, nota).

### Pagos

Solo `payments` escribe intentos, eventos y reembolsos, y solo a través del adaptador de pagos.

| Operación                      | Lo solicita                     | Actor autorizado                    |
| ------------------------------ | ------------------------------- | ----------------------------------- |
| Crear intento de pago          | `checkout`                      | Comprador                           |
| Registrar evento del proveedor | Ruta de webhook                 | Proveedor, con firma verificada     |
| Confirmar pago                 | `payments` (webhook o consulta) | Sistema; nunca el navegador         |
| Reembolso total o parcial      | Panel                           | Admin con permiso `payments:refund` |

Ningún usuario puede marcar manualmente un pedido como pagado sin un pago verificado. Si en el futuro se admiten
pagos fuera de línea, será una operación nueva, con permiso propio y auditada.

## Permisos

**v1: un único rol `admin`** con todos los permisos ([ADR 0007](decisions/0007-single-admin-role.md)). Los
servicios comprueban `requireAdmin(actor)` en cada operación y la auditan; las tablas de "Quién puede modificar qué"
indican el permiso que se exigirá cuando existan más roles.

Diseño para roles futuros: cadenas `recurso:acción` asignadas a roles:

`catalog:read`, `catalog:write`, `inventory:read`, `inventory:adjust`, `inventory:restock`, `orders:read`,
`orders:edit`, `orders:fulfill`, `orders:cancel`, `payments:read`, `payments:refund`, `customers:read`,
`content:write`, `access:manage`, `audit:read`.
