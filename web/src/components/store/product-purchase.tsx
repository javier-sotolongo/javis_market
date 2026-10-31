"use client";

import { Check, LoaderCircle, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import type { Money } from "@javis-market/shared";
import { buttonClass } from "@/components/ui/button-class";
import { type ActionState, IDLE } from "@/lib/action-state";
import { Price } from "./price";
import { QuantityStepper } from "./quantity-stepper";
import { StockStatus } from "./stock-status";

interface PurchasableVariant {
  readonly id: string;
  readonly title: string;
  readonly sku: string;
  readonly price: Money;
  readonly compareAtPrice: Money | null;
  readonly available: number;
}

const MAX_PER_LINE = 20;

/** Precio, opción, cantidad y acción principal de la ficha. Solo envía variante y cantidad; el servidor valida. */
export function ProductPurchase({
  variants,
  addToCart,
}: {
  readonly variants: readonly PurchasableVariant[];
  readonly addToCart: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const firstAvailable = variants.find((v) => v.available > 0) ?? variants[0]!;
  const [variantId, setVariantId] = useState(firstAvailable.id);
  const [quantity, setQuantity] = useState(1);
  const [state, action, pending] = useActionState(addToCart, IDLE);
  const selected = variants.find((v) => v.id === variantId) ?? firstAvailable;
  const maxQuantity = Math.max(1, Math.min(selected.available, MAX_PER_LINE));
  const soldOut = selected.available === 0;
  const hasOptions = variants.length > 1;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(() => action(new FormData(event.currentTarget)));
      }}
    >
      <div>
        <Price price={selected.price} compareAt={selected.compareAtPrice} size="lg" />
        <StockStatus inStock={!soldOut} available={selected.available} className="mt-2" />
      </div>

      {hasOptions ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">
            Size / option: <span className="font-normal text-ink-muted">{selected.title}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <label
                key={variant.id}
                className={`flex min-h-11 cursor-pointer flex-col justify-center rounded-md border px-4 py-1.5 text-sm has-checked:border-brand has-checked:bg-brand-soft has-checked:ring-1 has-checked:ring-brand has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand ${
                  variant.available === 0 ? "border-line text-ink-subtle" : "border-line-strong text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="variantId"
                  value={variant.id}
                  checked={variant.id === variantId}
                  onChange={() => {
                    setVariantId(variant.id);
                    setQuantity(1);
                  }}
                  className="sr-only"
                />
                <span className="font-semibold">{variant.title}</span>
                {variant.available === 0 ? <span className="text-xs">Out of stock</span> : null}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="variantId" value={selected.id} />
      )}

      {soldOut ? (
        <button type="button" disabled className={`${buttonClass("secondary", "lg")} w-full`}>
          {hasOptions ? "This option is unavailable" : "Currently unavailable"}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <QuantityStepper
            id="quantity"
            name="quantity"
            value={Math.min(quantity, maxQuantity)}
            max={maxQuantity}
            onChange={setQuantity}
          />
          <button type="submit" disabled={pending} className={`${buttonClass("primary", "lg")} min-w-48 flex-1`}>
            {pending ? (
              <LoaderCircle aria-hidden className="size-5 animate-spin" />
            ) : (
              <ShoppingCart aria-hidden className="size-5" />
            )}
            {pending ? "Adding…" : "Add to cart"}
          </button>
        </div>
      )}

      <div aria-live="polite">
        {state.status === "error" ? (
          <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {state.message}
          </p>
        ) : null}
        {state.status === "success" ? (
          <p className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-success-soft px-4 py-3 text-sm font-medium text-success">
            <span className="flex items-center gap-2">
              <Check aria-hidden className="size-4" />
              Added to your cart.
            </span>
            <Link href="/cart" className="font-semibold underline underline-offset-4">
              View cart
            </Link>
          </p>
        ) : null}
      </div>

      <p className="text-xs text-ink-subtle">SKU: {selected.sku}</p>
    </form>
  );
}
