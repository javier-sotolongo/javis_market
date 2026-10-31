import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Prepara la base de datos de pruebas aplicando las migraciones. Exige TEST_DATABASE_URL y se niega a usar
 * una base de datos cuyo nombre no contenga "test", para no borrar nunca datos reales.
 */
export default function setup() {
  const rootEnv = fileURLToPath(new URL("../../.env", import.meta.url));
  if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is required for integration tests (see .env.example).");
  }
  if (!new URL(url).pathname.includes("test")) {
    throw new Error("TEST_DATABASE_URL must point to a database whose name contains 'test'.");
  }
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: fileURLToPath(new URL("../../db", import.meta.url)),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}
