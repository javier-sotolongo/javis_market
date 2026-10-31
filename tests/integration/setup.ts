import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { afterAll, beforeEach } from "vitest";

const rootEnv = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

// Cada archivo de pruebas usa la base de datos de pruebas y un almacenamiento temporal propio.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.AUTH_SECRET ||= "integration-test-secret-integration-test-secret";
process.env.PUBLIC_SITE_URL = "http://localhost:3000";
const storageRoot = mkdtempSync(path.join(tmpdir(), "javis-test-storage-"));
process.env.STORAGE_PUBLIC_DIR = path.join(storageRoot, "public");
process.env.STORAGE_PRIVATE_DIR = path.join(storageRoot, "private");

const { getPrisma, disconnectPrisma } = await import("@javis-market/db");

beforeEach(async () => {
  const tables = await getPrisma().$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  if (list) await getPrisma().$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await disconnectPrisma();
});

export { storageRoot };
