/**
 * Errores de dominio. Los servicios los lanzan; la capa web los traduce a HTTP o a mensajes de formulario
 * (docs/api-conventions.md#errores). `message` es apto para mostrar al usuario.
 */
export type DomainErrorCode =
  | "validation_failed"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "insufficient_stock"
  | "invalid_state"
  | "payload_too_large"
  | "business_rule_violation";

export interface FieldIssue {
  readonly path: string;
  readonly message: string;
}

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details: readonly FieldIssue[];

  constructor(code: DomainErrorCode, message: string, details: readonly FieldIssue[] = []) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

export const notFound = (what: string) => new DomainError("not_found", `${what} not found.`);

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

const HTTP_STATUS: Record<DomainErrorCode, number> = {
  validation_failed: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  insufficient_stock: 409,
  invalid_state: 409,
  payload_too_large: 413,
  business_rule_violation: 422,
};

export function httpStatusFor(error: DomainError): number {
  return HTTP_STATUS[error.code];
}
