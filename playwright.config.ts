import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas e2e contra la compilación de producción (`npm run build` antes) y una base de datos propia
 * (E2E_DATABASE_URL, cuyo nombre debe contener "test"; se vacía en cada ejecución).
 */
if (existsSync(".env")) process.loadEnvFile(".env");

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Chromium de Playwright (`npx playwright install chromium`); E2E_BROWSER_CHANNEL=chrome usa el Chrome del sistema.
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.E2E_BROWSER_CHANNEL ? { channel: process.env.E2E_BROWSER_CHANNEL } : {}),
      },
    },
  ],
  webServer: {
    command: `npm run start -w @javis-market/web -- --port ${PORT}`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? "",
      PUBLIC_SITE_URL: BASE_URL,
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-secret-e2e-secret-e2e-secret-e2e-secret",
      STORAGE_PUBLIC_DIR: "./storage/e2e/public",
      STORAGE_PRIVATE_DIR: "./storage/e2e/private",
      PUBLIC_MEDIA_BASE_URL: "/media",
    },
  },
});
