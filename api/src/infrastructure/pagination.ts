export interface Page<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export function normalizePage(page: unknown, pageSize: number): { page: number; skip: number; take: number } {
  const parsed = typeof page === "number" ? page : Number.parseInt(String(page ?? "1"), 10);
  const safe = Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 10_000) : 1;
  return { page: safe, skip: (safe - 1) * pageSize, take: pageSize };
}

export function toPage<T>(items: readonly T[], page: number, pageSize: number, totalItems: number): Page<T> {
  return { items, page, pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) };
}
