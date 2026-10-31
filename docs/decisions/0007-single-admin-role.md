# 0007 — Un único rol administrativo en v1

- **Estado:** Aceptada
- **Fecha:** 2026-10-30

## Contexto

Por ahora solo el dueño de la tienda usará el panel.

## Decisión

Un único rol, `admin`, con todos los permisos. Todo usuario de `admin_users` es administrador. Los servicios siguen
recibiendo el actor y comprobando la autorización por operación (`requireAdmin`), y toda acción queda auditada.

## Consecuencias

- No hay tablas de roles ni de permisos todavía; la lista `recurso:acción` de `docs/modules.md` queda como diseño
  para cuando haya más perfiles.
- Añadir roles implicará sustituir `requireAdmin` por comprobaciones de permiso concretas en los mismos puntos.
