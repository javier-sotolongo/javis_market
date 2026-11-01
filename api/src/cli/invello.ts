/**
 * Sincronización manual con Invello (el worker la ejecuta cada 10 minutos), seguida de las miniaturas del panel.
 *
 *   npm run invello:sync            incremental (completa si nunca se ha hecho o hace más de un día)
 *   npm run invello:sync -- --full  completa
 */
import { parseArgs } from "node:util";
import { disconnectPrisma } from "@javis-market/db";
import { isDomainError } from "../infrastructure/errors";
import { INVELLO_SYSTEM_ACTOR, syncInvello, warmInvelloPreviews } from "../modules/integrations";

const { values } = parseArgs({ options: { full: { type: "boolean", default: false } } });

try {
  const result = await syncInvello(INVELLO_SYSTEM_ACTOR, { full: values.full });
  console.log(
    result.skipped
      ? "Another sync is running; nothing done."
      : `${result.full ? "Full" : "Incremental"} sync: ${result.products} product(s), ${result.stockUpdates} stock update(s), ${result.linkedStockChanges} store stock change(s), ${result.failed} failure(s).`,
  );
  const previews = await warmInvelloPreviews(INVELLO_SYSTEM_ACTOR);
  if (previews.generated || previews.failed) {
    console.log(`Thumbnails: ${previews.generated} prepared, ${previews.failed} failed.`);
  }
} catch (error) {
  console.error(isDomainError(error) ? error.message : error);
  process.exitCode = 1;
} finally {
  await disconnectPrisma();
}
