# 0001 — Monolito modular

- **Estado:** Aceptada
- **Fecha:** 2026-10-30

## Contexto

Tienda online nueva con equipo reducido, un único VPS del cliente y requisitos todavía abiertos (pagos, envíos,
impuestos, integraciones). Se necesita consistencia transaccional fuerte entre inventario, pedidos y pagos.

## Decisión

Una única aplicación Next.js (App Router) que contiene interfaz y rutas HTTP, con la lógica de negocio en un paquete
interno modular (`api`), persistencia en PostgreSQL vía Prisma (`db`) y un proceso `worker` para tareas diferidas
que reutiliza `api`.

Se descartan en esta etapa: microservicios, un segundo servidor HTTP para la API, Docker, Kubernetes, Redis y colas
externas. Las colas y bloqueos se resuelven con PostgreSQL.

## Consecuencias

- Transacciones locales para las operaciones críticas (reservas, confirmación de pago), sin coordinación distribuida.
- Un solo despliegue y un solo runtime que operar.
- Los límites entre módulos dependen de disciplina y de reglas de lint; se documentan en `docs/modules.md`.
- Si un módulo necesitara escalar por separado, los límites claros permiten extraerlo más adelante.
