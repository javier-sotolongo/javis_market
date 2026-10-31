# Seguridad

## Autenticación y sesiones administrativas

- Solo el panel administrativo requiere autenticación en v1 (los compradores compran como invitados).
- Se utilizará una **solución de autenticación mantenida**, no un sistema propio de contraseñas y sesiones. La
  solución elegida es **Better Auth** ([ADR 0005](decisions/0005-admin-authentication.md)).
  Criterios: mantenimiento activo, compatibilidad con Next.js App Router, sesiones en PostgreSQL vía Prisma,
  hash de contraseñas robusto (Argon2id o bcrypt), soporte de MFA y revocación de sesiones.
- Requisitos de sesión independientes de la librería:
  - Cookie `HttpOnly`, `Secure`, `SameSite=Lax` (o `Strict` para el panel), con prefijo `__Host-`.
  - Sesiones almacenadas en servidor y revocables; caducidad por inactividad y absoluta.
  - Rotación del identificador de sesión al iniciar sesión y al cambiar privilegios.
  - Cierre de sesión que invalida la sesión en servidor.
  - MFA recomendado (plugin de Better Auth disponible; pendiente de activar).
- Sin registro público. En v1 los administradores se crean y restablecen desde la línea de comandos del servidor
  (`npm run admin:create`, `npm run admin:reset-password`); el restablecimiento revoca todas las sesiones.
- Límite de 5 intentos de inicio de sesión por minuto y mensaje genérico ("Invalid email or password").

## Autorización por operación

- Cada servicio de `api` recibe un contexto de actor (`admin` con permisos, `guest` con su token, o `system`) y
  comprueba el permiso de **esa operación** ([modules.md](modules.md#permisos)). No basta con que la página o la
  ruta estén protegidas.
- Denegación por defecto: un servicio sin comprobación explícita no debe exponerse.
- Las páginas de `/admin` verifican la sesión en el servidor; ocultar elementos de la interfaz no es un control.

## Secretos

- Los secretos solo existen en variables de entorno del servidor. Solo se versiona `.env.example` con marcadores.
- En producción, el archivo de entorno vive fuera del repositorio, con permisos `600` y propietario el usuario
  de la aplicación ([deployment.md](deployment.md)).
- Solo las variables con prefijo `NEXT_PUBLIC_` llegan al navegador; ningún secreto puede usar ese prefijo.
- `shared` nunca contiene secretos; `api` y `db` importan `server-only` para impedir su inclusión en el bundle del
  navegador.
- Los logs no registran secretos, contraseñas, tokens de sesión, tokens de pedido ni datos de tarjeta. Los datos
  de tarjeta nunca pasan por nuestro servidor (los gestiona la pasarela).
- Rotación de secretos documentada; un secreto filtrado se revoca en el proveedor, no solo se cambia en el archivo.

## Validación de entradas

- Validación con esquemas en el borde HTTP y revalidación de invariantes en el servicio
  ([api-conventions.md](api-conventions.md#validación)).
- Prisma con consultas parametrizadas; SQL crudo solo con parámetros (`$queryRaw` con plantilla), nunca
  concatenando texto.
- Contenido editable y descripciones: se renderiza escapado. Si se admite formato enriquecido, se sanea con una
  lista blanca en el servidor.
- Cabeceras de seguridad: CSP (a definir con la pasarela de pago), HSTS, `X-Content-Type-Options`,
  `Referrer-Policy`, `frame-ancestors 'none'` (plantilla de Nginx + Next.js).

## Límites de solicitudes

- Nginx: límite básico por IP en rutas sensibles (plantilla en `infra/nginx`).
- Aplicación: límites por IP y por identidad en inicio de sesión, recuperación de contraseña, creación de
  checkout, consulta de pedidos de invitado y reenvío de enlaces. Almacenamiento de contadores en PostgreSQL
  (sin Redis en esta etapa).
- Bloqueo progresivo de inicio de sesión tras intentos fallidos, sin revelar si la cuenta existe.

## Protección de formularios

- Las acciones que cambian estado y se autentican por cookie requieren protección CSRF: Server Actions de Next.js
  (comprueban el origen) o, en rutas `/api/v1`, verificación de `Origin`/`Host` más token CSRF.
- `SameSite` en cookies como defensa adicional, no única.
- Formularios públicos (checkout, contacto): límites de solicitudes y, si hay abuso, un CAPTCHA a decidir.
- Webhooks exentos de CSRF pero con verificación obligatoria de firma y cuerpo crudo.

## Carga de imágenes

- Solo administradores (en v1, rol único `admin`).
- Detalle de la implementación: [ADR 0006](decisions/0006-product-images.md).
- **Importación por URL** (descarga desde otro almacenamiento): solo `http/https` en puertos 80/443, sin
  credenciales, sin direcciones privadas/loopback/link-local/metadatos (comprobado al conectar y en cada
  redirección), 15 s de tiempo límite, 10 MB máximo. `IMAGE_IMPORT_ALLOWED_HOSTS` restringe los dominios.
- Límite de tamaño (aplicación y `client_max_body_size` en Nginx).
- Validación del tipo real por contenido (_magic bytes_), no por extensión ni por `Content-Type` del cliente.
  Formatos permitidos: JPEG, PNG, WebP, AVIF. SVG no permitido.
- Reprocesado/reencode en servidor que elimina metadatos (EXIF, ubicación).
- Nombre de archivo generado por el servidor; el nombre original nunca se usa como ruta.
- Almacenamiento:
  - **Público** (`STORAGE_PUBLIC_DIR`): solo imágenes de catálogo. Nginx sirve únicamente extensiones de imagen,
    sin listado de directorios ni ejecución.
  - **Privado** (`STORAGE_PRIVATE_DIR`): documentos (facturas de proveedor, justificantes). Nginx no lo expone;
    la aplicación lo entrega tras comprobar permisos.
- Ambos directorios fuera del repositorio y del directorio de compilación, propiedad del usuario de la aplicación.

## Auditoría

- Toda acción administrativa que modifica datos registra un `AuditLog`: actor, acción, entidad, cambios
  relevantes, IP, agente de usuario y fecha ([data-model.md](data-model.md#administración-y-auditoría)).
- Obligatorio para: ajustes de inventario, reingresos, cambios de precio, cambios de estado de pedidos,
  reembolsos, gestión de usuarios y permisos, inicios de sesión fallidos y exitosos.
- El registro es de solo inserción para la aplicación; no hay operación de edición o borrado.

## Aislamiento de PostgreSQL

- PostgreSQL escucha solo en `localhost` (o socket Unix); el puerto no se abre en el firewall.
- Base de datos dedicada a Javis Market, independiente de cualquier base de Deliflow o Invello.
- Roles separados:
  - **Propietario/migraciones**: crea y modifica el esquema; solo se usa al ejecutar `migrate deploy`.
  - **Aplicación**: `SELECT/INSERT/UPDATE/DELETE` sobre las tablas de la aplicación; sin `DDL` ni superusuario.
  - (Opcional) **Solo lectura** para consultas e informes.
- Conexión con contraseña robusta (`scram-sha-256`); `pg_hba.conf` restringido al usuario y base concretos.
- Copias de seguridad cifradas y almacenadas fuera del VPS ([deployment.md](deployment.md)).

## Dependencias

- Versiones fijadas con `package-lock.json`; `npm audit` en cada actualización.
- Revisión periódica de actualizaciones de seguridad de Next.js, Prisma y la librería de autenticación.
