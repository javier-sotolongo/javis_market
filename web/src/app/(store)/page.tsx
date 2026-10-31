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
      <section className="mt-6 overflow-hidden rounded-2xl bg-brand text-white lg:mt-8">
        <div className="grid gap-8 px-6 py-9 sm:px-10 sm:py-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-14">
          <div>
            <p className="text-sm font-semibold tracking-wide text-white/70">Javis Market</p>
            <h1 className="mt-2 max-w-xl text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem]">
              Everyday groceries and home essentials
            </h1>
            <p className="mt-4 max-w-lg text-white/80">
              Pantry staples, drinks, snacks, household and personal care products. All prices in US dollars.
            </p>
            <Link
              href="/products"
              className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-brand transition-colors hover:bg-white/90"
            >
              Shop all products
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          {rows.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Categories">
              {rows.slice(0, 6).map(({ category, products }) => (
                <li key={category.id}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="group block rounded-xl bg-white/10 p-2 transition-colors hover:bg-white/20"
                  >
                    <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-tile">
                      <ProductImage
                        image={decorative(products.items.find((p) => p.image)?.image ?? null)}
                        sizes="160px"
                        className="p-[6%]"
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
              <h2 id={`row-${category.id}`} className="text-2xl font-bold tracking-tight text-ink">
                {category.name}
              </h2>
              <Link
                href={`/categories/${category.slug}`}
                className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand hover:underline"
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
            <h2 className="mb-5 text-2xl font-bold tracking-tight text-ink">New arrivals</h2>
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
