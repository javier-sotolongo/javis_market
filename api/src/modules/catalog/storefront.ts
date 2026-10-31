import { getPrisma, type Prisma } from "@javis-market/db";
import { money, type Money } from "@javis-market/shared";
import { getFileStorage } from "../../adapters/storage";
import { normalizePage, toPage } from "../../infrastructure/pagination";
import { getAvailability } from "../inventory";

/**
 * Lecturas públicas de la tienda. Solo productos `ACTIVE` y variantes no archivadas; nunca datos internos
 * (coste, proveedor, notas).
 */

const PAGE_SIZE = 24;

export interface StoreImage {
  readonly url: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

export interface ProductCard {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly brand: string | null;
  readonly image: StoreImage | null;
  readonly price: Money;
  readonly compareAtPrice: Money | null;
  readonly hasPriceRange: boolean;
  readonly inStock: boolean;
  /** Número de variantes activas. */
  readonly variantCount: number;
  /** Presentación de la variante única ("12 oz"); null si no tiene nombre propio o hay varias variantes. */
  readonly presentation: string | null;
  /** Variante que se puede añadir directamente desde el listado: solo si hay una única variante y está disponible. */
  readonly quickAddVariantId: string | null;
}

/** Ordenaciones admitidas, resueltas en la base de datos sobre el catálogo completo (no por página). */
export const STORE_SORTS = ["newest", "name"] as const;
export type StoreSort = (typeof STORE_SORTS)[number];

export function parseStoreSort(value: unknown): StoreSort {
  return STORE_SORTS.find((sort) => sort === value) ?? "newest";
}

const publicProduct = { status: "ACTIVE", variants: { some: { archivedAt: null } } } satisfies Prisma.ProductWhereInput;

function toImage(
  image: { storageKey: string; altText: string; width: number; height: number },
  fallbackAlt: string,
): StoreImage {
  return {
    url: getFileStorage().publicUrl(image.storageKey),
    alt: image.altText || fallbackAlt,
    width: image.width,
    height: image.height,
  };
}

export async function listStoreCategories() {
  const categories = await getPrisma().category.findMany({
    where: { products: { some: { product: publicProduct } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: { where: { product: publicProduct } } } },
    },
  });
  return categories.map(({ _count, ...category }) => ({ ...category, productCount: _count.products }));
}

export async function getStoreCategory(slug: string) {
  return getPrisma().category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, description: true },
  });
}

export async function listStoreProducts(
  options: {
    categorySlug?: string;
    search?: string;
    page?: unknown;
    pageSize?: number;
    sort?: StoreSort;
    /** Solo productos con alguna variante disponible (existencias físicas > reservadas). */
    inStockOnly?: boolean;
    /** Excluye un producto (p. ej. el que se está viendo, en "más de esta categoría"). */
    excludeId?: string;
  } = {},
) {
  const prisma = getPrisma();
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const { page, skip, take } = normalizePage(options.page, pageSize);
  const search = options.search?.trim().slice(0, 100);
  const filters: Prisma.ProductWhereInput[] = [publicProduct];
  if (options.categorySlug) {
    filters.push({ categories: { some: { category: { slug: options.categorySlug } } } });
  }
  if (options.inStockOnly) {
    filters.push({
      variants: { some: { archivedAt: null, stockLevel: { onHand: { gt: prisma.stockLevel.fields.reserved } } } },
    });
  }
  if (options.excludeId) {
    filters.push({ id: { not: options.excludeId } });
  }
  if (search) {
    filters.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  const where: Prisma.ProductWhereInput = { AND: filters };
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    options.sort === "name" ? [{ name: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "desc" }];

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        variants: { where: { archivedAt: null }, orderBy: { position: "asc" } },
      },
    }),
    prisma.product.count({ where }),
  ]);
  const availability = await getAvailability(products.flatMap((p) => p.variants.map((v) => v.id)));
  const items: ProductCard[] = products.map((product) => {
    const cheapest = product.variants.reduce(
      (min, v) => (v.priceCents < min.priceCents ? v : min),
      product.variants[0]!,
    );
    const firstImage = product.images[0];
    const single = product.variants.length === 1 ? cheapest : null;
    const inStock = product.variants.some((v) => (availability.get(v.id) ?? 0) > 0);
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      image: firstImage ? toImage(firstImage, product.name) : null,
      price: money(cheapest.priceCents),
      compareAtPrice: cheapest.compareAtPriceCents ? money(cheapest.compareAtPriceCents) : null,
      hasPriceRange: product.variants.some((v) => v.priceCents !== cheapest.priceCents),
      inStock,
      variantCount: product.variants.length,
      presentation: single && single.title !== "Default" ? single.title : null,
      quickAddVariantId: single && inStock ? single.id : null,
    };
  });
  return toPage(items, page, pageSize, total);
}

export async function getStoreProduct(slug: string) {
  const product = await getPrisma().product.findFirst({
    where: { slug, ...publicProduct },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { where: { archivedAt: null }, orderBy: { position: "asc" } },
      categories: { include: { category: { select: { name: true, slug: true } } } },
    },
  });
  if (!product) return null;
  const availability = await getAvailability(product.variants.map((v) => v.id));
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    brand: product.brand,
    images: product.images.map((image) => toImage(image, product.name)),
    categories: product.categories.map((c) => c.category),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      title: variant.title,
      sku: variant.sku,
      price: money(variant.priceCents),
      compareAtPrice: variant.compareAtPriceCents ? money(variant.compareAtPriceCents) : null,
      available: availability.get(variant.id) ?? 0,
    })),
  };
}

export type StoreProduct = NonNullable<Awaited<ReturnType<typeof getStoreProduct>>>;
