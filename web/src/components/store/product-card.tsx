import Link from "next/link";
import type { ProductCard as ProductCardData } from "@javis-market/api";
import { formatMoney } from "@javis-market/shared";
import { addToCartAction } from "@/app/(store)/cart/actions";
import { AddToCartButton } from "./add-to-cart-button";
import { ProductImage } from "./product-image";

const CARD_IMAGE_SIZES = "(min-width: 1536px) 18vw, (min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw";

/**
 * Tarjeta de producto. La baldosa y el nombre enlazan a la ficha; la acción de compra ("+ Add" u "Options") es un
 * control hermano superpuesto a la baldosa, nunca anidado dentro del enlace. Sin stock no hay acción de compra.
 */
export function ProductCard({
  product,
  priority = false,
}: {
  readonly product: ProductCardData;
  readonly priority?: boolean;
}) {
  const href = `/products/${product.slug}`;
  const meta = [
    product.brand,
    product.presentation ?? (product.variantCount > 1 ? `${product.variantCount} sizes` : null),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group flex h-full flex-col">
      <div className="relative">
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden
          className="relative block aspect-square overflow-hidden rounded-xl bg-tile"
        >
          <ProductImage
            image={product.image}
            sizes={CARD_IMAGE_SIZES}
            priority={priority}
            className={`p-[7%] transition-transform duration-300 group-hover:scale-[1.03] ${product.inStock ? "" : "opacity-50 grayscale"}`}
          />
        </Link>
        {!product.inStock ? (
          <span className="absolute top-3 left-3 rounded-md bg-ink/85 px-2 py-1 text-xs font-semibold text-white">
            Out of stock
          </span>
        ) : null}
        <div className="absolute right-3 bottom-3">
          {!product.inStock ? null : product.quickAddVariantId ? (
            <AddToCartButton
              action={addToCartAction}
              variantId={product.quickAddVariantId}
              productName={product.name}
            />
          ) : (
            <Link
              href={href}
              aria-label={`Choose a size for ${product.name}`}
              className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)] transition-colors hover:bg-ink hover:text-white"
            >
              Options
            </Link>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col px-0.5">
        <p className="text-[1.0625rem] font-bold text-ink tabular-nums">
          {product.hasPriceRange ? <span className="mr-1 text-sm font-medium text-ink-muted">From</span> : null}
          {formatMoney(product.price)}
        </p>
        <h3 className="mt-0.5 line-clamp-2 text-[0.9375rem] leading-snug text-ink">
          <Link href={href} className="hover:underline">
            {product.name}
          </Link>
        </h3>
        {meta ? <p className="mt-1 truncate text-sm text-ink-subtle">{meta}</p> : null}
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  priorityCount = 0,
  columns = "catalog",
}: {
  readonly products: readonly ProductCardData[];
  readonly priorityCount?: number;
  /** "catalog": junto a la barra lateral; "wide": a todo el ancho (portada, relacionados). */
  readonly columns?: "catalog" | "wide";
}) {
  const grid =
    columns === "wide"
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";
  return (
    <ul className={`grid ${grid} gap-x-4 gap-y-8 sm:gap-x-5 sm:gap-y-10`}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
