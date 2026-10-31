# 0003 — Inventario independiente

- **Estado:** Aceptada
- **Fecha:** 2026-10-30

## Contexto

Javis Market vende productos de Deliflow y de otros proveedores. Existen otros sistemas (Deliflow, Invello) con sus
propios datos, pero el alcance de cualquier integración no está definido.

## Decisión

Javis Market mantiene **su propio inventario y sus propios precios de venta** en su base de datos. Es la fuente de
verdad de existencias, reservas y movimientos de la tienda. La primera versión no depende de Invello ni de Deliflow
en tiempo de ejecución: no hay importaciones, sincronizaciones, API keys ni acceso a sus bases de datos.

## Consecuencias

- La tienda funciona aunque los sistemas externos no estén disponibles.
- La carga de productos y existencias es manual desde el panel hasta que se defina otra vía.
- Una integración futura se añadirá en el módulo `integrations` mediante referencias externas, sin cambiar quién es
  el propietario de cada dato salvo que se decida explícitamente en un nuevo ADR.
