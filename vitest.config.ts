import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const serverOnlyStub = fileURLToPath(new URL("./tests/support/server-only.ts", import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "server-only": serverOnlyStub },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["{shared,api,worker,web}/src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/integration/global-setup.ts"],
          setupFiles: ["tests/integration/setup.ts"],
          // Las pruebas comparten una base de datos: se ejecutan en serie.
          fileParallelism: false,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
