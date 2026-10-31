import { BRAND_NAME } from "@javis-market/shared";
import { getAppEnvironment } from "../config/env";

export interface HealthStatus {
  readonly status: "ok";
  readonly service: string;
  readonly environment: string;
  readonly time: string;
}

/**
 * Comprobación de vida del proceso. No consulta la base de datos ni proveedores externos:
 * solo indica que la aplicación responde. Las comprobaciones de dependencias se añadirán
 * como un chequeo de disponibilidad separado.
 */
export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    service: BRAND_NAME,
    environment: getAppEnvironment(),
    time: new Date().toISOString(),
  };
}
