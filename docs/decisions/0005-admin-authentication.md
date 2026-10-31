# 0005 — Autenticación del panel con Better Auth

- **Estado:** Aceptada
- **Fecha:** 2026-10-30

## Contexto

`docs/security.md` exige una solución de autenticación mantenida, con sesiones en PostgreSQL vía Prisma, hash de
contraseñas robusto y revocación de sesiones. En v1 solo se autentican administradores; los compradores compran como
invitados.

## Decisión

[Better Auth](https://www.better-auth.com/) 1.7 con el adaptador de Prisma, configurado en
`api/src/modules/access/auth.ts`:

- Email y contraseña (mínimo 12 caracteres, hash scrypt de Better Auth). **Registro público desactivado.**
- Los administradores se crean y se les restablece la contraseña desde la línea de comandos del servidor
  (`npm run admin:create`, `npm run admin:reset-password`); el restablecimiento revoca todas sus sesiones.
- Sesiones en base de datos (`admin_sessions`), cookie `HttpOnly` con prefijo `javis`, `Secure` en producción,
  caducidad de 7 días renovada a diario.
- Límite de 5 intentos por minuto en el inicio de sesión (contadores en memoria: una sola instancia web).
- Comprobación de origen (`trustedOrigins` = `PUBLIC_SITE_URL`) en las peticiones de Better Auth.
- El resto de la aplicación no depende de Better Auth: `getAdminActor(headers)` devuelve un `Actor` y los servicios
  comprueban `requireAdmin(actor)`.

## Consecuencias

- Rutas `/api/auth/*` gestionadas por Better Auth (convenciones propias, fuera de `/api/v1`).
- Sin recuperación de contraseña por correo hasta que exista proveedor SMTP; mientras tanto, CLI en el servidor.
- MFA disponible como plugin de Better Auth; pendiente de decidir si se activa.
- Si se escalan instancias web, mover los contadores de límite a la base de datos.
