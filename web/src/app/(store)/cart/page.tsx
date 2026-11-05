import { ArrowLeft, CircleAlert, Info, ShoppingBag, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MAX_QUANTITY_PER_LINE, getCart } from "@javis-market/api";
import { formatMoney } from "@javis-market/shared";
import { CartLineQuantity } from "@/components/store/cart-line-quantity";
import { EmptyState } from "@/components/store/empty-state";
import { ProductImage } from "@/components/store/product-image";
import { ActionButton } from "@/components/ui/action-button";
import { buttonClass } from "@/components/ui/button-class";
import { getCartToken } from "@/lib/server/cart-cookie";
import { removeCartLineAction, updateCartLineAction } from "./actions";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default async function CartPage() {
  const cart = await getCart(await getCartToken());

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-shop px-4 pt-10 sm:px-6 lg:px-10">
        <h1 className="sr-only">Your cart</h1>
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          action={
            <Link href="/products" className={buttonClass("primary")}>
              Browse products
            </Link>
          }
        >
          Add products from the catalog and they will appear here.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-shop px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Your cart</h1>
          <p className="mt-2 text-ink-muted">
            {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-ink hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Continue shopping
        </Link>
      </div>

      {cart.hasIssues ? (
        <p
          role="status"
          className="mb-6 flex items-start gap-2 rounded-lg bg-warning-soft px-4 py-3 text-sm font-medium text-warning"
        >
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          Some items in your cart changed availability. Please review them below.
        </p>
      ) : null}

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <ul className="divide-y divide-line rounded-2xl bg-surface px-4 shadow-card sm:px-6">
          {cart.lines.map((line) => {
            const max = Math.max(1, Math.min(MAX_QUANTITY_PER_LINE, line.available));
            const unavailable = line.issue === "unavailable";
            return (
              <li key={line.id} className="flex gap-4 py-5 sm:gap-6">
                <Link
                  href={`/products/${line.productSlug}`}
                  tabIndex={-1}
                  aria-hidden
                  className={`relative size-24 shrink-0 overflow-hidden rounded-xl bg-tile sm:size-28 ${unavailable ? "opacity-50 grayscale" : ""}`}
                >
                  <ProductImage
                    image={line.imageUrl ? { url: line.imageUrl, alt: "", width: 0, height: 0 } : null}
                    sizes="112px"
                    className="p-[8%]"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/products/${line.productSlug}`}
                        className="line-clamp-2 font-semibold text-ink hover:underline"
                      >
                        {line.productName}
                      </Link>
                      <p className="mt-0.5 text-sm text-ink-subtle">
                        {line.variantTitle !== "Default" ? `${line.variantTitle} · ` : ""}
                        {formatMoney(line.unitPrice)} each
                      </p>
                    </div>
                    <p className="shrink-0 font-bold text-ink tabular-nums">
                      {unavailable ? "—" : formatMoney(line.lineTotal)}
                    </p>
                  </div>

                  {unavailable ? (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-danger">
                      <CircleAlert aria-hidden className="size-4" />
                      No longer available. Please remove it.
                    </p>
                  ) : null}
                  {line.issue === "insufficient_stock" ? (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-warning">
                      <CircleAlert aria-hidden className="size-4" />
                      Only {line.available} left. Please reduce the quantity.
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {unavailable ? (
                      <span />
                    ) : (
                      <CartLineQuantity
                        key={`${line.id}-${line.quantity}`}
                        action={updateCartLineAction.bind(null, line.id)}
                        lineId={line.id}
                        quantity={line.quantity}
                        max={max}
                        productName={line.productName}
                      />
                    )}
                    <ActionButton
                      action={removeCartLineAction.bind(null, line.id)}
                      variant="ghost"
                      className="-mr-2 min-h-10 px-2 text-sm"
                      title={`Remove ${line.productName}`}
                    >
                      <Trash2 aria-hidden className="size-4" />
                      <span className="sr-only sm:not-sr-only">Remove</span>
                    </ActionButton>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside aria-labelledby="summary-title" className="rounded-2xl bg-surface p-6 shadow-card lg:sticky lg:top-36">
          <h2 id="summary-title" className="text-lg font-bold text-ink">
            Order summary
          </h2>
          <dl className="mt-5 space-y-3 text-[0.9375rem]">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Items ({cart.itemCount})</dt>
              <dd className="font-semibold text-ink tabular-nums">{formatMoney(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Shipping</dt>
              <dd className="text-ink-muted">Calculated at checkout</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Taxes</dt>
              <dd className="text-ink-muted">Calculated at checkout</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
              <dt className="font-semibold text-ink">Subtotal</dt>
              <dd className="text-2xl font-bold text-ink tabular-nums">{formatMoney(cart.subtotal)}</dd>
            </div>
          </dl>
          <button type="button" disabled className={`${buttonClass("primary", "lg")} mt-6 w-full rounded-full`}>
            Checkout
          </button>
          <p className="mt-3 flex items-start gap-2 text-xs text-ink-muted">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            Online checkout is not available yet. Your cart is saved on this device.
          </p>
        </aside>
      </div>
    </div>
  );
}
