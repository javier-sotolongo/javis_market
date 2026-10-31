import type { JobDefinition } from "./types";

/**
 * Registro de trabajos del worker. Vacío por ahora: ningún trabajo comercial está implementado.
 * Trabajos previstos (ver docs/architecture.md): liberar reservas vencidas, enviar correos
 * pendientes y reprocesar eventos de pago.
 */
export const jobs: readonly JobDefinition[] = [];
