import { Prisma } from "@javis-market/db";

/** ¿Es una violación de unicidad de Prisma (P2002), opcionalmente sobre un campo concreto? */
export function isUniqueViolation(error: unknown, field?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
  if (!field) return true;
  return JSON.stringify(error.meta ?? {}).includes(field);
}
