import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { CategoryNav } from "./category-nav";
import { HeaderShell } from "./header-shell";
import { SearchForm } from "./search-form";

/** Logo enlazado a la portada. `tone="reversed"` para fondos azul marino (pie). */
export function Wordmark({
  tone = "color",
  variant = "wordmark",
  className = "h-11 w-auto md:h-14",
}: {
  readonly tone?: "color" | "reversed";
  readonly variant?: "wordmark" | "full";
  readonly className?: string;
}) {
  return (
    <Link href="/" className="flex shrink-0 items-center" aria-label="Javis Market home">
      <Logo tone={tone} variant={variant} className={className} priority={tone === "color"} />
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
      {/* Franja naranja superior: eco de las líneas del lema del logo. */}
      <div aria-hidden className="h-1 bg-brand" />
      <div className="bg-surface">
        <div className="mx-auto grid max-w-shop grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 pt-2.5 pb-3 sm:px-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-10 md:py-3 lg:px-10">
          <Wordmark />
          <div className="col-span-2 row-start-2 md:col-span-1 md:col-start-2 md:row-start-1 md:max-w-3xl">
            <SearchForm />
          </div>
          <Link
            href="/cart"
            className="relative flex h-11 items-center gap-2 rounded-full bg-navy px-3.5 text-[0.9375rem] font-bold text-white shadow-card transition-colors hover:bg-navy-raised sm:px-5 md:col-start-3"
            aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
          >
            <span className="relative">
              <ShoppingCart aria-hidden className="size-[1.375rem]" strokeWidth={2.25} />
              {cartCount > 0 ? (
                <span
                  aria-hidden
                  className="absolute -top-2.5 -right-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[0.6875rem] font-extrabold text-brand-contrast ring-2 ring-navy"
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </span>
            <span className="hidden sm:inline">Cart</span>
          </Link>
        </div>
      </div>
      {categories.length > 0 ? (
        <div className="bg-navy on-dark">
          <div className="mx-auto max-w-shop px-4 sm:px-6 lg:px-10">
            <CategoryNav categories={categories} />
          </div>
        </div>
      ) : null}
    </HeaderShell>
  );
}
