import type { ReactNode } from "react";
import { getCartItemCount, listStoreCategories } from "@javis-market/api";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";
import { getCartToken } from "@/lib/server/cart-cookie";

// La tienda se renderiza por petición (catálogo, stock y carrito vivos); la compilación no consulta la base de datos.
export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { readonly children: ReactNode }) {
  const [categories, cartCount] = await Promise.all([listStoreCategories(), getCartToken().then(getCartItemCount)]);
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-brand px-4 py-2 font-semibold text-brand-contrast focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <StoreHeader categories={categories} cartCount={cartCount} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <StoreFooter categories={categories} />
    </div>
  );
}
