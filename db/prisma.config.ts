import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

// En desarrollo las variables se leen del .env de la raíz del repositorio.
// En producción las inyecta el entorno (PM2 / shell), por lo que el archivo es opcional.
const rootEnvFile = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // `prisma generate` no necesita conexión; las migraciones sí requieren DATABASE_URL.
    url: process.env.DATABASE_URL ?? "",
  },
});
