import "@fontsource-variable/figtree";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { BRAND_NAME } from "@javis-market/shared";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: BRAND_NAME, template: `%s · ${BRAND_NAME}` },
  description: `${BRAND_NAME} online store`,
};

// Azul marino de la marca (barra de categorías y pie).
export const viewport: Viewport = { themeColor: "#04214f" };

// Idioma de la tienda: inglés.
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
