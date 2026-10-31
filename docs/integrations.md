# Integraciones

Toda integración externa se accede a través de un **adaptador** en `api/src/adapters/` o del módulo
`integrations`. Los módulos de negocio dependen de interfaces propias, no de SDKs de terceros.

| Integración | Estado                                                   | Adaptador / módulo                      |
| ----------- | -------------------------------------------------------- | --------------------------------------- |
| Pagos       | 🟡 Stripe propuesto                                      | `adapters/payments` (`PaymentProvider`) |
| Correo      | ⏳ Proveedor SMTP pendiente                              | `adapters/email` (`EmailProvider`)      |
| Archivos    | ✅ Disco del VPS                                         | `adapters/storage` (`FileStorage`)      |
| Deliflow    | ⏳ Origen de productos e imágenes; mecanismo sin definir | `modules/integrations`                  |
| Invello     | ⏳ Sin alcance definido                                  | — (nada implementado ni contratado)     |

## Pagos — Stripe (propuesta intercambiable)

- Stripe es la pasarela **propuesta**, sujeta a cambios. Cuenta, titular y credenciales pendientes.
- Interfaz: [`api/src/adapters/payments/payment-provider.ts`](../api/src/adapters/payments/payment-provider.ts).
  Crear intento de pago, verificar webhooks y reembolsar, siempre con claves de idempotencia.
- Una futura implementación `StripePaymentProvider` vivirá en `adapters/payments/stripe/`; el SDK de Stripe solo se
  importará allí. Cambiar de pasarela implica una nueva implementación de la interfaz, no cambios en los módulos.
- Se selecciona con `PAYMENT_PROVIDER`. Sin valor, los pagos quedan deshabilitados y la compilación no se ve
  afectada.
- Variables previstas: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- Los datos de tarjeta los captura la pasarela (elementos alojados o página de pago); nunca pasan por el servidor.
- Reglas de confirmación, idempotencia y reembolsos: [checkout-inventory-payments.md](checkout-inventory-payments.md).
- Pendiente: métodos de pago, captura inmediata o diferida, moneda de liquidación, gestión de disputas.

## Correo — SMTP (pendiente)

- Proveedor SMTP **sin elegir**. Variables previstas: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`,
  `EMAIL_FROM`; se selecciona con `EMAIL_PROVIDER`.
- Interfaz: [`api/src/adapters/email/email-provider.ts`](../api/src/adapters/email/email-provider.ts).
- Sin proveedor configurado, el adaptador previsto para desarrollo solo registra el mensaje en el log.
- Envío desde el worker mediante _outbox_ con reintentos; un fallo nunca invalida una compra.
- Pendiente: proveedor, dominio remitente, SPF/DKIM/DMARC, plantillas e idioma.

## Almacenamiento de archivos

- Interfaz: [`api/src/adapters/storage/file-storage.ts`](../api/src/adapters/storage/file-storage.ts) con
  visibilidad `public` / `private`.
- Implementación prevista: sistema de archivos del VPS (`STORAGE_PUBLIC_DIR`, `STORAGE_PRIVATE_DIR`). La interfaz
  permite migrar a almacenamiento de objetos sin cambiar los módulos.

## Deliflow

- Javis Market vende productos de Deliflow y de otros proveedores, con **inventario y precios propios**
  ([ADR 0003](decisions/0003-independent-inventory.md)). El campo `supplier` del producto lo identifica (uso interno).
- Las **imágenes autorizadas** de Deliflow u otro almacenamiento se incorporan con **"Import from URL"** en la ficha
  del producto: el servidor descarga la imagen, la procesa y la guarda en el VPS, conservando la URL de origen como
  referencia ([ADR 0006](decisions/0006-product-images.md)). No hay enlaces en caliente al almacenamiento externo.
- `IMAGE_IMPORT_ALLOWED_HOSTS` permite limitar la importación a los dominios de esos almacenamientos.
- La carga de productos y existencias es manual desde el panel; una importación masiva queda pendiente de definir.

## Invello

- **La primera versión funciona sin Invello.** No hay importaciones, sincronizaciones, API keys ni acceso a su base
  de datos.
- No se define ningún contrato, endpoint ni formato de datos con Invello. No se ha asumido qué sistema sería la
  fuente de verdad de ningún dato.
- El modelo conceptual reserva una entidad genérica `ExternalReference` para vincular entidades locales con
  identificadores externos cuando exista una integración ([data-model.md](data-model.md#referencias-externas-sujetas-a-definir-la-integración)).
- Preguntas a resolver antes de diseñarla: qué datos se intercambian y en qué dirección, frecuencia (tiempo real o
  lotes), mecanismo (API, archivos, webhooks), autenticación, responsable de cada sistema, comportamiento ante
  conflictos y ante indisponibilidad de Invello.
