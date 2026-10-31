/** Monedas admitidas. La primera versión opera únicamente en dólares estadounidenses. */
export const SUPPORTED_CURRENCIES = ["USD"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

/** Importe monetario: siempre en centavos enteros y con moneda explícita. */
export interface Money {
  readonly amountCents: number;
  readonly currency: CurrencyCode;
}
