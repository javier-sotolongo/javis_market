import Form from "next/form";
import { type CatalogParams } from "./catalog-url";
import { SubmitOnChangeSelect } from "./submit-on-change";

const OPTIONS = [
  { value: "newest", label: "Sort: Newest" },
  { value: "name", label: "Sort: Name A–Z" },
] as const;

/** Ordenación del catálogo completo (resuelta en la base de datos). */
export function SortControl({ basePath, params }: { readonly basePath: string; readonly params: CatalogParams }) {
  return (
    <Form action={basePath} className="flex items-center gap-2">
      {params.q ? <input type="hidden" name="q" value={params.q} /> : null}
      {params.stock === "in" ? <input type="hidden" name="stock" value="in" /> : null}
      <label htmlFor="catalog-sort" className="sr-only">
        Sort by
      </label>
      <SubmitOnChangeSelect
        id="catalog-sort"
        name="sort"
        defaultValue={params.sort === "name" ? "name" : "newest"}
        className="h-10 rounded-full border border-line-strong bg-surface pr-9 pl-4 text-sm font-semibold text-ink hover:border-ink-subtle focus:border-ink"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SubmitOnChangeSelect>
      <noscript>
        <button type="submit" className="text-sm font-semibold text-brand underline">
          Apply
        </button>
      </noscript>
    </Form>
  );
}
