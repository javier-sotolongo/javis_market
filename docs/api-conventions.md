# Convenciones de API

> **Propuesta.** Ningún endpoint de `/api/v1` está implementado todavía. La única ruta existente es
> `GET /api/health` (comprobación de vida). Las rutas mencionadas aquí son ejemplos de la convención.

## Principios

- Las rutas HTTP viven en `web/src/app/api/v1/**/route.ts` y son **delgadas**: parsean y validan la entrada,
  resuelven la identidad, llaman a un servicio de `@javis-market/api` y traducen el resultado a HTTP.
- La lógica de negocio y la autorización están en el servicio, no en la ruta.
- Las páginas de servidor no llaman a `/api/v1`; usan los servicios directamente. La API HTTP es para el
  navegador (componentes cliente), webhooks y, en el futuro, integraciones.

## Rutas

- Prefijo versionado: `/api/v1`. Un cambio incompatible crea `/api/v2`; no se modifica el contrato existente.
- Recursos en plural, minúsculas y con guiones: `/api/v1/products`, `/api/v1/checkout-sessions`.
- Acciones que no son CRUD como sub-recurso con verbo: `POST /api/v1/orders/{id}/cancel`.
- Rutas administrativas bajo `/api/v1/admin/...`; webhooks bajo `/api/v1/webhooks/{provider}`.
- JSON en `camelCase`. Fechas ISO 8601 en UTC. Dinero como objeto `{ "amountCents": 1299, "currency": "USD" }`.
- Identificadores opacos; nunca autoincrementales expuestos en rutas públicas.

## Validación

- Toda entrada (cuerpo, parámetros, _query_, cabeceras relevantes) se valida en el servidor con esquemas
  (propuesta: Zod) antes de llegar al servicio. Se rechazan campos desconocidos en operaciones de escritura.
- El servicio vuelve a validar las invariantes de negocio (stock, estados, permisos).
- Límite de tamaño del cuerpo por ruta. Los webhooks leen el cuerpo **crudo** para verificar la firma.

## Errores

Formato único (tipo `ApiErrorBody` en [`shared/src/api.ts`](../shared/src/api.ts)):

```json
{
  "error": {
    "code": "insufficient_stock",
    "message": "Some items are no longer available in the requested quantity.",
    "requestId": "req_…",
    "details": [{ "path": "lines[0].quantity", "message": "Only 2 left" }]
  }
}
```

| HTTP | `code` (ejemplos)                                                         | Uso                                                  |
| ---- | ------------------------------------------------------------------------- | ---------------------------------------------------- |
| 400  | `invalid_request`, `validation_failed`                                    | Entrada mal formada o inválida                       |
| 401  | `unauthenticated`                                                         | Falta sesión administrativa                          |
| 403  | `forbidden`                                                               | Sesión válida sin el permiso requerido               |
| 404  | `not_found`                                                               | Recurso inexistente **o** no accesible para el actor |
| 409  | `conflict`, `insufficient_stock`, `invalid_state`, `idempotency_conflict` | Conflicto con el estado actual                       |
| 413  | `payload_too_large`                                                       | Cuerpo o archivo demasiado grande                    |
| 422  | `business_rule_violation`                                                 | Regla de negocio no cumplida                         |
| 429  | `rate_limited`                                                            | Límite de solicitudes (con `Retry-After`)            |
| 500  | `internal_error`                                                          | Error inesperado; sin detalles internos              |

- `message` es apto para mostrar; nunca incluye trazas, SQL ni datos de otros clientes.
- Los servicios lanzan errores de dominio tipados; un único adaptador en `web` los convierte a HTTP.
- Cada respuesta incluye `X-Request-Id`, que también aparece en los logs.

## Paginación

- Por cursor: `?limit=20&cursor=<opaco>`; `limit` por defecto 20, máximo 100.
- Respuesta: `{ "data": [...], "nextCursor": "…" | null }`.
- Orden estable y explícito (`?sort=createdAt` / `-createdAt`) sobre campos permitidos por endpoint.
- Los filtros se declaran por endpoint; no se admiten filtros arbitrarios.

## Permisos

- Rutas públicas de tienda: sin sesión; solo leen catálogo publicado o actúan sobre el carrito/checkout del propio
  comprador (identificado por cookie).
- Rutas `/api/v1/admin/**`: requieren sesión administrativa y el permiso concreto de la operación
  ([modules.md](modules.md#permisos)). La comprobación ocurre en el servicio.
- Las operaciones que cambian estado aceptan solo `POST`, `PUT`, `PATCH` o `DELETE` y exigen protección CSRF
  cuando se autentican por cookie ([security.md](security.md)).

## Idempotencia

- Las operaciones de creación con efectos económicos (`POST /checkout-sessions`, iniciar pago, reembolsos) aceptan
  la cabecera `Idempotency-Key` (UUID generado por el cliente).
- Misma clave + misma petición ⇒ misma respuesta almacenada. Misma clave + petición distinta ⇒
  `409 idempotency_conflict`. Las claves caducan (propuesta: 24 h).
- Los webhooks usan el identificador del evento del proveedor como clave natural.

## Pedidos de invitados

Sin cuentas en v1, el acceso a un pedido se protege así:

1. Al crear el pedido se genera un **token de acceso aleatorio** (≥ 128 bits). En la base de datos se guarda solo
   su _hash_.
2. El token se entrega una vez: en la página de confirmación y en el enlace del correo de confirmación.
3. Consulta: el token viaja en la ruta del enlace o en una cookie `HttpOnly`, nunca como parámetro de _query_
   en logs. El servidor compara el _hash_ en tiempo constante.
4. El número de pedido **no** basta para consultar un pedido. Una búsqueda alternativa por número + email solo
   envía un enlace al email registrado; nunca muestra datos directamente.
5. Pedido inexistente o token incorrecto responden igual (`404 not_found`) para no revelar existencia.
6. Las respuestas de pedidos de invitado excluyen datos internos (notas, coste, actor admin) y llevan
   `Cache-Control: no-store`.
7. Límite de solicitudes por IP en consultas de pedidos y en el reenvío de enlaces.
8. El token puede caducar o revocarse desde el panel (propuesta: vigencia prolongada, a confirmar).
