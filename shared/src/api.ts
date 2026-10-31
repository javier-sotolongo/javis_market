/** Forma común de los errores devueltos por las rutas `/api/v1` (ver docs/api-conventions.md). */
export interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly requestId?: string;
    readonly details?: readonly { readonly path: string; readonly message: string }[];
  };
}
