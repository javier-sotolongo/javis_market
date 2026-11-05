import { X } from "lucide-react";
import Link from "next/link";
import { type CatalogParams, catalogHref } from "./catalog-url";

/** Filtros aplicados, cada uno eliminable, y opción de limpiarlos todos. */
export function ActiveFilters({
  basePath,
  params,
  category,
}: {
  readonly basePath: string;
  readonly params: CatalogParams;
  readonly category: { readonly name: string } | null;
}) {
  const chips: { key: string; label: string; href: string }[] = [];
  if (params.q) chips.push({ key: "q", label: `“${params.q}”`, href: catalogHref(basePath, params, { q: undefined }) });
  if (category) chips.push({ key: "category", label: category.name, href: catalogHref("/products", params) });
  if (params.stock === "in")
    chips.push({ key: "stock", label: "In stock only", href: catalogHref(basePath, params, { stock: undefined }) });
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters" role="group">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface pr-2.5 pl-3.5 text-sm font-medium text-ink ring-1 ring-line transition-shadow ring-inset hover:ring-line-strong"
          aria-label={`Remove filter ${chip.label}`}
        >
          {chip.label}
          <X aria-hidden className="size-4 text-ink-muted" />
        </Link>
      ))}
      <Link
        href="/products"
        className="inline-flex min-h-9 items-center px-2 text-sm font-semibold text-brand-ink underline-offset-4 hover:underline"
      >
        Clear all
      </Link>
    </div>
  );
}
