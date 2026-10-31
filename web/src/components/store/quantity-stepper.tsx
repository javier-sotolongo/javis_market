"use client";

import { Minus, Plus } from "lucide-react";

/** Selector de cantidad con botones −/+ de 44 px y campo numérico accesible. */
export function QuantityStepper({
  value,
  max,
  onChange,
  id,
  label = "Quantity",
  name,
  disabled = false,
}: {
  readonly value: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
  readonly id: string;
  readonly label?: string;
  readonly name?: string;
  readonly disabled?: boolean;
}) {
  const clamp = (n: number) => Math.min(Math.max(1, Number.isFinite(n) ? Math.trunc(n) : 1), Math.max(1, max));
  const button =
    "text-ink hover:bg-canvas-muted flex size-11 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="inline-flex items-center rounded-md border border-line-strong bg-surface">
      <button
        type="button"
        className={`${button} rounded-l-md`}
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= 1}
        aria-label="Decrease quantity"
      >
        <Minus aria-hidden className="size-4" />
      </button>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(clamp(Number(event.target.value)))}
        className="h-11 w-12 [appearance:textfield] border-x-0 bg-transparent text-center text-base font-semibold text-ink focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        className={`${button} rounded-r-md`}
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        <Plus aria-hidden className="size-4" />
      </button>
    </div>
  );
}
