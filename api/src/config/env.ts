/**
 * Lectura centralizada de la configuración del servidor.
 *
 * Los valores se leen bajo demanda, no al importar el módulo, para que la compilación
 * no requiera credenciales. Cada adaptador valida lo que necesita en el momento de usarse.
 */

export type AppEnvironment = "development" | "test" | "production";

export function getAppEnvironment(): AppEnvironment {
  const value = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
  if (value === "production" || value === "test") {
    return value;
  }
  return "development";
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? undefined : value;
}
