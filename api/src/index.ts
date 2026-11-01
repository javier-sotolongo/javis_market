import "server-only";

// Superficie pública del paquete interno de negocio. Web y worker importan solo desde aquí.

export { getAppEnvironment, optionalEnv, requireEnv } from "./config/env";
export type { AppEnvironment } from "./config/env";
export { DomainError, httpStatusFor, isDomainError } from "./infrastructure/errors";
export type { DomainErrorCode, FieldIssue } from "./infrastructure/errors";
export { getHealthStatus } from "./infrastructure/health";
export type { HealthStatus } from "./infrastructure/health";
export { createLogger } from "./infrastructure/logger";
export type { Logger } from "./infrastructure/logger";
export type { Page } from "./infrastructure/pagination";

export type { EmailMessage, EmailProvider } from "./adapters/email/email-provider";
export type { PaymentProvider, PaymentProviderEvent } from "./adapters/payments/payment-provider";
export { getFileStorage, isValidStorageKey } from "./adapters/storage";
export type { FileStorage, StorageVisibility } from "./adapters/storage";

export * from "./modules/access";
export * from "./modules/cart";
export * from "./modules/catalog";
export * from "./modules/inventory";
export * from "./modules/integrations";
