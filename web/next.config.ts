import type { NextConfig } from "next";

// Variables de entorno: un único .env en la raíz del monorepo, cargado por Node con --env-file-if-exists
// en los scripts `dev` y `start` de web/package.json. En producción las inyecta PM2.

const nextConfig: NextConfig = {
  // Los paquetes internos se publican como código TypeScript y Next.js los compila.
  transpilePackages: ["@javis-market/api", "@javis-market/db", "@javis-market/shared"],
  // Paquetes nativos o de servidor que no deben empaquetarse.
  serverExternalPackages: ["sharp", "@prisma/client", "@prisma/adapter-pg"],
  poweredByHeader: false,
  images: {
    // Imágenes de producto locales servidas en /media (Nginx en producción). El optimizador genera tamaños adaptados.
    localPatterns: [{ pathname: "/media/**", search: "" }],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 768, 1024, 1280, 1600],
    imageSizes: [64, 96, 128, 256, 384],
  },
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Subida de hasta 10 fotos de 10 MB desde el panel. Mantener en línea con client_max_body_size de Nginx.
      bodySizeLimit: "60mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
