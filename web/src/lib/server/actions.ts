import "server-only";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { createLogger, isDomainError } from "@javis-market/api";
import type { ActionState } from "../action-state";

const logger = createLogger("web.actions");

/**
 * Ejecuta la lógica de una Server Action y traduce el resultado a `ActionState`:
 * errores de dominio ⇒ mensaje y errores por campo; errores inesperados ⇒ mensaje genérico y log.
 * Las redirecciones y `notFound()` de Next.js se propagan.
 */
export async function runAction(
  work: () => Promise<string | void>,
  options: { revalidate?: string } = {},
): Promise<ActionState> {
  try {
    const message = await work();
    revalidatePath(options.revalidate ?? "/", "layout");
    return { status: "success", at: Date.now(), ...(message ? { message } : {}) };
  } catch (error) {
    unstable_rethrow(error);
    if (isDomainError(error)) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: Object.fromEntries(error.details.map((issue) => [issue.path, issue.message])),
        at: Date.now(),
      };
    }
    logger.error("unexpected action error", {
      error: error instanceof Error ? (error.stack ?? error.message) : String(error),
    });
    return { status: "error", message: "Something went wrong. Please try again.", fieldErrors: {}, at: Date.now() };
  }
}

export function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function formTexts(formData: FormData, name: string): string[] {
  return formData.getAll(name).filter((value): value is string => typeof value === "string" && value !== "");
}

export async function formFiles(formData: FormData, name: string): Promise<{ name: string; bytes: Uint8Array }[]> {
  const files = formData.getAll(name).filter((value): value is File => value instanceof File && value.size > 0);
  return Promise.all(files.map(async (file) => ({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) })));
}
