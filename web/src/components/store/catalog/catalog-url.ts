/** Parámetros del catálogo en la URL. Todos opcionales; se omiten los valores por defecto para URLs limpias. */
export interface CatalogParams {
  readonly q?: string | undefined;
  readonly sort?: string | undefined;
  readonly stock?: string | undefined;
  readonly page?: string | undefined;
}

export function catalogHref(
  basePath: string,
  params: CatalogParams,
  overrides: Partial<Record<keyof CatalogParams, string | undefined>> = {},
): string {
  const merged = { ...params, page: undefined, ...overrides };
  const search = new URLSearchParams();
  if (merged.q) search.set("q", merged.q);
  if (merged.sort && merged.sort !== "newest") search.set("sort", merged.sort);
  if (merged.stock === "in") search.set("stock", "in");
  if (merged.page && merged.page !== "1") search.set("page", merged.page);
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
