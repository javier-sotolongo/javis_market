# 0002 — Organización del repositorio

- **Estado:** Aceptada
- **Fecha:** 2026-10-30

## Contexto

Se quiere separar con claridad interfaz, negocio, persistencia y procesos en segundo plano, e impedir que código de
servidor o Prisma lleguen al navegador, sin añadir herramientas de monorepo complejas.

## Decisión

npm workspaces con los paquetes `web`, `api`, `db`, `worker` y `shared`, más `docs`, `infra`, `tests` y `scripts`.

- Dirección de dependencias: `web → api, shared`; `worker → api`; `api → db, shared`.
- Paquetes internos publicados como TypeScript (`exports: ./src/index.ts`), compilados por Next.js
  (`transpilePackages`) y ejecutados en el worker con `tsx`.
- `api` y `db` importan `server-only`; ESLint (`no-restricted-imports`) hace cumplir la dirección de dependencias.
- Configuración única de TypeScript (`tsconfig.base.json`), ESLint y Prettier en la raíz; un `.env` único en
  desarrollo.

## Consecuencias

- Sin paso de compilación por paquete ni herramientas adicionales (Turborepo, Nx).
- El worker depende de `tsx` en producción. Si se prefiere JavaScript compilado, se puede añadir un paso de
  empaquetado más adelante sin cambiar la estructura.
- El worker se ejecuta con la condición `react-server` para poder importar paquetes marcados con `server-only`.
