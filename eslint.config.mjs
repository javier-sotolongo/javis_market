// Configuración única de ESLint (flat config) para todo el monorepo.
import js from "@eslint/js";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import globals from "globals";
import tseslint from "typescript-eslint";

const WEB_FILES = ["web/**/*.{js,jsx,mjs,ts,tsx}"];

// La configuración de Next.js se limita a `web/`; sus entradas de solo `ignores` se sustituyen por las globales.
const nextForWeb = nextCoreWebVitals
  .filter((config) => !(config.ignores && Object.keys(config).length === 1))
  .map((config) => ({ ...config, files: WEB_FILES, settings: { ...config.settings, next: { rootDir: "web/" } } }));

/**
 * Reglas de dirección de dependencias entre paquetes (ver docs/architecture.md):
 *   web → api, shared · worker → api · api → db, shared · db → (nada interno) · shared → (nada)
 */
const restrict = (files, patterns) => ({
  files,
  rules: { "no-restricted-imports": ["error", { patterns }] },
});

const deepImports = {
  group: ["@javis-market/*/*"],
  message: "Importa solo la entrada pública del paquete (@javis-market/<paquete>).",
};

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/coverage/**",
      "web/next-env.d.ts",
      "db/src/generated/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  ...nextForWeb,
  restrict(
    ["shared/**"],
    [
      deepImports,
      { group: ["@javis-market/*", "!@javis-market/shared"], message: "shared no depende de otros paquetes internos." },
      { group: ["@prisma/*", "server-only", "node:*"], message: "shared se usa también en el navegador." },
    ],
  ),
  restrict(
    ["db/**"],
    [deepImports, { group: ["@javis-market/*"], message: "db no depende de otros paquetes internos." }],
  ),
  restrict(
    ["api/**"],
    [
      deepImports,
      { group: ["@javis-market/web", "@javis-market/worker"], message: "api no depende de web ni de worker." },
      { group: ["next", "next/*", "react", "react-dom"], message: "api es independiente del framework web." },
    ],
  ),
  restrict(
    ["web/**"],
    [
      deepImports,
      { group: ["@javis-market/db", "@prisma/*"], message: "web accede a datos solo a través de @javis-market/api." },
      { group: ["@javis-market/worker"], message: "web no depende del worker." },
    ],
  ),
  restrict(
    ["worker/**"],
    [
      deepImports,
      {
        group: ["@javis-market/db", "@prisma/*"],
        message: "worker accede a datos solo a través de @javis-market/api.",
      },
      { group: ["@javis-market/web", "next", "next/*", "react"], message: "worker no depende de web." },
    ],
  ),
);
