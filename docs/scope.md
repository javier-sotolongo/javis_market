# Alcance

Este documento separa lo **confirmado**, lo **propuesto** (a validar con el cliente) y lo **pendiente**
(sin información suficiente). No es un plan de desarrollo.

Leyenda: ✅ Confirmado · 🟡 Propuesto · ⏳ Pendiente

## Contexto del negocio

| Tema                    | Estado | Detalle                                                                                   |
| ----------------------- | ------ | ----------------------------------------------------------------------------------------- |
| Mercado                 | ✅     | Tienda online para Estados Unidos                                                         |
| Moneda                  | ✅     | USD                                                                                       |
| Marca                   | ✅     | Javis Market                                                                              |
| Idioma de la tienda     | 🟡     | Inglés como idioma inicial                                                                |
| Logo e identidad visual | ⏳     | Sin entregar; la interfaz usa tokens provisionales                                        |
| Inventario              | ✅     | Propio, independiente de Deliflow e Invello                                               |
| Origen de productos     | ✅     | Productos de Deliflow y de otros proveedores                                              |
| Imágenes de Deliflow    | ✅     | Se pueden reutilizar las imágenes autorizadas; ⏳ falta definir cuáles y cómo se entregan |
| Precios de venta        | ✅     | Los define Javis Market                                                                   |
| Dominio                 | ⏳     | Lo facilita Marco; nombre y accesos pendientes                                            |

## Funcionalidades previstas (primera versión)

| Funcionalidad             | Estado | Notas                                                                                     |
| ------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| Catálogo                  | ✅     | Productos, categorías, variantes/SKU, imágenes                                            |
| Carrito                   | ✅     | Sin reserva de inventario al añadir                                                       |
| Checkout                  | ✅     | Reserva temporal de inventario y pago verificado en servidor                              |
| Compra como invitado      | 🟡     | Sin cuenta de cliente en la primera versión                                               |
| Cuentas de cliente        | ⏳     | No previstas en v1 salvo que se confirme lo contrario                                     |
| Pedidos                   | ✅     | Estados separados de pedido, pago y preparación/envío                                     |
| Panel administrativo      | ✅     | Catálogo, inventario, pedidos, pagos/reembolsos y contenido                               |
| Contenido editable        | 🟡     | Páginas legales y textos básicos (política de envíos, devoluciones, privacidad, términos) |
| Notificaciones por correo | ✅     | Confirmación de pedido y cambios de estado; ⏳ proveedor SMTP                             |
| Reembolsos                | 🟡     | Desde el panel, a través del adaptador de pagos                                           |

## Decisiones técnicas

| Decisión                                   | Estado | Referencia                                                          |
| ------------------------------------------ | ------ | ------------------------------------------------------------------- |
| Monolito modular Next.js + PostgreSQL      | ✅     | [ADR 0001](decisions/0001-modular-monolith.md)                      |
| Organización con npm workspaces            | ✅     | [ADR 0002](decisions/0002-repository-layout.md)                     |
| Inventario independiente                   | ✅     | [ADR 0003](decisions/0003-independent-inventory.md)                 |
| VPS del cliente con PM2 y Nginx            | ✅     | [ADR 0004](decisions/0004-pm2-deployment.md)                        |
| Imágenes en directorio persistente del VPS | ✅     | [deployment.md](deployment.md)                                      |
| Pagos y correo detrás de adaptadores       | ✅     | [integrations.md](integrations.md)                                  |
| Primera versión independiente de Invello   | ✅     | [integrations.md](integrations.md)                                  |
| Stripe como pasarela                       | 🟡     | Sujeta a cambios                                                    |
| Librería de autenticación del panel        | ⏳     | Se seleccionará antes de implementarla ([security.md](security.md)) |
| Librería de validación                     | 🟡     | Zod (todavía no instalada)                                          |
| Herramientas de pruebas                    | ⏳     | A definir con el plan de desarrollo                                 |

## Asuntos pendientes

Necesarios antes o durante la planificación del desarrollo:

1. **Pagos**: confirmar Stripe u otra pasarela; titular de la cuenta y credenciales (modo prueba y producción);
   métodos de pago admitidos.
2. **Correo**: proveedor SMTP, dominio remitente y configuración de SPF/DKIM/DMARC.
3. **Entregas**: métodos de envío, zonas, tarifas, plazos y si habrá recogida local.
4. **Impuestos**: reglas de _sales tax_ por estado, obligación de recaudación (_nexus_) y si se calcularán
   internamente o con un servicio externo. Hasta decidirlo, el cálculo queda detrás de una interfaz.
5. **Invello**: alcance, dirección de los datos, mecanismo y responsables de una posible integración.
6. **Deliflow**: formato de entrega de datos e imágenes autorizadas; si la carga será manual o por archivo.
7. **Dominio**: nombre, acceso al DNS y responsable de la renovación.
8. **VPS**: sistema operativo, acceso, versión de PostgreSQL, rutas de almacenamiento, puertos, política de copias
   externas y destino de las mismas.
9. **Idioma**: confirmar inglés como idioma único inicial.
10. **Identidad visual**: logo, colores y tipografías.
11. **Políticas comerciales**: devoluciones, cancelaciones, plazo de reserva en checkout, textos legales.
12. **Roles administrativos**: quién usará el panel y con qué permisos.
