import type { z } from "zod";
import { DomainError } from "./errors";

/** Valida `input` con `schema`; si falla, lanza un `DomainError` con un detalle por campo. */
export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new DomainError(
    "validation_failed",
    "Please review the highlighted fields.",
    result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
  );
}
