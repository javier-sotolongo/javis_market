import { ArrowRight, Search } from "lucide-react";

/** Buscador del catálogo (sobre la barra grafito de la cabecera): formulario GET a /products, funciona sin JavaScript. */
export function SearchForm({
  defaultValue = "",
  id = "site-search",
}: {
  readonly defaultValue?: string;
  readonly id?: string;
}) {
  return (
    <form action="/products" role="search" className="relative w-full">
      <label htmlFor={id} className="sr-only">
        Search products
      </label>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
      />
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search products and brands"
        autoComplete="off"
        enterKeyHint="search"
        className="h-12 w-full rounded-full border border-transparent bg-surface pr-14 pl-12 text-[0.9375rem] text-ink transition-shadow placeholder:text-ink-subtle focus:border-titanium focus:ring-4 focus:ring-white/25 focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Search"
        className="absolute top-1.5 right-1.5 flex size-9 items-center justify-center rounded-full bg-brand text-brand-contrast transition-colors hover:bg-brand-hover"
      >
        <ArrowRight aria-hidden className="size-4" />
      </button>
    </form>
  );
}
