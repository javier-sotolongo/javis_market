import Form from "next/form";
import Link from "next/link";
import { type CatalogParams, catalogHref } from "./catalog-url";
import { SubmitOnChangeCheckbox } from "./submit-on-change";

interface FilterCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly productCount: number;
}

/** Filtros reales del catálogo: categoría y disponibilidad. Conservan búsqueda y orden al cambiar. */
export function CatalogFilters({
  categories,
  activeSlug,
  basePath,
  params,
  idPrefix,
}: {
  readonly categories: readonly FilterCategory[];
  readonly activeSlug: string | null;
  readonly basePath: string;
  readonly params: CatalogParams;
  readonly idPrefix: string;
}) {
  const linkClass = (active: boolean) =>
    `flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 text-[0.9375rem] ${
      active ? "bg-navy text-white font-semibold" : "text-ink-muted hover:bg-canvas-muted hover:text-ink"
    }`;
  return (
    <div className="space-y-7">
      <section aria-labelledby={`${idPrefix}-category`}>
        <h2 id={`${idPrefix}-category`} className="mb-2 px-3 text-sm font-semibold text-ink">
          Category
        </h2>
        <ul className="space-y-0.5">
          <li>
            <Link
              href={catalogHref("/products", params)}
              aria-current={activeSlug === null ? "page" : undefined}
              className={linkClass(activeSlug === null)}
            >
              All products
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={catalogHref(`/categories/${category.slug}`, params)}
                aria-current={activeSlug === category.slug ? "page" : undefined}
                className={linkClass(activeSlug === category.slug)}
              >
                <span className="truncate">{category.name}</span>
                <span
                  className={`text-sm tabular-nums ${activeSlug === category.slug ? "text-steel" : "text-ink-subtle"}`}
                >
                  {category.productCount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={`${idPrefix}-availability`}>
        <h2 id={`${idPrefix}-availability`} className="mb-2 px-3 text-sm font-semibold text-ink">
          Availability
        </h2>
        <Form action={basePath} className="px-3">
          {params.q ? <input type="hidden" name="q" value={params.q} /> : null}
          {params.sort && params.sort !== "newest" ? <input type="hidden" name="sort" value={params.sort} /> : null}
          <label className="flex min-h-10 cursor-pointer items-center gap-3 text-[0.9375rem] text-ink-muted hover:text-ink">
            <SubmitOnChangeCheckbox
              name="stock"
              value="in"
              defaultChecked={params.stock === "in"}
              className="size-[1.125rem] accent-brand"
            />
            In stock only
          </label>
          <noscript>
            <button type="submit" className="mt-1 text-sm font-semibold text-brand-ink underline">
              Apply
            </button>
          </noscript>
        </Form>
      </section>
    </div>
  );
}
