import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

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

let repoRoot: string | undefined;

/**
 * Raíz del monorepo (carpeta cuyo package.json se llama `javis-market`), buscada desde el directorio de trabajo.
 * Sirve para resolver rutas relativas de desarrollo igual desde `web/`, `worker/` o la raíz.
 */
export function getRepoRoot(): string {
  if (repoRoot) return repoRoot;
  let current = process.cwd();
  for (;;) {
    const candidate = path.join(current, "package.json");
    if (existsSync(candidate) && JSON.parse(readFileSync(candidate, "utf8")).name === "javis-market") {
      repoRoot = current;
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      repoRoot = process.cwd();
      return repoRoot;
    }
    current = parent;
  }
}

/** Resuelve una ruta de configuración: las absolutas se respetan; las relativas parten de la raíz del repositorio. */
export function resolveConfiguredPath(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(getRepoRoot(), value);
}
