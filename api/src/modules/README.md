# Módulos de negocio

Cada carpeta corresponde a un módulo del monolito. Todavía no contienen implementación.

Responsabilidades, límites y propietarios de cada dato: [docs/modules.md](../../../docs/modules.md).

Reglas:

- Un módulo expone servicios desde su propio `index.ts`; otros módulos no importan sus archivos internos.
- Solo el módulo propietario escribe sus tablas (inventario → `inventory`, pedidos → `orders`, pagos → `payments`).
- La autorización se comprueba dentro del servicio, no solo en la ruta HTTP.
