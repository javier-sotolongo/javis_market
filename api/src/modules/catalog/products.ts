import { getPrisma, type Prisma, type ProductStatus } from "@javis-market/db";
import { DomainError, notFound } from "../../infrastructure/errors";
import { normalizePage, toPage } from "../../infrastructure/pagination";
import { isUniqueViolation } from "../../infrastructure/prisma-errors";
import { parseInput } from "../../infrastructure/validation";
import { type Actor, recordAudit, requireAdmin } from "../access";
import { adjustStock, initializeStock } from "../inventory";
import {
  type CreateProductInput,
  createProductSchema,
  type UpdateProductInput,
  updateProductSchema,
  type VariantInput,
  variantSchema,
} from "./schemas";
import { resolveSlug } from "./slugs";

const PAGE_SIZE = 25;

const skuConflict = () =>
  new DomainError("conflict", "This SKU is already in use.", [{ path: "sku", message: "Already in use." }]);

async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const found = await getPrisma().product.findUnique({ where: { slug }, select: { id: true } });
  return !!found && found.id !== exceptId;
}

async function assertCategoriesExist(tx: Prisma.TransactionClient, ids: readonly string[]) {
  if (ids.length === 0) return;
  const count = await tx.category.count({ where: { id: { in: [...ids] } } });
  if (count !== new Set(ids).size) {
    throw new DomainError("validation_failed", "One of the selected categories no longer exists.", [
      { path: "categoryIds", message: "Unknown category." },
    ]);
  }
}

export async function listProducts(actor: Actor, options: { query?: string; status?: string; page?: unknown } = {}) {
  requireAdmin(actor);
  const { page, skip, take } = normalizePage(options.page, PAGE_SIZE);
  const query = options.query?.trim();
  const status = (["DRAFT", "ACTIVE", "ARCHIVED"] as const).find((s) => s === options.status);
  const where: Prisma.ProductWhereInput = {
    ...(status ? { status } : { status: { not: "ARCHIVED" } }),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { variants: { some: { sku: { contains: query, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const prisma = getPrisma();
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        variants: { where: { archivedAt: null }, orderBy: { position: "asc" }, include: { stockLevel: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);
  const items = products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    status: product.status,
    updatedAt: product.updatedAt,
    imageKey: product.images[0]?.storageKey ?? null,
    variantCount: product.variants.length,
    minPriceCents: product.variants.length ? Math.min(...product.variants.map((v) => v.priceCents)) : null,
    onHand: product.variants.reduce((sum, v) => sum + (v.stockLevel?.onHand ?? 0), 0),
  }));
  return toPage(items, page, PAGE_SIZE, total);
}

export async function getProductForAdmin(actor: Actor, id: string) {
  requireAdmin(actor);
  const product = await getPrisma().product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: {
        orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { position: "asc" }],
        include: { stockLevel: true },
      },
      categories: { select: { categoryId: true } },
    },
  });
  if (!product) throw notFound("Product");
  return { ...product, categoryIds: product.categories.map((c) => c.categoryId) };
}

/** Crea un producto (borrador) con su primera variante y, opcionalmente, existencias iniciales. */
export async function createProduct(actor: Actor, input: CreateProductInput) {
  requireAdmin(actor);
  const data = parseInput(createProductSchema, input);
  const slug = await resolveSlug(data.slug ?? undefined, data.name, (s) => slugTaken(s));
  try {
    return await getPrisma().$transaction(async (tx) => {
      await assertCategoriesExist(tx, data.categoryIds);
      const product = await tx.product.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          brand: data.brand,
          supplier: data.supplier,
          status: "DRAFT",
          categories: { create: data.categoryIds.map((categoryId) => ({ categoryId })) },
          variants: {
            create: {
              sku: data.sku,
              title: data.title,
              priceCents: data.price,
              compareAtPriceCents: data.compareAtPrice,
              costCents: data.cost,
              weightGrams: data.weightGrams,
            },
          },
        },
        include: { variants: true },
      });
      const variant = product.variants[0]!;
      await initializeStock(tx, variant.id);
      await recordAudit(
        actor,
        {
          action: "product.create",
          entityType: "product",
          entityId: product.id,
          changes: { name: data.name, sku: data.sku, priceCents: data.price },
        },
        tx,
      );
      if (data.initialStock > 0) {
        await adjustStock(
          actor,
          { variantId: variant.id, mode: "add", quantity: data.initialStock, note: "Initial stock" },
          tx,
        );
      }
      return product;
    });
  } catch (error) {
    if (isUniqueViolation(error, "sku")) throw skuConflict();
    throw error;
  }
}

export async function updateProduct(actor: Actor, id: string, input: UpdateProductInput) {
  requireAdmin(actor);
  const data = parseInput(updateProductSchema, input);
  const prisma = getPrisma();
  const current = await prisma.product.findUnique({
    where: { id },
    include: { variants: { where: { archivedAt: null }, select: { id: true } } },
  });
  if (!current) throw notFound("Product");
  if (data.status === "ACTIVE" && current.variants.length === 0) {
    throw new DomainError("business_rule_violation", "Add at least one active variant before publishing.", [
      { path: "status", message: "Needs an active variant." },
    ]);
  }
  const slug =
    data.slug && data.slug !== current.slug
      ? await resolveSlug(data.slug, data.name, (s) => slugTaken(s, id))
      : current.slug;

  return prisma.$transaction(async (tx) => {
    await assertCategoriesExist(tx, data.categoryIds);
    await tx.productCategory.deleteMany({ where: { productId: id } });
    const product = await tx.product.update({
      where: { id },
      data: {
        name: data.name,
        slug,
        description: data.description,
        brand: data.brand,
        supplier: data.supplier,
        status: data.status,
        categories: { create: data.categoryIds.map((categoryId) => ({ categoryId })) },
      },
    });
    await recordAudit(
      actor,
      {
        action: data.status !== current.status ? `product.status.${data.status.toLowerCase()}` : "product.update",
        entityType: "product",
        entityId: id,
        changes: {
          name: data.name,
          slug,
          status: data.status,
          previousStatus: current.status,
          categoryIds: data.categoryIds,
        },
      },
      tx,
    );
    return product;
  });
}

export async function setProductStatus(actor: Actor, id: string, status: ProductStatus) {
  requireAdmin(actor);
  const product = await getProductForAdmin(actor, id);
  return updateProduct(actor, id, {
    name: product.name,
    slug: product.slug,
    description: product.description,
    brand: product.brand ?? "",
    supplier: product.supplier ?? "",
    categoryIds: product.categoryIds,
    status,
  });
}

function variantData(data: ReturnType<typeof variantSchema.parse>) {
  return {
    sku: data.sku,
    title: data.title,
    priceCents: data.price,
    compareAtPriceCents: data.compareAtPrice,
    costCents: data.cost,
    weightGrams: data.weightGrams,
  };
}

export async function addVariant(actor: Actor, productId: string, input: VariantInput) {
  requireAdmin(actor);
  const data = parseInput(variantSchema, input);
  try {
    return await getPrisma().$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: { _count: { select: { variants: true } } },
      });
      if (!product) throw notFound("Product");
      const variant = await tx.variant.create({
        data: { ...variantData(data), productId, position: product._count.variants },
      });
      await initializeStock(tx, variant.id);
      await recordAudit(
        actor,
        {
          action: "variant.create",
          entityType: "variant",
          entityId: variant.id,
          changes: { productId, sku: data.sku, priceCents: data.price },
        },
        tx,
      );
      return variant;
    });
  } catch (error) {
    if (isUniqueViolation(error, "sku")) throw skuConflict();
    throw error;
  }
}

export async function updateVariant(actor: Actor, variantId: string, input: VariantInput) {
  requireAdmin(actor);
  const data = parseInput(variantSchema, input);
  try {
    return await getPrisma().$transaction(async (tx) => {
      const current = await tx.variant.findUnique({ where: { id: variantId } });
      if (!current) throw notFound("Variant");
      const variant = await tx.variant.update({ where: { id: variantId }, data: variantData(data) });
      await recordAudit(
        actor,
        {
          action: current.priceCents !== data.price ? "variant.price_change" : "variant.update",
          entityType: "variant",
          entityId: variantId,
          changes: {
            sku: data.sku,
            priceCentsBefore: current.priceCents,
            priceCentsAfter: data.price,
            title: data.title,
          },
        },
        tx,
      );
      return variant;
    });
  } catch (error) {
    if (isUniqueViolation(error, "sku")) throw skuConflict();
    throw error;
  }
}

/** Archiva (o restaura) una variante. No se borran: pueden estar referenciadas por carritos y, más adelante, pedidos. */
export async function setVariantArchived(actor: Actor, variantId: string, archived: boolean) {
  requireAdmin(actor);
  return getPrisma().$transaction(async (tx) => {
    const variant = await tx.variant.findUnique({
      where: { id: variantId },
      include: { product: { include: { variants: { where: { archivedAt: null } } } } },
    });
    if (!variant) throw notFound("Variant");
    if (
      archived &&
      variant.product.status === "ACTIVE" &&
      variant.product.variants.length <= 1 &&
      !variant.archivedAt
    ) {
      throw new DomainError(
        "business_rule_violation",
        "A published product needs at least one active variant. Unpublish the product first.",
      );
    }
    await tx.variant.update({ where: { id: variantId }, data: { archivedAt: archived ? new Date() : null } });
    await recordAudit(
      actor,
      { action: archived ? "variant.archive" : "variant.restore", entityType: "variant", entityId: variantId },
      tx,
    );
  });
}

export async function countProductsByStatus(actor: Actor): Promise<Record<ProductStatus, number>> {
  requireAdmin(actor);
  const groups = await getPrisma().product.groupBy({ by: ["status"], _count: { _all: true } });
  const counts: Record<ProductStatus, number> = { DRAFT: 0, ACTIVE: 0, ARCHIVED: 0 };
  for (const group of groups) counts[group.status] = group._count._all;
  return counts;
}
