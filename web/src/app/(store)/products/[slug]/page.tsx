import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreProduct, listStoreProducts } from "@javis-market/api";
import { ProductGrid } from "@/components/store/product-card";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchase } from "@/components/store/product-purchase";
import { addToCartAction } from "../../cart/actions";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getStoreProduct((await params).slug);
  if (!product) return { title: "Product not found" };
  const image = product.images[0];
  return {
    title: product.name,
    description: product.description.slice(0, 160) || undefined,
    ...(image ? { openGraph: { images: [{ url: image.url, width: image.width, height: image.height }] } } : {}),
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getStoreProduct((await params).slug);
  if (!product) notFound();
  const category = product.categories[0];
  const related = category
    ? await listStoreProducts({ categorySlug: category.slug, excludeId: product.id, pageSize: 5 })
    : null;

  return (
    <div className="mx-auto max-w-shop px-4 pt-5 sm:px-6 lg:px-10 lg:pt-8">
      <nav aria-label="Breadcrumb" className="mb-5">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
          <li className="flex items-center gap-1">
            <Link href="/" className="hover:text-ink hover:underline">
              Home
            </Link>
            <ChevronRight aria-hidden className="size-4" />
          </li>
          <li className="flex items-center gap-1">
            <Link
              href={category ? `/categories/${category.slug}` : "/products"}
              className="hover:text-ink hover:underline"
            >
              {category ? category.name : "All products"}
            </Link>
            <ChevronRight aria-hidden className="size-4" />
          </li>
          <li aria-current="page" className="max-w-[16rem] truncate text-ink">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
        <ProductGallery images={product.images} name={product.name} />
        <div className="min-w-0">
          {product.brand ? <p className="text-[0.9375rem] font-semibold text-brand">{product.brand}</p> : null}
          <h1 className="mt-1 text-2xl leading-tight font-bold tracking-tight text-balance text-ink sm:text-3xl lg:text-4xl">
            {product.name}
          </h1>
          {product.variants.length === 1 && product.variants[0]!.title !== "Default" ? (
            <p className="mt-1 text-base text-ink-muted">{product.variants[0]!.title}</p>
          ) : null}
          <div className="mt-6 border-t border-line pt-6">
            <ProductPurchase variants={product.variants} addToCart={addToCartAction} />
          </div>
          {product.description ? (
            <section aria-labelledby="description-title" className="mt-8 border-t border-line pt-6">
              <h2 id="description-title" className="text-base font-semibold text-ink">
                About this product
              </h2>
              <div className="mt-3 leading-relaxed whitespace-pre-line text-ink-muted">{product.description}</div>
            </section>
          ) : null}
        </div>
      </div>

      {related && related.items.length > 0 ? (
        <section aria-labelledby="related-title" className="mt-20">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 id="related-title" className="text-2xl font-bold tracking-tight text-ink">
              More in {category!.name}
            </h2>
            <Link
              href={`/categories/${category!.slug}`}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
            >
              View all
            </Link>
          </div>
          <ProductGrid products={related.items} columns="wide" />
        </section>
      ) : null}
    </div>
  );
}
