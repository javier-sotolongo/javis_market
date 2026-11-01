import { INVELLO_SYSTEM_ACTOR, isInvelloConfigured, syncInvello, warmInvelloPreviews } from "@javis-market/api";
import type { JobDefinition } from "./types";

/**
 * Sincroniza el catálogo, los precios y las existencias de Invello (ADR 0008). Cada ejecución es incremental;
 * una vez al día hace una sincronización completa. Después prepara las miniaturas que falten para el panel. Sin `INVELLO_API_KEY` no hace nada.
 */
export const invelloSyncJob: JobDefinition = {
  name: "invello-sync",
  intervalMs: 10 * 60_000,
  async run(signal) {
    if (!isInvelloConfigured()) return;
    await syncInvello(INVELLO_SYSTEM_ACTOR, { signal });
    if (!signal.aborted) await warmInvelloPreviews(INVELLO_SYSTEM_ACTOR, { signal });
  },
};
