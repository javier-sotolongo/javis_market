import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";

export const E2E_ADMIN = { email: "owner@e2e.test", password: "e2e owner password" };

/**
 * Aplica las migraciones pendientes y vacía las tablas de la base de datos e2e (solo si su nombre contiene "test"),
 * limpia el almacenamiento e2e y crea el administrador de prueba.
 */
export default function globalSetup() {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) throw new Error("E2E_DATABASE_URL is required for e2e tests (see .env.example).");
  if (!new URL(url).pathname.includes("test"))
    throw new Error("E2E_DATABASE_URL must point to a database whose name contains 'test'.");

  const env = { ...process.env, DATABASE_URL: url };
  execFileSync("npx", ["prisma", "migrate", "deploy"], { cwd: "db", env, stdio: "inherit" });
  execFileSync("node", ["--import", "tsx", "--conditions=react-server", "tests/support/truncate.ts"], {
    env,
    stdio: "inherit",
  });
  rmSync("storage/e2e", { recursive: true, force: true });
  execFileSync(
    "node",
    [
      "--import",
      "tsx",
      "--conditions=react-server",
      "api/src/cli/admin.ts",
      "create",
      "--email",
      E2E_ADMIN.email,
      "--name",
      "E2E Owner",
    ],
    { env: { ...env, ADMIN_PASSWORD: E2E_ADMIN.password }, stdio: "inherit" },
  );
}
