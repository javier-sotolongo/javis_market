"use client";

import { LoaderCircle } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { type ActionState, IDLE } from "@/lib/action-state";
import { QuantityStepper } from "./quantity-stepper";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** Cantidad de una línea del carrito: cada cambio se guarda en el servidor, que valida el stock. */
export function CartLineQuantity({
  action,
  lineId,
  quantity,
  max,
  productName,
}: {
  readonly action: Action;
  readonly lineId: string;
  readonly quantity: number;
  readonly max: number;
  readonly productName: string;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  // El padre usa `key` con la cantidad guardada, así este estado se reinicia cuando cambia en el servidor.
  const [value, setValue] = useState(quantity);

  const save = (next: number) => {
    setValue(next);
    const formData = new FormData();
    formData.set("quantity", String(next));
    startTransition(() => formAction(formData));
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <QuantityStepper
          id={`qty-${lineId}`}
          label={`Quantity of ${productName}`}
          value={value}
          max={max}
          onChange={save}
          disabled={pending}
        />
        {pending ? <LoaderCircle aria-label="Updating" className="size-4 animate-spin text-ink-subtle" /> : null}
      </div>
      {state.status === "error" ? (
        <p role="alert" className="mt-1 text-xs font-medium text-danger">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
