import { formatMoney, type Money } from "@javis-market/shared";

/** Precio en USD. `from` indica que hay variantes con precios distintos (se muestra el mínimo). */
export function Price({
  price,
  from = false,
  compareAt = null,
  size = "md",
}: {
  readonly price: Money;
  readonly from?: boolean;
  readonly compareAt?: Money | null;
  readonly size?: "md" | "lg";
}) {
  const showCompare = compareAt !== null && compareAt.amountCents > price.amountCents;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      {from ? <span className="text-sm font-medium text-ink-subtle">From</span> : null}
      <span className={size === "lg" ? "text-3xl font-bold tracking-tight text-ink" : "text-lg font-bold text-ink"}>
        {formatMoney(price)}
      </span>
      {showCompare ? (
        <span className="text-base text-ink-subtle">
          <span className="sr-only">Regular price </span>
          <s>{formatMoney(compareAt)}</s>
        </span>
      ) : null}
    </p>
  );
}
