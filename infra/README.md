# Plantillas de infraestructura

Configuración y scripts del VPS de producción. Valores concretos en [`server/config.sh`](server/config.sh).

| Archivo                                                                          | Uso                                                          |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [`pm2/ecosystem.config.cjs`](pm2/ecosystem.config.cjs)                           | Procesos `javis-web` y `javis-worker` (1 instancia cada uno) |
| [`nginx/javis-market.conf.template`](nginx/javis-market.conf.template)           | Proxy inverso, HTTPS e imágenes públicas                     |
| [`nginx/javis-market-http.conf.template`](nginx/javis-market-http.conf.template) | Nginx provisional solo HTTP (antes de tener certificado)     |
| [`server/setup.sh`](server/setup.sh)                                             | Preparación del servidor (sudo, una vez)                     |
| [`server/deploy.sh`](server/deploy.sh)                                           | Despliegue (usuario de la app)                               |
| [`server/ssl.sh`](server/ssl.sh)                                                 | Certificados Let's Encrypt y Nginx HTTPS (sudo)              |
| [`server/backup-db.sh`](server/backup-db.sh)                                     | Copia local de la base (cron diario y antes de migrar)       |
| [`nginx/javis-proxy-headers.conf`](nginx/javis-proxy-headers.conf)               | Cabeceras comunes de proxy                                   |
| [`../.env.example`](../.env.example)                                             | Variables de entorno (desarrollo y producción)               |

Procedimiento completo: [docs/deployment.md](../docs/deployment.md).
