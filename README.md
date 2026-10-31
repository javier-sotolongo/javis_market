# Javis Market

Tienda online para Estados Unidos (USD) con catálogo, carrito, checkout, pedidos y panel administrativo.
Inventario propio, independiente de Deliflow e Invello.

**Estado:** en desarrollo, con diseño temporal hasta tener logo e identidad visual. Ya funcionan:

- **Panel administrativo** (`/admin`): login del dueño, productos con variantes/SKU y precios, fotos (subida desde el
  formulario o importación desde una URL, siempre guardadas en el VPS), categorías, inventario con movimientos y
  registro de actividad.
- **Tienda** (en inglés): portada, listado, búsqueda, categorías, ficha de producto y carrito de invitado.
- **Pendiente:** checkout, pagos, pedidos y correo. Ver [docs/development-plan.md](docs/development-plan.md).

La aplicación es un **monolito modular**: una sola aplicación Next.js que contiene la interfaz y las rutas HTTP,
apoyada en paquetes internos para la lógica de negocio (`api`) y la persistencia (`db`), más un proceso `worker`
para tareas diferidas. Detalles en [docs/architecture.md](docs/architecture.md).

## Requisitos

- Node.js 24 LTS (ver [`.nvmrc`](.nvmrc)) y npm 10 o superior.
- PostgreSQL 16 o superior para ejecutar la aplicación y las pruebas de integración/e2e.
  Instalar, compilar, comprobar tipos y pasar el lint **no** necesitan base de datos ni credenciales.

## Instalación y desarrollo local

```bash
npm install                     # instala todos los workspaces y genera el cliente Prisma (postinstall)
cp .env.example .env            # descomenta las URL del PostgreSQL local y pon AUTH_SECRET (openssl rand -base64 48)
npm run dev:all                 # PostgreSQL local + migraciones + web (http://localhost:3000) + worker. Ctrl+C para parar
```

La primera vez, con la base de datos ya en marcha, crea la cuenta del dueño o carga datos de prueba:

```bash
npm run admin:create -- --email you@example.com --name "Owner"     # pide la contraseña (mín. 12 caracteres)
ADMIN_PASSWORD=... npm run db:seed -- --email owner@example.com    # opcional: catálogo de ejemplo
```

- `npm run dev:all` usa un PostgreSQL propio del proyecto ([scripts/dev-db.sh](scripts/dev-db.sh)): no necesita sudo
  ni toca el PostgreSQL del sistema. Datos en `~/.local/share/javis-market/postgres`, puerto 5433. Se detiene con
  `npm run db:local:stop`.
- En desarrollo las imágenes se guardan en `./storage/` (ignorado por git).

## Estructura

| Carpeta    | Contenido                                                                          |
| ---------- | ---------------------------------------------------------------------------------- |
| `web/`     | Aplicación Next.js (App Router): páginas, componentes y rutas HTTP delgadas        |
| `api/`     | Paquete interno de negocio: módulos, permisos, validaciones y adaptadores externos |
| `db/`      | Esquema Prisma, migraciones y cliente PostgreSQL                                   |
| `worker/`  | Proceso independiente para tareas diferidas (PM2)                                  |
| `shared/`  | Contratos y utilidades compartidas, seguras para el navegador                      |
| `docs/`    | Arquitectura, alcance, reglas y decisiones                                         |
| `infra/`   | Plantillas de PM2, Nginx y entorno                                                 |
| `tests/`   | Pruebas de integración (PostgreSQL real) y e2e (Playwright)                        |
| `scripts/` | Scripts operativos (vacío por ahora)                                               |

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). En desarrollo se usa un único `.env` en la raíz,
que leen Next.js, Prisma y el worker. En producción el archivo vive fuera del repositorio y lo carga PM2
([docs/deployment.md](docs/deployment.md)).

| Grupo          | Variables                                                                                          | Necesaria para          |
| -------------- | -------------------------------------------------------------------------------------------------- | ----------------------- |
| Aplicación     | `APP_ENV`, `PUBLIC_SITE_URL`, `PORT`                                                               | Ejecución               |
| Base de datos  | `DATABASE_URL`, `DATABASE_POOL_MAX`                                                                | Ejecución y migraciones |
| Pruebas        | `TEST_DATABASE_URL`, `E2E_DATABASE_URL` (nombre con "test")                                        | Integración y e2e       |
| Almacenamiento | `STORAGE_PUBLIC_DIR`, `STORAGE_PRIVATE_DIR`, `PUBLIC_MEDIA_BASE_URL`, `IMAGE_IMPORT_ALLOWED_HOSTS` | Imágenes y documentos   |
| Sesiones       | `AUTH_SECRET`                                                                                      | Panel administrativo    |
| Pagos          | `PAYMENT_PROVIDER`, `STRIPE_*`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`                               | Checkout (futuro)       |
| Correo         | `EMAIL_PROVIDER`, `SMTP_*`, `EMAIL_FROM`                                                           | Notificaciones (futuro) |

Ninguna credencial es necesaria para instalar, compilar, comprobar tipos o pasar el lint.

## Comandos

Todos se ejecutan desde la raíz.

| Comando                                             | Descripción                                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev:all`                                   | Todo el entorno de desarrollo: base de datos local, migraciones, web y worker       |
| `npm run dev`                                       | Next.js en modo desarrollo (http://localhost:3000)                                  |
| `npm run dev:worker`                                | Worker en modo desarrollo con recarga                                               |
| `npm run build`                                     | Genera el cliente Prisma y compila la aplicación web                                |
| `npm run start`                                     | Sirve la compilación de producción de la web                                        |
| `npm run start:worker`                              | Ejecuta el worker                                                                   |
| `npm run typecheck`                                 | Comprobación de tipos de todos los workspaces                                       |
| `npm run lint` / `lint:fix`                         | ESLint en todo el repositorio (incluye reglas de dependencias)                      |
| `npm run format` / `format:check`                   | Prettier                                                                            |
| `npm run check`                                     | Validación del esquema + lint + tipos + formato + pruebas unitarias                 |
| `npm test`                                          | Pruebas unitarias (Vitest)                                                          |
| `npm run test:integration`                          | Pruebas de integración contra `TEST_DATABASE_URL`                                   |
| `npm run test:e2e`                                  | Pruebas e2e (Playwright) contra la compilación; ejecutar antes `npm run build`      |
| `npm run admin:create -- --email <e> --name <n>`    | Crea una cuenta de administrador (pide la contraseña)                               |
| `npm run admin:reset-password -- --email <e>`       | Cambia la contraseña y cierra todas las sesiones de ese administrador               |
| `npm run db:local:start` / `db:local:stop`          | Arranca o detiene el PostgreSQL local de desarrollo                                 |
| `npm run db:generate`                               | Genera el cliente Prisma                                                            |
| `npm run db:validate`                               | Valida el esquema Prisma                                                            |
| `npm run db:format`                                 | Formatea el esquema Prisma                                                          |
| `npm run db:migrate:create -- --name <nombre>`      | Crea una migración sin aplicarla (requiere `DATABASE_URL`)                          |
| `npm run db:migrate:dev`                            | Crea y aplica migraciones en desarrollo (requiere `DATABASE_URL`)                   |
| `npm run db:migrate:deploy`                         | Aplica migraciones pendientes en producción (requiere `DATABASE_URL`)               |
| `npm run db:migrate:status`                         | Estado de las migraciones (requiere `DATABASE_URL`)                                 |
| `npm run db:studio`                                 | Prisma Studio (requiere `DATABASE_URL`)                                             |
| `ADMIN_PASSWORD=... npm run db:seed -- --email <e>` | Solo desarrollo: carga categorías, productos, stock y fotos de ejemplo (base vacía) |

Rutas HTTP existentes (no hay todavía API `/api/v1`):

- `GET /api/health`: comprobación de vida, sin base de datos.
- `/api/auth/*`: inicio y cierre de sesión del panel (Better Auth).
- `GET /media/*`: imágenes públicas (en producción las sirve Nginx).

Las páginas del panel y de la tienda usan Server Actions que delegan en los servicios de `api`.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Alcance y decisiones pendientes](docs/scope.md)
- [Plan de desarrollo](docs/development-plan.md)
- [Módulos](docs/modules.md)
- [Modelo de datos conceptual](docs/data-model.md)
- [Checkout, inventario y pagos](docs/checkout-inventory-payments.md)
- [Convenciones de API](docs/api-conventions.md)
- [Seguridad](docs/security.md)
- [Despliegue](docs/deployment.md)
- [Integraciones](docs/integrations.md)
- [Registro de decisiones](docs/decisions/)
