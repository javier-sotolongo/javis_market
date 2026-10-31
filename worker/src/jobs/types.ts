/** Definición de un trabajo diferido. Los trabajos concretos se añadirán con sus módulos. */
export interface JobDefinition {
  /** Nombre estable y único, usado en logs y en la cola persistente. */
  readonly name: string;
  /** Intervalo de ejecución para trabajos periódicos (p. ej. liberar reservas vencidas). */
  readonly intervalMs: number;
  /** Debe ser idempotente: puede ejecutarse de nuevo tras un fallo o reinicio. */
  run(signal: AbortSignal): Promise<void>;
}
