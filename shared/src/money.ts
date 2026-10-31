/** Monedas admitidas. La primera versión opera únicamente en dólares estadounidenses. */
export const SUPPORTED_CURRENCIES = ["USD"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

/** Importe monetario: siempre en centavos enteros y con moneda explícita. */
export interface Money {
  readonly amountCents: number;
  readonly currency: CurrencyCode;
}

export function money(amountCents: number, currency: CurrencyCode = "USD"): Money {
  if (!Number.isSafeInteger(amountCents)) {
    throw new RangeError(`Money amount must be an integer number of cents, got ${amountCents}`);
  }
  return { amountCents, currency };
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add ${a.currency} and ${b.currency}`);
  }
  return money(a.amountCents + b.amountCents, a.currency);
}

export function multiplyMoney(value: Money, quantity: number): Money {
  if (!Number.isSafeInteger(quantity)) {
    throw new RangeError(`Quantity must be an integer, got ${quantity}`);
  }
  return money(value.amountCents * quantity, value.currency);
}

export function sumMoney(values: readonly Money[], currency: CurrencyCode = "USD"): Money {
  return values.reduce(addMoney, money(0, currency));
}

const DECIMAL_AMOUNT = /^(\d{1,9})(?:\.(\d{1,2}))?$/;

/**
 * Convierte un importe decimal escrito por una persona ("12.5", "12.50", "1299") a centavos,
 * sin aritmética de coma flotante. Devuelve `null` si el texto no es un importe válido.
 */
export function parseDecimalToCents(input: string): number | null {
  const match = DECIMAL_AMOUNT.exec(input.trim().replace(/^\$/, "").replaceAll(",", ""));
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  return whole * 100 + fraction;
}

/** Representación decimal sin símbolo ("12.50"), útil para rellenar formularios. */
export function centsToDecimalString(amountCents: number): string {
  const sign = amountCents < 0 ? "-" : "";
  const abs = Math.abs(amountCents);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

const formatters = new Map<CurrencyCode, Intl.NumberFormat>();

/** Formato para mostrar (solo en la capa de interfaz). */
export function formatMoney(value: Money): string {
  let formatter = formatters.get(value.currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: value.currency });
    formatters.set(value.currency, formatter);
  }
  return formatter.format(value.amountCents / 100);
}
