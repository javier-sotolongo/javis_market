# Javis Market

Tienda online para Estados Unidos (USD) con catálogo, carrito, checkout, pedidos y panel administrativo.
Inventario propio, independiente de Deliflow e Invello.

**Estado:** base técnica inicial. Todavía no hay funcionalidades comerciales implementadas ni plan de desarrollo.

La aplicación es un **monolito modular**: una sola aplicación Next.js que contiene la interfaz y las rutas HTTP,
apoyada en paquetes internos para la lógica de negocio (`api`) y la persistencia (`db`), más un proceso `worker`
para tareas diferidas. Detalles en [docs/architecture.md](docs/architecture.md).

## Requisitos

- Node.js 24 LTS (ver [`.nvmrc`](.nvmrc)) y npm 10 o superior.
- PostgreSQL 16 o superior — solo para migraciones y, más adelante, para ejecutar funcionalidades con datos.
  La compilación y la página inicial **no** necesitan base de datos.

## Instalación

```bash
npm install            # instala todos los workspaces y genera el cliente Prisma (postinstall)
cp .env.example .env   # rellena los valores necesarios para tu entorno local
```

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
| `tests/`   | Espacio reservado para pruebas transversales (integración y e2e)                   |
| `scripts/` | Scripts operativos (vacío por ahora)                                               |

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). En desarrollo se usa un único `.env` en la raíz,
que leen Next.js, Prisma y el worker. En producción el archivo vive fuera del repositorio y lo carga PM2
([docs/deployment.md](docs/deployment.md)).

| Grupo          | Variables                                                            | Necesaria para                |
| -------------- | -------------------------------------------------------------------- | ----------------------------- |
| Aplicación     | `APP_ENV`, `PUBLIC_SITE_URL`, `PORT`                                 | Ejecución                     |
| Base de datos  | `DATABASE_URL`                                                       | Migraciones y acceso a datos  |
| Almacenamiento | `STORAGE_PUBLIC_DIR`, `STORAGE_PRIVATE_DIR`, `PUBLIC_MEDIA_BASE_URL` | Imágenes y documentos         |
| Sesiones       | `AUTH_SECRET`                                                        | Panel administrativo (futuro) |
| Pagos          | `PAYMENT_PROVIDER`, `STRIPE_*`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Checkout (futuro)             |
| Correo         | `EMAIL_PROVIDER`, `SMTP_*`, `EMAIL_FROM`                             | Notificaciones (futuro)       |

Ninguna credencial es necesaria para instalar, compilar, comprobar tipos o pasar el lint.

## Comandos

Todos se ejecutan desde la raíz.

| Comando                                        | Descripción                                                           |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                                  | Next.js en modo desarrollo (http://localhost:3000)                    |
| `npm run dev:worker`                           | Worker en modo desarrollo con recarga                                 |
| `npm run build`                                | Genera el cliente Prisma y compila la aplicación web                  |
| `npm run start`                                | Sirve la compilación de producción de la web                          |
| `npm run start:worker`                         | Ejecuta el worker                                                     |
| `npm run typecheck`                            | Comprobación de tipos de todos los workspaces                         |
| `npm run lint` / `lint:fix`                    | ESLint en todo el repositorio (incluye reglas de dependencias)        |
| `npm run format` / `format:check`              | Prettier                                                              |
| `npm run check`                                | Validación del esquema + lint + tipos + formato                       |
| `npm run db:generate`                          | Genera el cliente Prisma                                              |
| `npm run db:validate`                          | Valida el esquema Prisma                                              |
| `npm run db:format`                            | Formatea el esquema Prisma                                            |
| `npm run db:migrate:create -- --name <nombre>` | Crea una migración sin aplicarla (requiere `DATABASE_URL`)            |
| `npm run db:migrate:dev`                       | Crea y aplica migraciones en desarrollo (requiere `DATABASE_URL`)     |
| `npm run db:migrate:deploy`                    | Aplica migraciones pendientes en producción (requiere `DATABASE_URL`) |
| `npm run db:migrate:status`                    | Estado de las migraciones (requiere `DATABASE_URL`)                   |
| `npm run db:studio`                            | Prisma Studio (requiere `DATABASE_URL`)                               |

Única ruta HTTP existente: `GET /api/health` (comprobación de vida, sin base de datos).

## Documentación

- [Arquitectura](docs/architecture.md)
- [Alcance y decisiones pendientes](docs/scope.md)
- [Módulos](docs/modules.md)
- [Modelo de datos conceptual](docs/data-model.md)
- [Checkout, inventario y pagos](docs/checkout-inventory-payments.md)
- [Convenciones de API](docs/api-conventions.md)
- [Seguridad](docs/security.md)
- [Despliegue](docs/deployment.md)
- [Integraciones](docs/integrations.md)
- [Registro de decisiones](docs/decisions/)
