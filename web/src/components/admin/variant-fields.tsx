import { centsToDecimalString } from "@javis-market/shared";
import { TextField } from "@/components/ui/fields";

interface VariantDefaults {
  readonly sku: string;
  readonly title: string;
  readonly priceCents: number;
  readonly compareAtPriceCents: number | null;
  readonly costCents: number | null;
  readonly weightGrams: number | null;
}

const decimal = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? "" : centsToDecimalString(cents);

/** Campos de una variante (SKU y precios). Los importes se escriben en dólares y se guardan en centavos. */
export function VariantFields({
  defaults,
  idPrefix = "",
  compact = false,
}: {
  readonly defaults?: VariantDefaults;
  readonly idPrefix?: string;
  readonly compact?: boolean;
}) {
  const id = (name: string) => (idPrefix ? `${idPrefix}-${name}` : name);
  return (
    <div className={compact ? "grid gap-3" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
      <TextField
        label="SKU"
        name="sku"
        id={id("sku")}
        required
        defaultValue={defaults?.sku}
        autoCapitalize="characters"
      />
      <TextField
        label="Option name"
        name="title"
        id={id("title")}
        defaultValue={defaults?.title === "Default" ? "" : defaults?.title}
        placeholder="e.g. 500 g, Large"
        hint="Leave empty if the product has a single option."
      />
      <TextField
        label="Price (USD)"
        name="price"
        id={id("price")}
        required
        inputMode="decimal"
        placeholder="0.00"
        defaultValue={decimal(defaults?.priceCents)}
      />
      <TextField
        label="Compare-at price (USD)"
        name="compareAtPrice"
        id={id("compareAtPrice")}
        inputMode="decimal"
        placeholder="Optional"
        defaultValue={decimal(defaults?.compareAtPriceCents)}
        hint="Shown crossed out."
      />
      <TextField
        label="Cost (USD)"
        name="cost"
        id={id("cost")}
        inputMode="decimal"
        placeholder="Optional"
        defaultValue={decimal(defaults?.costCents)}
        hint="Internal only."
      />
      <TextField
        label="Weight (grams)"
        name="weightGrams"
        id={id("weightGrams")}
        inputMode="numeric"
        placeholder="Optional"
        defaultValue={defaults?.weightGrams ?? ""}
      />
    </div>
  );
}
