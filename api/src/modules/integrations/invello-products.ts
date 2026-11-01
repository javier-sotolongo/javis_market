import { createHash } from "node:crypto";
import { z } from "zod";
import { getPrisma, type Prisma } from "@javis-market/db";
import { centsToDecimalString } from "@javis-market/shared";
import { getFileStorage } from "../../adapters/storage";
import { DomainError, notFound } from "../../infrastructure/errors";
import { createLogger } from "../../infrastructure/logger";
import { normalizePage, toPage } from "../../infrastructure/pagination";
import { parseInput } from "../../infrastructure/validation";
import { type Actor, recordAudit, requireAdmin, requireAdminOrSystem } from "../access";
import {
  createProduct,
  findOrCreateCategoryByName,
  importProductImageFromUrl,
  previewRemoteImage,
  setProductStatus,
} from "../catalog";
import { setSupplierStock } from "../inventory";
import { getInvelloSyncState, isInvelloConfigured } from "./invello-sync";

const logger = createLogger("integrations.invello");

const PAGE_SIZE = 50;

export const INVELLO_FILTERS = ["all", "not_selling", "selling", "in_stock", "discontinued"] as const;
export type InvelloFilter = (typeof INVELLO_FILTERS)[number];

/** Resumen para la cabecera del panel: configuración, última sincronización, totales y categorías del proveedor. */
export async function getInvelloOverview(actor: Actor) {
  requireAdmin(actor);
  const prisma = getPrisma();
  const [state, total, selling, categories] = await Promise.all([
    getInvelloSyncState(),
    prisma.invelloProduct.count({ where: { active: true } }),
    prisma.invelloProduct.count({ where: { variantId: { not: null } } }),
    prisma.invelloProduct.findMany({
      where: { active: true, categoryName: { not: null } },
      distinct: ["categoryName"],
      select: { categoryName: true },
      orderBy: { categoryName: "asc" },
    }),
  ]);
  return {
    configured: isInvelloConfigured(),
    supplierName: state?.supplierName ?? null,
    lastRunAt: state?.lastRunAt ?? null,
    lastSuccessAt: state?.productsSyncedAt ?? null,
    lastError: state?.lastError ?? null,
    total,
    selling,
    categories: categories.map((c) => c.categoryName!),
  };
}

export async function listInvelloProducts(
  actor: Actor,
  options: { query?: string; filter?: string; category?: string; page?: unknown } = {},
) {
  requireAdmin(actor);
  const { page, skip, take } = normalizePage(options.page, PAGE_SIZE);
  const filter = INVELLO_FILTERS.find((f) => f === options.filter) ?? "all";
  const query = options.query?.trim();
  const where: Prisma.InvelloProductWhereInput = {
    AND: [
      // Los descontinuados solo aparecen en su filtro o si ya se venden (para poder retirarlos).
      filter === "discontinued" ? { active: false } : { OR: [{ active: true }, { variantId: { not: null } }] },
      filter === "selling" ? { variantId: { not: null } } : {},
      filter === "not_selling" ? { variantId: null } : {},
      filter === "in_stock" ? { available: { gt: 0 } } : {},
      options.category ? { categoryName: options.category } : {},
      query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { sku: { contains: query, mode: "insensitive" } },
              { brand: { contains: query, mode: "insensitive" } },
              { upc: { contains: query } },
            ],
          }
        : {},
    ],
  };
  const prisma = getPrisma();
  const [rows, total] = await Promise.all([
    prisma.invelloProduct.findMany({
      where,
      orderBy: [{ name: "asc" }, { sku: "asc" }],
      skip,
      take,
      include: {
        variant: {
          select: {
            id: true,
            priceCents: true,
            archivedAt: true,
            stockLevel: { select: { onHand: true, reserved: true } },
            product: { select: { id: true, name: true, status: true } },
          },
        },
      },
    }),
    prisma.invelloProduct.count({ where }),
  ]);
  const items = rows.map(({ variant, ...item }) => ({
    ...item,
    store: variant
      ? {
          productId: variant.product.id,
          productName: variant.product.name,
          status: variant.product.status,
          variantArchived: variant.archivedAt !== null,
          priceCents: variant.priceCents,
          available: Math.max(0, (variant.stockLevel?.onHand ?? 0) - (variant.stockLevel?.reserved ?? 0)),
        }
      : null,
  }));
  return toPage(items, page, PAGE_SIZE, total);
}

const sellSchema = z.object({
  // El formato del precio lo valida el catálogo al crear la variante.
  price: z.string().trim().min(1, "Enter the selling price."),
  publish: z.boolean().default(true),
});

export type SellInvelloProductInput = z.input<typeof sellSchema>;

/**
 * Empieza a vender un producto de Invello: crea un producto propio con su SKU, el precio indicado por el
 * administrador (por defecto el del proveedor) y el precio del proveedor como coste; lo vincula para que sus
 * existencias se sincronicen y, si se pide, lo publica. Las fotos las elige después el administrador
 * (`addInvelloPhoto`): no todas las del proveedor sirven para la tienda.
 */
export async function sellInvelloProduct(actor: Actor, invelloProductId: string, input: SellInvelloProductInput) {
  requireAdmin(actor);
  const data = parseInput(sellSchema, input);
  const prisma = getPrisma();
  const item = await prisma.invelloProduct.findUnique({ where: { id: invelloProductId } });
  if (!item) throw notFound("Invello product");
  if (item.variantId) throw new DomainError("conflict", "This product is already in your store.");
  if (!item.active) {
    throw new DomainError("business_rule_violation", "The supplier discontinued this product; it cannot be sold.");
  }
  const sku = item.sku.trim().toUpperCase();
  if (await prisma.variant.findUnique({ where: { sku }, select: { id: true } })) {
    throw new DomainError(
      "conflict",
      `Your catalog already has a product with SKU ${sku}. Change that SKU to sell this one from Invello.`,
    );
  }

  const state = await getInvelloSyncState();
  const category = item.categoryName ? await findOrCreateCategoryByName(actor, item.categoryName) : null;
  const product = await createProduct(actor, {
    name: item.name,
    description: item.description,
    brand: item.brand ?? "",
    supplier: state?.supplierName ? `${state.supplierName} (Invello)` : "Invello",
    categoryIds: category ? [category.id] : [],
    sku,
    price: data.price,
    cost: item.priceCents === null ? "" : centsToDecimalString(item.priceCents),
    weightGrams: item.weightGrams === null ? "" : String(item.weightGrams),
  });
  const variantId = product.variants[0]!.id;

  await prisma.$transaction(async (tx) => {
    await tx.invelloProduct.update({ where: { id: item.id }, data: { variantId } });
    if (item.available !== null) await setSupplierStock(actor, variantId, item.available, tx);
    await recordAudit(
      actor,
      {
        action: "invello.sell",
        entityType: "product",
        entityId: product.id,
        changes: {
          invelloSku: item.sku,
          supplierPriceCents: item.priceCents,
          priceCents: product.variants[0]!.priceCents,
        },
      },
      tx,
    );
  });

  if (data.publish) await setProductStatus(actor, product.id, "ACTIVE");
  return { productId: product.id };
}

/**
 * Descarga la foto principal del proveedor (la primera) si el producto aún no tiene ninguna, para que no quede sin
 * imagen en la tienda. Las demás fotos las elige el administrador. Lenta en origen: el panel la lanza tras responder.
 */
export async function addInvelloMainPhoto(actor: Actor, invelloProductId: string) {
  requireAdmin(actor);
  const item = await getPrisma().invelloProduct.findUnique({
    where: { id: invelloProductId },
    select: { imageUrls: true, variant: { select: { product: { select: { _count: { select: { images: true } } } } } } },
  });
  if (!item?.variant || item.imageUrls.length === 0 || item.variant.product._count.images > 0) return null;
  return addInvelloPhoto(actor, invelloProductId, 0);
}

/** Fotos del proveedor de un producto vendido desde Invello, indicando cuáles ya se añadieron. `null` si no lo es. */
export async function getInvelloPhotosForProduct(actor: Actor, productId: string) {
  requireAdmin(actor);
  const prisma = getPrisma();
  const item = await prisma.invelloProduct.findFirst({
    where: { variant: { productId } },
    select: { id: true, imageUrls: true },
  });
  if (!item) return null;
  const added = await prisma.productImage.findMany({
    where: { productId, sourceUrl: { in: item.imageUrls } },
    select: { sourceUrl: true },
  });
  const addedUrls = new Set(added.map((image) => image.sourceUrl));
  return {
    invelloProductId: item.id,
    photos: item.imageUrls.map((url, index) => ({ index, url, added: addedUrls.has(url) })),
  };
}

/**
 * Añade al producto una foto concreta del proveedor, elegida por el administrador: se descarga y se guarda en el VPS
 * como cualquier importación por URL. Invello sirve las imágenes despacio (puede tardar decenas de segundos).
 */
export async function addInvelloPhoto(actor: Actor, invelloProductId: string, index: number) {
  requireAdmin(actor);
  const prisma = getPrisma();
  const item = await prisma.invelloProduct.findUnique({
    where: { id: invelloProductId },
    select: { name: true, imageUrls: true, variant: { select: { productId: true } } },
  });
  const url = item?.imageUrls[index];
  if (!item || !url) throw notFound("Photo");
  if (!item.variant) throw new DomainError("invalid_state", "Sell this product first, then choose its photos.");
  const productId = item.variant.productId;
  if (await prisma.productImage.findFirst({ where: { productId, sourceUrl: url }, select: { id: true } })) {
    throw new DomainError("conflict", "This photo is already on the product.");
  }
  return importProductImageFromUrl(actor, productId, { url, altText: item.name });
}

const previewKey = (url: string) =>
  `invello/previews/${createHash("sha256").update(url).digest("hex").slice(0, 32)}.webp`;

/** Miniatura guardada en el almacenamiento privado, generándola si falta. La clave depende de la URL de origen. */
async function cachedPreview(actor: Actor, url: string): Promise<Uint8Array> {
  const storage = getFileStorage();
  const key = previewKey(url);
  const cached = await storage.read({ visibility: "private", key });
  if (cached) return cached;
  const preview = await previewRemoteImage(actor, url);
  await storage.put({ visibility: "private", key, contentType: "image/webp", body: preview });
  return preview;
}

/**
 * Miniatura de una foto del proveedor (la primera por defecto), para decidir desde el panel: Invello no permite
 * enlazar sus imágenes desde otro dominio y tarda decenas de segundos en servir cada una, por eso se guardan.
 */
export async function getInvelloProductPreview(actor: Actor, invelloProductId: string, index = 0) {
  requireAdmin(actor);
  const item = await getPrisma().invelloProduct.findUnique({
    where: { id: invelloProductId },
    select: { imageUrls: true },
  });
  const url = item?.imageUrls[index];
  if (!url) throw notFound("Image");
  return cachedPreview(actor, url);
}

/**
 * Prepara en segundo plano las miniaturas principales que faltan, para que la lista del panel cargue al instante.
 * Lo ejecuta el worker tras sincronizar; varias descargas en paralelo porque cada una es lenta en origen.
 */
export async function warmInvelloPreviews(
  actor: Actor,
  options: { limit?: number; concurrency?: number; signal?: AbortSignal } = {},
) {
  requireAdminOrSystem(actor);
  const storage = getFileStorage();
  const items = await getPrisma().invelloProduct.findMany({
    where: { active: true, NOT: { imageUrls: { isEmpty: true } } },
    select: { sku: true, imageUrls: true },
    orderBy: { name: "asc" },
  });
  const missing: { sku: string; url: string }[] = [];
  for (const item of items) {
    const url = item.imageUrls[0]!;
    if (!(await storage.read({ visibility: "private", key: previewKey(url) }))) missing.push({ sku: item.sku, url });
  }
  const queue = missing.slice(0, options.limit ?? 200);
  let generated = 0;
  let failed = 0;
  const workers = Array.from({ length: options.concurrency ?? 4 }, async () => {
    for (let next = queue.shift(); next && !options.signal?.aborted; next = queue.shift()) {
      try {
        await cachedPreview(actor, next.url);
        generated += 1;
      } catch (error) {
        failed += 1;
        logger.warn("preview failed", { sku: next.sku, error: String(error) });
      }
    }
  });
  await Promise.all(workers);
  return { generated, failed, pending: missing.length - generated - failed };
}
