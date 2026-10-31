# Despliegue

> Nada de esto se ha ejecutado todavía: no hay servidor configurado ni despliegue realizado. Los valores entre
> `<...>` son marcadores pendientes. Plantillas en [`infra/`](../infra/).

## Entornos

| Entorno    | Dónde                  | Base de datos                           | Pagos / correo                                         |
| ---------- | ---------------------- | --------------------------------------- | ------------------------------------------------------ |
| Desarrollo | Equipo local           | PostgreSQL local                        | Desactivados o modo prueba del proveedor; correo a log |
| Pruebas    | Local / CI (a definir) | Base dedicada, recreada por las pruebas | Adaptadores falsos                                     |
| Producción | VPS del cliente        | PostgreSQL en el VPS                    | Credenciales reales del cliente                        |

Un entorno de _staging_ en el mismo VPS (otro usuario, base y puerto) es posible más adelante; no se prevé ahora.

### Desarrollo

```bash
npm install
cp .env.example .env          # completar DATABASE_URL para trabajar con datos
npm run db:migrate:dev        # cuando existan modelos
npm run dev                   # web en http://localhost:3000
npm run dev:worker            # worker, en otra terminal
```

## Estructura prevista en el VPS

| Elemento                  | Ruta (marcador)         | Notas                                                             |
| ------------------------- | ----------------------- | ----------------------------------------------------------------- |
| Código desplegado         | `<APP_DIR>`             | Clon del repositorio, propiedad del usuario `<APP_USER>`          |
| Archivo de entorno        | `<ENV_FILE_PATH>`       | Fuera de `<APP_DIR>`, permisos `600`                              |
| Imágenes públicas         | `<STORAGE_PUBLIC_DIR>`  | Persistente, fuera de `<APP_DIR>`; servido por Nginx en `/media/` |
| Documentos privados       | `<STORAGE_PRIVATE_DIR>` | Persistente, fuera de `<APP_DIR>`; nunca servido por Nginx        |
| Logs de la aplicación     | `<LOG_DIR>`             | Con rotación (`pm2-logrotate` o `logrotate`)                      |
| Copias locales temporales | `<BACKUP_STAGING_DIR>`  | Antes de enviarse a destino externo                               |

La aplicación se ejecuta con un usuario sin privilegios (`<APP_USER>`), nunca como `root`.

## Servidor Ubuntu

El VPS usa **Ubuntu** (versión exacta pendiente; se recomienda una LTS reciente). Paquetes previstos:

```bash
sudo apt update && sudo apt install -y nginx postgresql certbot python3-certbot-nginx
# Node.js 24 LTS desde NodeSource o nvm (la versión de los repositorios de Ubuntu puede ser antigua)
sudo npm install -g pm2
sudo adduser --system --group --home <APP_HOME> <APP_USER>
```

- `sharp` (procesado de imágenes) incluye binarios precompilados para Ubuntu x64 y arm64; no requiere librerías
  adicionales.
- Firewall con `ufw`: solo 22, 80 y 443 (`ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable`).
- PostgreSQL escuchando solo en `localhost` (configuración por defecto de Ubuntu).
- Acceso SSH con clave, sin contraseña y sin acceso directo de `root`.

### Primer arranque

```bash
sudo -u postgres createuser --pwprompt javis_app          # rol de la aplicación
sudo -u postgres createuser --pwprompt javis_owner        # rol de migraciones
sudo -u postgres createdb --owner javis_owner javis_market
# Conceder a javis_app solo DML sobre las tablas (ver docs/security.md#aislamiento-de-postgresql)

cd <APP_DIR> && npm ci && npm run build
DATABASE_URL=<URL_ROL_MIGRACIONES> npm run db:migrate:deploy
JAVIS_ENV_FILE=<ENV_FILE_PATH> pm2 start infra/pm2/ecosystem.config.cjs && pm2 save && pm2 startup
# Crear la cuenta del dueño (pide la contraseña sin mostrarla)
set -a && . <ENV_FILE_PATH> && set +a && npm run admin:create -- --email <OWNER_EMAIL> --name "<OWNER_NAME>"
```

Si el dueño olvida su contraseña: `npm run admin:reset-password -- --email <OWNER_EMAIL>` en el servidor.

## Procesos (PM2)

Plantilla: [`infra/pm2/ecosystem.config.cjs`](../infra/pm2/ecosystem.config.cjs).

| Proceso        | Comando                                                    | Instancias |
| -------------- | ---------------------------------------------------------- | ---------- |
| `javis-web`    | `next start --hostname 127.0.0.1 --port <APP_PORT>`        | 1          |
| `javis-worker` | `node --import tsx --conditions=react-server src/index.ts` | 1          |

- El archivo de entorno se indica con `JAVIS_ENV_FILE`; la plantilla lo lee y lo pasa a ambos procesos.
- Next.js solo escucha en `127.0.0.1`; el acceso público es exclusivamente vía Nginx.
- Reinicio automático con retardo exponencial; `max_memory_restart` como protección.
- Arranque con el sistema: `pm2 startup` + `pm2 save` (una vez, con el usuario de la aplicación).

## Nginx

Plantillas: [`infra/nginx/`](../infra/nginx/).

- Redirección HTTP → HTTPS y `www` → dominio canónico.
- Terminación TLS (certificados en `<CERT_PATH>`/`<KEY_PATH>`), HSTS y cabeceras de seguridad.
- Proxy a `127.0.0.1:<APP_PORT>`.
- `/media/` sirve **solo** imágenes desde `<STORAGE_PUBLIC_DIR>`, sin listado; cualquier otra extensión → 404.
- Archivos ocultos (`.env`, `.git`) bloqueados. El directorio del repositorio nunca es raíz de Nginx.
- Webhooks con el cuerpo sin modificar; límite de solicitudes en el inicio de sesión del panel.

Verificar siempre con `nginx -t` antes de recargar (`systemctl reload nginx`).

## Procedimiento de despliegue (propuesto)

```bash
cd <APP_DIR>
git fetch && git checkout <TAG_O_COMMIT>
npm ci
npm run build                                   # genera Prisma y compila la web
DATABASE_URL=<URL_ROL_MIGRACIONES> npm run db:migrate:deploy
JAVIS_ENV_FILE=<ENV_FILE_PATH> pm2 reload infra/pm2/ecosystem.config.cjs --update-env
curl -fsS https://<DOMAIN>/api/health
```

- Desplegar etiquetas o commits concretos, no ramas móviles.
- `npm ci` usa exactamente el `package-lock.json`.
- Las migraciones se ejecutan con el rol propietario del esquema; la aplicación usa un rol sin DDL
  ([security.md](security.md#aislamiento-de-postgresql)).
- Copia de seguridad de la base **antes** de aplicar migraciones.
- Una instancia de `javis-web` implica un corte de unos segundos en cada `reload`; aceptable en esta etapa.

## Migraciones

- Se crean en desarrollo (`npm run db:migrate:create -- --name <nombre>` o `db:migrate:dev`) y se versionan en
  `db/prisma/migrations/`.
- En producción solo `npm run db:migrate:deploy`; nunca `migrate dev` ni `db push`.
- Migraciones compatibles hacia atrás cuando sea posible (expandir → desplegar código → contraer), para que el
  código anterior siga funcionando si hay que volver atrás.
- `npm run db:migrate:status` para comprobar el estado.

## Archivos persistentes

- Imágenes y documentos viven fuera del repositorio: un despliegue o un `git clean` no los toca.
- Rutas configuradas por `STORAGE_PUBLIC_DIR` y `STORAGE_PRIVATE_DIR`.
- Permisos: el usuario de la aplicación escribe; Nginx solo lee el directorio público.

## Copias de seguridad externas

| Qué                 | Cómo (propuesta)                   | Frecuencia               | Retención (propuesta)               |
| ------------------- | ---------------------------------- | ------------------------ | ----------------------------------- |
| PostgreSQL          | `pg_dump -Fc` cifrado              | Diaria + antes de migrar | 7 diarias, 4 semanales, 6 mensuales |
| Imágenes públicas   | Sincronización incremental cifrada | Diaria                   | Igual                               |
| Documentos privados | Sincronización incremental cifrada | Diaria                   | Igual                               |
| Archivo de entorno  | Copia cifrada, separada del resto  | En cada cambio           | —                                   |

- Destino **fuera del VPS** (`<BACKUP_DESTINATION>`, pendiente: almacenamiento de objetos u otro servidor).
- Los scripts de copia se añadirán a `scripts/` cuando se conozcan el destino y las credenciales.
- Alertas si una copia falla.

## Restauración

Probar la restauración periódicamente (al menos trimestralmente) en un entorno separado:

1. Detener procesos: `pm2 stop javis-web javis-worker`.
2. Restaurar la base: `pg_restore --clean --if-exists -d <DB_NAME> <BACKUP_FILE>`.
3. Restaurar `<STORAGE_PUBLIC_DIR>` y `<STORAGE_PRIVATE_DIR>`.
4. Desplegar la versión de código correspondiente a la copia (o posterior con migraciones compatibles).
5. `npm run db:migrate:status`, arrancar procesos y comprobar `/api/health`.
6. Revisar pagos ocurridos tras la copia en el panel del proveedor y reconciliar.

## Logs

- Aplicación: JSON por línea en stdout/stderr, recogido por PM2 en `<LOG_DIR>`; rotación con `pm2-logrotate`.
- Nginx: `/var/log/nginx/javis-market.*.log`, rotados por `logrotate`.
- PostgreSQL: logs del servicio.
- Sin datos sensibles en logs ([security.md](security.md#secretos)). Cada petición lleva `requestId`.

## Reinicios y recuperación ante fallos

| Fallo                               | Comportamiento / acción                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| Caída de un proceso                 | PM2 lo reinicia con retardo exponencial                                                          |
| Fuga de memoria                     | `max_memory_restart` reinicia el proceso                                                         |
| Reinicio del VPS                    | `pm2 startup` restaura los procesos guardados                                                    |
| Worker detenido durante un trabajo  | Trabajos idempotentes; se reanudan en el siguiente ciclo                                         |
| Webhooks perdidos durante una caída | El proveedor reintenta; el worker reconcilia intentos `pending`                                  |
| Despliegue defectuoso               | Volver a la etiqueta anterior, `npm ci`, `npm run build`, `pm2 reload` (migraciones compatibles) |
| Base de datos dañada                | Restauración desde copia externa (ver arriba)                                                    |
| Disco lleno                         | Rotación de logs, alertas de espacio (a definir)                                                 |

Monitorización externa de `/api/health` (servicio a definir).
