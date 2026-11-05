import { ArrowRight, PackageOpen } from "lucide-react";
import Link from "next/link";
import { type StoreImage, listStoreCategories, listStoreProducts } from "@javis-market/api";
import { EmptyState } from "@/components/store/empty-state";
import { ProductGrid } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";

/** Imagen decorativa (el nombre de la categoría ya da el texto del enlace). */
const decorative = (image: StoreImage | null) => (image ? { ...image, alt: "" } : null);

// Portada: bienvenida breve, accesos por categoría y una fila de productos reales por categoría.
export default async function HomePage() {
  const categories = await listStoreCategories();
  const rows = await Promise.all(
    categories.map(async (category) => ({
      category,
      products: await listStoreProducts({ categorySlug: category.slug, pageSize: 5 }),
    })),
  );
  const latest = categories.length === 0 ? await listStoreProducts({ pageSize: 10 }) : null;

  return (
    <div className="mx-auto max-w-shop px-4 sm:px-6 lg:px-10">
      <section className="relative mt-6 overflow-hidden rounded-2xl bg-navy text-white on-dark lg:mt-8">
        {/* Decoración de marca: el punto naranja de la "i" y las líneas de velocidad del carrito. */}
        <span aria-hidden className="absolute -top-16 -right-16 size-56 rounded-full bg-brand/15" />
        <span aria-hidden className="absolute -bottom-24 -left-20 size-64 rounded-full bg-leaf/15" />
        <div className="relative grid gap-8 px-6 py-9 sm:px-10 sm:py-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-14">
          <div>
            <p className="flex items-center gap-3 text-xs font-bold tracking-[0.22em] text-brand uppercase">
              <span aria-hidden className="h-0.5 w-8 rounded-full bg-brand" />
              Your best choice
            </p>
            <h1 className="mt-4 max-w-xl text-3xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-4xl lg:text-5xl">
              Everyday groceries and <span className="text-brand">home essentials</span>
            </h1>
            <p className="mt-4 max-w-lg text-steel">
              Pantry staples, drinks, snacks, household and personal care products. All prices in US dollars.
            </p>
            <div className="mt-7 flex items-center gap-3">
              <span aria-hidden className="flex flex-col items-end gap-1.5">
                <span className="h-1.5 w-7 rounded-full bg-white/70" />
                <span className="h-1.5 w-9 rounded-full bg-white/70" />
                <span className="h-1.5 w-6 rounded-full bg-white/70" />
              </span>
              <Link
                href="/products"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-6 font-bold text-brand-contrast shadow-raised transition-colors hover:bg-brand-hover active:bg-brand-active"
              >
                Shop all products
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </div>
          {rows.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Categories">
              {rows.slice(0, 6).map(({ category, products }) => (
                <li key={category.id}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="group block rounded-xl bg-surface p-2 text-ink transition-shadow hover:shadow-raised hover:ring-2 hover:ring-brand"
                  >
                    <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-tile">
                      <ProductImage
                        image={decorative(products.items.find((p) => p.image)?.image ?? null)}
                        sizes="160px"
                        className="p-[6%] transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    </span>
                    <span className="mt-2 block px-1 pb-0.5 text-sm font-semibold">{category.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {rows.map(({ category, products }) =>
        products.items.length > 0 ? (
          <section key={category.id} aria-labelledby={`row-${category.id}`} className="mt-14">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 id={`row-${category.id}`} className="text-2xl font-extrabold tracking-tight text-ink">
                {category.name}
              </h2>
              <Link
                href={`/categories/${category.slug}`}
                className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-ink hover:underline"
              >
                See all {category.productCount}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
            <ProductGrid products={products.items} columns="wide" />
          </section>
        ) : null,
      )}

      {latest ? (
        latest.items.length > 0 ? (
          <section className="mt-14">
            <h2 className="mb-5 text-2xl font-extrabold tracking-tight text-ink">New arrivals</h2>
            <ProductGrid products={latest.items} columns="wide" />
          </section>
        ) : (
          <div className="mt-14">
            <EmptyState icon={PackageOpen} title="No products available yet">
              Our catalog is being prepared. Please check back soon.
            </EmptyState>
          </div>
        )
      ) : null}
    </div>
  );
}
