import { CircleAlert, CircleCheck, CircleX } from "lucide-react";

/**
 * Disponibilidad comunicada con icono y texto (no solo color).
 * `available` es la cantidad real disponible; solo se muestra en la ficha cuando quedan pocas unidades.
 */
export function StockStatus({
  inStock,
  available,
  className = "",
}: {
  readonly inStock: boolean;
  readonly available?: number;
  readonly className?: string;
}) {
  if (!inStock) {
    return (
      <p className={`flex items-center gap-1.5 text-sm font-medium text-ink-muted ${className}`}>
        <CircleX aria-hidden className="size-4 shrink-0" />
        Out of stock
      </p>
    );
  }
  if (available !== undefined && available <= 5) {
    return (
      <p className={`flex items-center gap-1.5 text-sm font-medium text-warning ${className}`}>
        <CircleAlert aria-hidden className="size-4 shrink-0" />
        Only {available} left
      </p>
    );
  }
  return (
    <p className={`flex items-center gap-1.5 text-sm font-medium text-success ${className}`}>
      <CircleCheck aria-hidden className="size-4 shrink-0" />
      In stock
    </p>
  );
}
