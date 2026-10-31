import { BRAND_NAME } from "@javis-market/shared";

// Página provisional: el diseño de la tienda todavía no está definido.
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-brand">{BRAND_NAME}</h1>
      <p className="text-gray-500">Coming soon.</p>
    </main>
  );
}
