import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BRAND_NAME } from "@javis-market/shared";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: `${BRAND_NAME} online store`,
};

// Idioma inicial propuesto: inglés (pendiente de confirmación).
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans text-gray-900 antialiased">{children}</body>
    </html>
  );
}
