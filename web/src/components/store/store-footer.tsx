import Link from "next/link";
import { BRAND_NAME } from "@javis-market/shared";
import { Wordmark } from "./store-header";

export function StoreFooter({
  categories,
}: {
  readonly categories: readonly { readonly id: string; readonly name: string; readonly slug: string }[];
}) {
  const link = "text-titanium hover:text-white hover:underline underline-offset-4";
  return (
    <footer className="mt-20 bg-graphite text-white on-dark">
      <div className="mx-auto grid max-w-shop gap-10 px-4 py-12 sm:grid-cols-[2fr_1fr_1fr] sm:px-6 lg:px-10">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-sm text-sm text-titanium">
            Online store for the United States. All prices are in US dollars (USD).
          </p>
        </div>
        <nav aria-label="Shop">
          <h2 className="text-sm font-semibold">Shop</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/products" className={link}>
                All products
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.id}>
                <Link href={`/categories/${category.slug}`} className={link}>
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Your order">
          <h2 className="text-sm font-semibold">Your order</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/cart" className={link}>
                Cart
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-shop px-4 py-5 text-xs text-titanium sm:px-6 lg:px-10">
          © {new Date().getFullYear()} {BRAND_NAME}
        </p>
      </div>
    </footer>
  );
}
