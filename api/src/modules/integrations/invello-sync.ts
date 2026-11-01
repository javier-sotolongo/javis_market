import { getPrisma } from "@javis-market/db";
import {
  type InvelloClient,
  type InvelloProductDto,
  InvelloApiError,
  getInvelloClient,
} from "../../adapters/invello/invello-client";
import { DomainError } from "../../infrastructure/errors";
import { createLogger } from "../../infrastructure/logger";
import { type Actor, requireAdminOrSystem } from "../access";
import { setSupplierStock } from "../inventory";

/**
 * Sincronización del catálogo de Invello (ADR 0008), según la estrategia recomendada por su documentación:
 * completa una vez al día, incremental (`updated_since`) el resto de veces, y existencias en cada ejecución.
 * Es idempotente: copia el estado del proveedor y vuelve a aplicar las existencias de los productos vinculados.
 */

const logger = createLogger("integrations.invello");

const STATE_ID = "invello";
const LOCK_MS = 15 * 60_000;
const FULL_SYNC_EVERY_MS = 24 * 60 * 60_000;
/** Solapamiento con la ejecución anterior para no perder cambios hechos mientras se sincronizaba. */
const OVERLAP_MS = 60_000;

export const INVELLO_SYSTEM_ACTOR: Actor = { type: "system", name: "invello-sync" };

export interface InvelloSyncResult {
  readonly skipped: boolean;
  readonly full: boolean;
  readonly products: number;
  readonly stockUpdates: number;
  readonly linkedStockChanges: number;
  readonly failed: number;
}

export function isInvelloConfigured(): boolean {
  return getInvelloClient() !== null;
}

const toCents = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;

function productData(dto: InvelloProductDto, syncedAt: Date) {
  return {
    sku: dto.sku,
    name: dto.name.trim() || dto.sku,
    description: dto.description?.trim() ?? "",
    brand: dto.brand?.trim() || null,
    upc: dto.upc?.trim() || null,
    categoryName: dto.category?.name.trim() || null,
    unit: dto.unit,
    unitsPerCase: dto.units_per_case,
    weightGrams: dto.weight_kg && dto.weight_kg > 0 ? Math.round(dto.weight_kg * 1000) : null,
    imageUrls: [...dto.images],
    active: dto.active,
    priceCents: toCents(dto.prices?.unit),
    mapPriceCents: toCents(dto.prices?.map),
    available: dto.stock ? Math.max(0, Math.trunc(dto.stock.available)) : null,
    remoteUpdatedAt: new Date(dto.updated_at),
    syncedAt,
  };
}

/** Reserva la sincronización durante `LOCK_MS` para que el worker y el panel no se ejecuten a la vez. */
async function acquireLock(now: Date) {
  const prisma = getPrisma();
  await prisma.invelloSyncState.upsert({ where: { id: STATE_ID }, create: { id: STATE_ID }, update: {} });
  const { count } = await prisma.invelloSyncState.updateMany({
    where: { id: STATE_ID, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
    data: { lockedUntil: new Date(now.getTime() + LOCK_MS) },
  });
  return count === 1 ? prisma.invelloSyncState.findUniqueOrThrow({ where: { id: STATE_ID } }) : null;
}

async function syncProducts(
  client: InvelloClient,
  updatedSince: Date | undefined,
  startedAt: Date,
  signal?: AbortSignal,
) {
  const prisma = getPrisma();
  const seen: string[] = [];
  let failed = 0;
  for await (const page of client.products({
    ...(updatedSince ? { updatedSince } : {}),
    ...(signal ? { signal } : {}),
  })) {
    for (const dto of page) {
      const data = productData(dto, startedAt);
      try {
        await prisma.invelloProduct.upsert({
          where: { externalId: dto.id },
          create: { externalId: dto.id, ...data },
          update: data,
        });
        seen.push(dto.id);
      } catch (error) {
        // Un producto inválido no debe detener el resto de la sincronización.
        failed += 1;
        logger.warn("product upsert failed", { sku: dto.sku, error: String(error) });
      }
    }
  }
  return { seen, failed };
}

async function syncStock(client: InvelloClient, updatedSince: Date | undefined, startedAt: Date, signal?: AbortSignal) {
  const prisma = getPrisma();
  let updates = 0;
  for await (const page of client.stock({ ...(updatedSince ? { updatedSince } : {}), ...(signal ? { signal } : {}) })) {
    for (const item of page) {
      const { count } = await prisma.invelloProduct.updateMany({
        where: { sku: { equals: item.sku, mode: "insensitive" } },
        data: { available: Math.max(0, Math.trunc(item.available)), active: item.active, syncedAt: startedAt },
      });
      updates += count;
    }
  }
  return updates;
}

/**
 * Aplica a las variantes vinculadas las existencias del proveedor. Un producto desactivado en Invello pasa a 0.
 * Si la key no comparte existencias (`available` nulo), el stock de la tienda se gestiona a mano.
 */
async function applyLinkedStock(actor: Actor) {
  const linked = await getPrisma().invelloProduct.findMany({
    where: { variantId: { not: null } },
    select: { variantId: true, active: true, available: true },
  });
  let changes = 0;
  for (const item of linked) {
    if (!item.variantId || (item.active && item.available === null)) continue;
    const { delta } = await setSupplierStock(actor, item.variantId, item.active ? (item.available ?? 0) : 0);
    if (delta !== 0) changes += 1;
  }
  return changes;
}

function describeError(error: unknown): string {
  if (error instanceof InvelloApiError) return `${error.status} ${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}

/** Sincroniza productos, precios y existencias de Invello. Devuelve `skipped` si ya hay otra en curso. */
export async function syncInvello(
  actor: Actor,
  options: { full?: boolean; signal?: AbortSignal } = {},
): Promise<InvelloSyncResult> {
  requireAdminOrSystem(actor);
  const client = getInvelloClient();
  if (!client) throw new DomainError("invalid_state", "Invello is not configured. Set INVELLO_API_KEY.");

  const startedAt = new Date();
  const state = await acquireLock(startedAt);
  if (!state) return { skipped: true, full: false, products: 0, stockUpdates: 0, linkedStockChanges: 0, failed: 0 };

  const prisma = getPrisma();
  try {
    const me = await client.me(options.signal);
    const full =
      options.full === true ||
      !state.fullSyncedAt ||
      !state.productsSyncedAt ||
      startedAt.getTime() - state.fullSyncedAt.getTime() > FULL_SYNC_EVERY_MS;
    const productsSince = full ? undefined : new Date(state.productsSyncedAt!.getTime() - OVERLAP_MS);

    const { seen, failed } = await syncProducts(client, productsSince, startedAt, options.signal);
    if (full && failed === 0) {
      // La lista completa solo trae productos activos y visibles para la key: el resto ya no se puede vender.
      await prisma.invelloProduct.updateMany({
        where: { active: true, externalId: { notIn: seen } },
        data: { active: false, syncedAt: startedAt },
      });
    }

    // La sincronización completa ya trae las existencias de cada producto.
    let stockUpdates = 0;
    if (!full && me.permissions.stock) {
      const stockSince = state.stockSyncedAt ? new Date(state.stockSyncedAt.getTime() - OVERLAP_MS) : undefined;
      stockUpdates = await syncStock(client, stockSince, startedAt, options.signal);
    }
    const linkedStockChanges = await applyLinkedStock(actor);

    await prisma.invelloSyncState.update({
      where: { id: STATE_ID },
      data: {
        supplierName: me.organization.name,
        productsSyncedAt: startedAt,
        ...(full ? { fullSyncedAt: startedAt } : {}),
        stockSyncedAt: startedAt,
        lastRunAt: startedAt,
        lastError: failed ? `${failed} product(s) could not be saved; see logs.` : null,
        lockedUntil: null,
      },
    });
    const result = { skipped: false, full, products: seen.length, stockUpdates, linkedStockChanges, failed };
    logger.info("sync finished", { ...result });
    return result;
  } catch (error) {
    await prisma.invelloSyncState.update({
      where: { id: STATE_ID },
      data: { lastRunAt: startedAt, lastError: describeError(error).slice(0, 500), lockedUntil: null },
    });
    logger.error("sync failed", { error: describeError(error) });
    if (error instanceof InvelloApiError) {
      throw new DomainError("invalid_state", `Invello sync failed: ${error.message}`);
    }
    throw error;
  }
}

export async function getInvelloSyncState() {
  return getPrisma().invelloSyncState.findUnique({ where: { id: STATE_ID } });
}
