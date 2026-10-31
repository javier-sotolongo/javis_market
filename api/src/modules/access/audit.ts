import type { Prisma } from "@javis-market/db";
import { getPrisma } from "@javis-market/db";
import { type Actor, requireAdmin } from "./actor";

type Db = Pick<Prisma.TransactionClient, "auditLog">;

export interface AuditEntry {
  readonly action: string;
  readonly entityType: string;
  readonly entityId?: string | null;
  /** Cambios relevantes. Nunca contraseñas, tokens ni secretos. */
  readonly changes?: Prisma.InputJsonValue;
}

/** Registra una acción en la auditoría. Usar el cliente de la transacción para que sea atómico con el cambio. */
export async function recordAudit(actor: Actor, entry: AuditEntry, db: Db = getPrisma()): Promise<void> {
  await db.auditLog.create({
    data: {
      actorType: actor.type === "admin" ? "ADMIN" : "SYSTEM",
      actorId: actor.type === "admin" ? actor.userId : actor.type === "system" ? actor.name : null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      ...(entry.changes === undefined ? {} : { changes: entry.changes }),
      ipAddress: actor.type === "admin" ? (actor.ipAddress ?? null) : null,
      userAgent: actor.type === "admin" ? (actor.userAgent?.slice(0, 500) ?? null) : null,
    },
  });
}

export async function listRecentAudit(actor: Actor, limit = 50) {
  requireAdmin(actor);
  return getPrisma().auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
