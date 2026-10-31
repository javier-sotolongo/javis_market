import { PackageOpen, SearchX, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { listStoreCategories, listStoreProducts, parseStoreSort } from "@javis-market/api";
import { buttonClass } from "@/components/ui/button-class";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "../empty-state";
import { ProductGrid } from "../product-card";
import { ActiveFilters } from "./active-filters";
import { CatalogFilters } from "./catalog-filters";
import type { CatalogParams } from "./catalog-url";
import { SortControl } from "./sort-control";

/**
 * Vista de catálogo compartida por /products y /categories/[slug]: filtros reales (categoría, disponibilidad),
 * búsqueda y orden aplicados en la base de datos sobre todo el catálogo, con paginación.
 */
export async function CatalogView({
  params,
  category,
}: {
  readonly params: CatalogParams;
  readonly category: { readonly name: string; readonly slug: string; readonly description: string } | null;
}) {
  const basePath = category ? `/categories/${category.slug}` : "/products";
  const sort = parseStoreSort(params.sort);
  const [result, categories] = await Promise.all([
    listStoreProducts({
      ...(category ? { categorySlug: category.slug } : {}),
      ...(params.q ? { search: params.q } : {}),
      sort,
      inStockOnly: params.stock === "in",
      page: params.page,
    }),
    listStoreCategories(),
  ]);
  const filtered = Boolean(params.q || params.stock === "in" || category);
  const title = category ? category.name : params.q ? `Results for “${params.q}”` : "All products";
  const firstItem = (result.page - 1) * result.pageSize + 1;
  const lastItem = firstItem + result.items.length - 1;
  const countText =
    result.totalItems === 0
      ? "No products"
      : result.totalPages > 1
        ? `Showing ${firstItem}–${lastItem} of ${result.totalItems} products`
        : `${result.totalItems} ${result.totalItems === 1 ? "product" : "products"}`;

  return (
    <div className="mx-auto max-w-shop px-4 pt-6 pb-4 sm:px-6 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-12 lg:px-10 lg:pt-10">
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-36">
          <CatalogFilters
            categories={categories}
            activeSlug={category?.slug ?? null}
            basePath={basePath}
            params={params}
            idPrefix="desktop"
          />
        </div>
      </aside>

      <section aria-labelledby="catalog-title" className="min-w-0">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <h1 id="catalog-title" className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-ink-muted" aria-live="polite">
              {countText}
              {category?.description ? <span className="text-ink-subtle"> · {category.description}</span> : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <details className="relative lg:hidden">
              <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold text-ink hover:border-ink-subtle [&::-webkit-details-marker]:hidden">
                <SlidersHorizontal aria-hidden className="size-4" />
                Filters
              </summary>
              <div className="absolute left-0 z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-white p-3 shadow-raised">
                <CatalogFilters
                  categories={categories}
                  activeSlug={category?.slug ?? null}
                  basePath={basePath}
                  params={params}
                  idPrefix="mobile"
                />
              </div>
            </details>
            <SortControl basePath={basePath} params={params} />
          </div>
        </header>

        <div className="mt-5 empty:hidden">
          <ActiveFilters basePath={basePath} params={params} category={category} />
        </div>

        <div className="mt-8">
          {result.items.length > 0 ? (
            <ProductGrid products={result.items} priorityCount={4} />
          ) : filtered ? (
            <EmptyState
              icon={SearchX}
              title="No products match your filters"
              action={
                <Link href="/products" className={buttonClass("primary")}>
                  Clear filters
                </Link>
              }
            >
              Try a different search term, another category or include out-of-stock items.
            </EmptyState>
          ) : (
            <EmptyState icon={PackageOpen} title="No products available yet">
              Our catalog is being prepared. Please check back soon.
            </EmptyState>
          )}
        </div>

        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          basePath={basePath}
          params={{
            q: params.q,
            sort: sort === "newest" ? undefined : sort,
            stock: params.stock === "in" ? "in" : undefined,
          }}
        />
      </section>
    </div>
  );
}
