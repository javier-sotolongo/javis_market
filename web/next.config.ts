import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Un único archivo .env en la raíz del monorepo (Next.js solo buscaría en web/).
// En producción las variables llegan desde PM2 y este paso no encuentra archivo.
loadEnvConfig(path.resolve(process.cwd(), ".."));

const nextConfig: NextConfig = {
  // Los paquetes internos se publican como código TypeScript y Next.js los compila.
  transpilePackages: ["@javis-market/api", "@javis-market/db", "@javis-market/shared"],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
