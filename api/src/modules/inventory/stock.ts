import { z } from "zod";
import { getPrisma, type Prisma, type StockMovementReason } from "@javis-market/db";
import { DomainError, notFound } from "../../infrastructure/errors";
import { normalizePage, toPage } from "../../infrastructure/pagination";
import { parseInput } from "../../infrastructure/validation";
import { type Actor, recordAudit, requireAdmin, requireAdminOrSystem } from "../access";

type Tx = Prisma.TransactionClient;

/** Crea el registro de existencias (a cero) de una variante nueva. Lo llama `catalog` dentro de su transacción. */
export async function initializeStock(tx: Tx, variantId: string): Promise<void> {
  await tx.stockLevel.create({ data: { variantId } });
}

const adjustSchema = z.object({
  variantId: z.uuid(),
  mode: z.enum(["add", "remove", "set"]),
  quantity: z.coerce.number().int("Enter a whole number.").min(0).max(1_000_000),
  note: z.string().trim().max(500).default(""),
});

export type AdjustStockInput = z.input<typeof adjustSchema>;

const REASON_BY_MODE: Record<"add" | "remove" | "set", StockMovementReason> = {
  add: "RECEIPT",
  remove: "ADJUSTMENT",
  set: "COUNT",
};

/**
 * Cambia las existencias físicas de una variante (entrada, salida manual o recuento).
 * Atómico: la condición `onHand ≥ reserved` se comprueba en la propia sentencia UPDATE, de modo que nunca se deja
 * menos stock físico que el reservado. Registra movimiento y auditoría en la misma transacción.
 */
export async function adjustStock(actor: Actor, input: AdjustStockInput, db?: Tx) {
  requireAdmin(actor);
  const data = parseInput(adjustSchema, input);
  if (data.mode !== "set" && data.quantity === 0) {
    throw new DomainError("validation_failed", "Quantity must be greater than zero.", [
      { path: "quantity", message: "Must be greater than zero." },
    ]);
  }

  const run = async (tx: Tx) => {
    let rows: { onHand: number; previous: number }[];
    if (data.mode === "set") {
      rows = await tx.$queryRaw`
        WITH prev AS (SELECT "onHand" FROM "stock_levels" WHERE "variantId" = ${data.variantId}::uuid FOR UPDATE)
        UPDATE "stock_levels" AS s SET "onHand" = ${data.quantity}::int, "updatedAt" = now()
          FROM prev
         WHERE s."variantId" = ${data.variantId}::uuid AND ${data.quantity}::int >= s."reserved"
        RETURNING s."onHand" AS "onHand", prev."onHand" AS "previous"`;
    } else {
      const delta = data.mode === "add" ? data.quantity : -data.quantity;
      rows = await tx.$queryRaw`
        UPDATE "stock_levels" SET "onHand" = "onHand" + ${delta}::int, "updatedAt" = now()
         WHERE "variantId" = ${data.variantId}::uuid AND "onHand" + ${delta}::int >= "reserved"
        RETURNING "onHand" AS "onHand", ("onHand" - ${delta}::int)::int AS "previous"`;
    }

    const row = rows[0];
    if (!row) {
      const level = await tx.stockLevel.findUnique({ where: { variantId: data.variantId } });
      if (!level) throw notFound("Variant");
      throw new DomainError(
        "insufficient_stock",
        `Stock cannot go below the ${level.reserved} unit(s) currently reserved (on hand: ${level.onHand}).`,
      );
    }

    const delta = row.onHand - row.previous;
    if (delta !== 0) {
      await tx.stockMovement.create({
        data: {
          variantId: data.variantId,
          quantity: delta,
          onHandAfter: row.onHand,
          reason: REASON_BY_MODE[data.mode],
          actorType: "ADMIN",
          actorId: actor.userId,
          note: data.note,
        },
      });
      await recordAudit(
        actor,
        {
          action: "inventory.adjust",
          entityType: "variant",
          entityId: data.variantId,
          changes: {
            mode: data.mode,
            quantity: data.quantity,
            onHandBefore: row.previous,
            onHandAfter: row.onHand,
            note: data.note,
          },
        },
        tx,
      );
    }
    return { onHand: row.onHand, delta };
  };

  return db ? run(db) : getPrisma().$transaction(run);
}

/**
 * Fija las existencias físicas de una variante con las que informa el proveedor (sincronización con Invello,
 * ADR 0008). Nunca baja de lo reservado: esas unidades ya están comprometidas con compradores. Registra un
 * movimiento `SUPPLIER_SYNC` solo si la cantidad cambia; no se audita cada sincronización (el movimiento basta).
 */
export async function setSupplierStock(actor: Actor, variantId: string, quantity: number, db?: Tx) {
  requireAdminOrSystem(actor);
  const target = Math.max(0, Math.trunc(quantity));
  const run = async (tx: Tx) => {
    const rows = await tx.$queryRaw<{ onHand: number; previous: number }[]>`
      WITH prev AS (SELECT "onHand" FROM "stock_levels" WHERE "variantId" = ${variantId}::uuid FOR UPDATE)
      UPDATE "stock_levels" AS s SET "onHand" = GREATEST(${target}::int, s."reserved"), "updatedAt" = now()
        FROM prev
       WHERE s."variantId" = ${variantId}::uuid AND s."onHand" <> GREATEST(${target}::int, s."reserved")
      RETURNING s."onHand" AS "onHand", prev."onHand" AS "previous"`;
    const row = rows[0];
    if (!row) return { delta: 0 };
    await tx.stockMovement.create({
      data: {
        variantId,
        quantity: row.onHand - row.previous,
        onHandAfter: row.onHand,
        reason: "SUPPLIER_SYNC",
        actorType: actor.type === "admin" ? "ADMIN" : "SYSTEM",
        actorId: actor.type === "admin" ? actor.userId : actor.name,
        note: "Synced from Invello",
      },
    });
    return { delta: row.onHand - row.previous };
  };
  return db ? run(db) : getPrisma().$transaction(run);
}

/** Unidades disponibles por variante: físico − reservado. Variantes sin registro cuentan como 0. */
export async function getAvailability(
  variantIds: readonly string[],
  db: Pick<Tx, "stockLevel"> = getPrisma(),
): Promise<Map<string, number>> {
  const levels = await db.stockLevel.findMany({ where: { variantId: { in: [...variantIds] } } });
  const result = new Map(variantIds.map((id) => [id, 0]));
  for (const level of levels) {
    result.set(level.variantId, Math.max(0, level.onHand - level.reserved));
  }
  return result;
}

const PAGE_SIZE = 50;

export async function listStock(
  actor: Actor,
  options: { query?: string; page?: unknown; lowStockOnly?: boolean } = {},
) {
  requireAdmin(actor);
  const { page, skip, take } = normalizePage(options.page, PAGE_SIZE);
  const query = options.query?.trim();
  const where: Prisma.VariantWhereInput = {
    archivedAt: null,
    product: { status: { not: "ARCHIVED" } },
    ...(query
      ? {
          OR: [
            { sku: { contains: query, mode: "insensitive" } },
            { product: { name: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(options.lowStockOnly ? { stockLevel: { onHand: { lte: 5 } } } : {}),
  };
  const prisma = getPrisma();
  const [variants, total] = await Promise.all([
    prisma.variant.findMany({
      where,
      include: { product: { select: { id: true, name: true, status: true } }, stockLevel: true },
      orderBy: [{ product: { name: "asc" } }, { position: "asc" }],
      skip,
      take,
    }),
    prisma.variant.count({ where }),
  ]);
  const items = variants.map((variant) => {
    const onHand = variant.stockLevel?.onHand ?? 0;
    const reserved = variant.stockLevel?.reserved ?? 0;
    return {
      variantId: variant.id,
      sku: variant.sku,
      variantTitle: variant.title,
      productId: variant.product.id,
      productName: variant.product.name,
      productStatus: variant.product.status,
      onHand,
      reserved,
      available: Math.max(0, onHand - reserved),
    };
  });
  return toPage(items, page, PAGE_SIZE, total);
}

export async function listStockMovements(actor: Actor, variantId: string, limit = 50) {
  requireAdmin(actor);
  return getPrisma().stockMovement.findMany({ where: { variantId }, orderBy: { createdAt: "desc" }, take: limit });
}

export async function getVariantStock(actor: Actor, variantId: string) {
  requireAdmin(actor);
  const variant = await getPrisma().variant.findUnique({
    where: { id: variantId },
    include: { product: { select: { id: true, name: true } }, stockLevel: true },
  });
  if (!variant) throw notFound("Variant");
  const onHand = variant.stockLevel?.onHand ?? 0;
  const reserved = variant.stockLevel?.reserved ?? 0;
  return {
    variantId: variant.id,
    sku: variant.sku,
    variantTitle: variant.title,
    archived: variant.archivedAt !== null,
    productId: variant.product.id,
    productName: variant.product.name,
    onHand,
    reserved,
    available: Math.max(0, onHand - reserved),
  };
}
