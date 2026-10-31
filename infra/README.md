# Plantillas de infraestructura

Plantillas comentadas para el VPS del cliente. **No se han aplicado en ningún servidor.**
Los valores entre `<...>` son marcadores pendientes (dominio, rutas, puertos).

| Archivo                                                                | Uso                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| [`pm2/ecosystem.config.cjs`](pm2/ecosystem.config.cjs)                 | Procesos `javis-web` y `javis-worker` (1 instancia cada uno) |
| [`nginx/javis-market.conf.template`](nginx/javis-market.conf.template) | Proxy inverso, HTTPS e imágenes públicas                     |
| [`nginx/javis-proxy-headers.conf`](nginx/javis-proxy-headers.conf)     | Cabeceras comunes de proxy                                   |
| [`../.env.example`](../.env.example)                                   | Variables de entorno (desarrollo y producción)               |

Procedimiento completo: [docs/deployment.md](../docs/deployment.md).
