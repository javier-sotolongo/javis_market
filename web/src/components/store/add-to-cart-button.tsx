"use client";

import { Check, LoaderCircle, Plus } from "lucide-react";
import { startTransition, useActionState, useEffect, useState } from "react";
import { type ActionState, IDLE } from "@/lib/action-state";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Botón compacto "+ Add" de la tarjeta: añade una unidad. Muestra carga, confirmación temporal y errores reales
 * del servidor (p. ej. límite de stock). El contador del carrito se actualiza al revalidar la página.
 */
export function AddToCartButton({
  action,
  variantId,
  productName,
}: {
  readonly action: Action;
  readonly variantId: string;
  readonly productName: string;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  // Confirmación temporal: visible tras un éxito hasta que el temporizador la descarta.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const successAt = state.status === "success" ? state.at : null;
  const justAdded = successAt !== null && dismissedAt !== successAt;
  const error = state.status === "error" ? state.message : null;

  useEffect(() => {
    if (successAt === null) return;
    const timer = setTimeout(() => setDismissedAt(successAt), 2500);
    return () => clearTimeout(timer);
  }, [successAt]);

  return (
    <form
      className="flex flex-col items-end"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(() => formAction(new FormData(event.currentTarget)));
      }}
    >
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="quantity" value="1" />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Add ${productName} to cart`}
        className={`inline-flex h-10 items-center gap-1.5 rounded-full pr-4 pl-3 text-sm font-semibold text-brand-contrast shadow-raised transition-colors disabled:cursor-wait ${
          justAdded ? "bg-brand-active" : "bg-brand hover:bg-brand-hover active:bg-brand-active"
        }`}
      >
        {pending ? (
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
        ) : justAdded ? (
          <Check aria-hidden className="size-4" />
        ) : (
          <Plus aria-hidden className="size-4" strokeWidth={2.5} />
        )}
        {justAdded ? "Added" : "Add"}
      </button>
      {error ? (
        <p
          role="alert"
          className="mt-1.5 max-w-44 rounded-md bg-white px-2 py-1 text-right text-xs font-medium text-danger shadow-sm"
        >
          {error}
        </p>
      ) : null}
      <span aria-live="polite" className="sr-only">
        {justAdded ? `${productName} added to cart` : ""}
      </span>
    </form>
  );
}
