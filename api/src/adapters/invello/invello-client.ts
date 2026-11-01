import { optionalEnv } from "../../config/env";

/**
 * Cliente de la API pública de catálogo de Invello (v1, solo lectura).
 * Documentación: https://app.invello.com/api/public/v1/docs/en
 *
 * La API key solo se usa desde el servidor y nunca se registra en logs.
 */

const DEFAULT_BASE_URL = "https://api.invello.com/api/public/v1";
const TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 5;
export const INVELLO_PAGE_SIZE = 500;

export interface InvelloPermissions {
  readonly catalog: boolean;
  readonly prices: boolean;
  readonly stock: boolean;
  readonly category_ids: readonly number[] | null;
}

export interface InvelloMe {
  readonly organization: { readonly id: number; readonly name: string };
  readonly api_key: { readonly name: string; readonly key_prefix: string; readonly expires_at: string | null };
  readonly permissions: InvelloPermissions;
}

/** Producto tal como lo devuelve la API. Los campos que no se usan se ignoran. */
export interface InvelloProductDto {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly description: string | null;
  readonly brand: string | null;
  readonly upc: string | null;
  readonly category: { readonly id: number; readonly name: string } | null;
  readonly unit: string | null;
  readonly units_per_case: number | null;
  readonly weight_kg: number | null;
  readonly images: readonly string[];
  readonly active: boolean;
  readonly updated_at: string;
  /** Ausente si la key no comparte precios. */
  readonly prices?: { readonly unit: number | null; readonly map: number | null };
  /** Ausente si la key no comparte existencias. */
  readonly stock?: { readonly available: number };
}

export interface InvelloStockDto {
  readonly sku: string;
  readonly available: number;
  readonly active: boolean;
  readonly updated_at: string;
}

interface PageDto<T> {
  readonly data: readonly T[];
  readonly next_cursor: string | null;
}

/** Error devuelto por Invello. `code` es estable (p. ej. `API_KEY_INVALID`, `STOCK_NOT_SHARED`). */
export class InvelloApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "InvelloApiError";
    this.status = status;
    this.code = code;
  }
}

export interface InvelloClient {
  me(signal?: AbortSignal): Promise<InvelloMe>;
  /** Recorre todas las páginas de `/products`. Sin `updatedSince` solo devuelve productos activos. */
  products(options?: { updatedSince?: Date; signal?: AbortSignal }): AsyncGenerator<readonly InvelloProductDto[]>;
  /** Recorre todas las páginas de `/stock`. */
  stock(options?: { updatedSince?: Date; signal?: AbortSignal }): AsyncGenerator<readonly InvelloStockDto[]>;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });

export function createInvelloClient(apiKey: string, baseUrl = DEFAULT_BASE_URL): InvelloClient {
  const base = baseUrl.replace(/\/+$/, "");

  async function get<T>(path: string, params: Record<string, string | undefined>, signal?: AbortSignal): Promise<T> {
    const url = new URL(base + path);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
    for (let attempt = 1; ; attempt++) {
      const timeout = AbortSignal.timeout(TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        });
      } catch (error) {
        if (signal?.aborted || attempt >= MAX_ATTEMPTS) throw error;
        await sleep(2 ** attempt * 1000, signal);
        continue;
      }
      // 429 y 5xx son temporales: se reintenta respetando RateLimit-Reset o con espera exponencial.
      if ((response.status === 429 || response.status >= 500) && attempt < MAX_ATTEMPTS) {
        const reset = Number(response.headers.get("RateLimit-Reset"));
        await response.body?.cancel();
        await sleep((reset > 0 ? reset : 2 ** attempt) * 1000, signal);
        continue;
      }
      const body = (await response.json().catch(() => null)) as (T & { error?: string; code?: string }) | null;
      if (!response.ok || body === null) {
        throw new InvelloApiError(
          response.status,
          body?.code ?? "UNKNOWN",
          body?.error ?? `Invello responded with HTTP ${response.status}.`,
        );
      }
      return body;
    }
  }

  async function* paginate<T>(
    path: string,
    options: { updatedSince?: Date; signal?: AbortSignal },
  ): AsyncGenerator<readonly T[]> {
    let cursor: string | undefined;
    do {
      const page = await get<PageDto<T>>(
        path,
        {
          limit: String(INVELLO_PAGE_SIZE),
          cursor,
          updated_since: options.updatedSince?.toISOString(),
        },
        options.signal,
      );
      yield page.data;
      cursor = page.next_cursor ?? undefined;
    } while (cursor);
  }

  return {
    me: (signal) => get<InvelloMe>("/me", {}, signal),
    products: (options = {}) => paginate<InvelloProductDto>("/products", options),
    stock: (options = {}) => paginate<InvelloStockDto>("/stock", options),
  };
}

/** Cliente configurado con `INVELLO_API_KEY` (y opcionalmente `INVELLO_API_BASE_URL`), o `null` si no hay key. */
export function getInvelloClient(): InvelloClient | null {
  const apiKey = optionalEnv("INVELLO_API_KEY");
  if (!apiKey) return null;
  return createInvelloClient(apiKey, optionalEnv("INVELLO_API_BASE_URL"));
}
