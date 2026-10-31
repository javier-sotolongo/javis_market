import "server-only";

// Superficie pública del paquete interno de negocio. Web y worker importan solo desde aquí.

export { getAppEnvironment, optionalEnv, requireEnv } from "./config/env";
export type { AppEnvironment } from "./config/env";
export { getHealthStatus } from "./infrastructure/health";
export type { HealthStatus } from "./infrastructure/health";
export { createLogger } from "./infrastructure/logger";
export type { Logger } from "./infrastructure/logger";

export type { EmailMessage, EmailProvider } from "./adapters/email/email-provider";
export type { PaymentProvider, PaymentProviderEvent } from "./adapters/payments/payment-provider";
export type { FileStorage, StorageVisibility } from "./adapters/storage/file-storage";
