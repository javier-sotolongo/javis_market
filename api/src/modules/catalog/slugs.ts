import { DomainError } from "../../infrastructure/errors";
import { slugify } from "../../infrastructure/slug";

/**
 * Devuelve un slug libre: el indicado, o el derivado del nombre con sufijo numérico si ya existe.
 * Un slug indicado explícitamente que ya está en uso es un error (no se renombra en silencio).
 */
export async function resolveSlug(
  requested: string | undefined,
  name: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (requested) {
    if (await isTaken(requested)) {
      throw new DomainError("conflict", "This URL slug is already in use.", [
        { path: "slug", message: "Already in use." },
      ]);
    }
    return requested;
  }
  const base = slugify(name) || "item";
  for (let suffix = 1; suffix < 1000; suffix++) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new DomainError("conflict", "Could not generate a unique URL slug.");
}
