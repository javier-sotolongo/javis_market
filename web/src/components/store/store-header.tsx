import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { CategoryNav } from "./category-nav";
import { HeaderShell } from "./header-shell";
import { SearchForm } from "./search-form";

/** Marca tipográfica provisional (monograma + nombre) hasta tener logo. */
export function Wordmark({ inverted = false }: { readonly inverted?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Javis Market home">
      <span
        aria-hidden
        className={`flex size-9 items-center justify-center rounded-lg text-lg font-extrabold ${inverted ? "bg-white text-brand" : "bg-brand text-white"}`}
      >
        J
      </span>
      <span className={`text-xl leading-none font-bold tracking-tight ${inverted ? "text-white" : "text-ink"}`}>
        Javis Market
      </span>
    </Link>
  );
}

export function StoreHeader({
  categories,
  cartCount,
}: {
  readonly categories: readonly { readonly id: string; readonly name: string; readonly slug: string }[];
  readonly cartCount: number;
}) {
  return (
    <HeaderShell>
      <div className="mx-auto grid max-w-shop grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 pt-3 pb-3 sm:px-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-10 md:py-4 lg:px-10">
        <Wordmark />
        <div className="col-span-2 row-start-2 md:col-span-1 md:col-start-2 md:row-start-1 md:max-w-3xl">
          <SearchForm />
        </div>
        <Link
          href="/cart"
          className="relative flex h-11 items-center gap-2 rounded-full pr-3 pl-2.5 text-[0.9375rem] font-semibold text-ink hover:bg-tile md:col-start-3"
          aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
        >
          <span className="relative">
            <ShoppingBag aria-hidden className="size-6" strokeWidth={1.75} />
            {cartCount > 0 ? (
              <span
                aria-hidden
                className="absolute -top-1.5 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[0.6875rem] font-bold text-white ring-2 ring-white"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </span>
          <span className="hidden sm:inline">Cart</span>
        </Link>
      </div>
      {categories.length > 0 ? (
        <div className="mx-auto max-w-shop px-4 sm:px-6 lg:px-10">
          <CategoryNav categories={categories} />
        </div>
      ) : null}
    </HeaderShell>
  );
}
