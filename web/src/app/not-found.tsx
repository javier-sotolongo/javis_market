import { SearchX } from "lucide-react";
import Link from "next/link";
import { BRAND_NAME } from "@javis-market/shared";
import { buttonClass } from "@/components/ui/button-class";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Link href="/" className="text-xl font-bold tracking-tight text-ink">
        <span className="text-brand">Javis</span> Market
        <span className="sr-only"> ({BRAND_NAME} home)</span>
      </Link>
      <span className="mt-6 flex size-14 items-center justify-center rounded-full bg-canvas-muted text-ink-subtle">
        <SearchX aria-hidden className="size-7" strokeWidth={1.5} />
      </span>
      <h1 className="text-2xl font-bold text-ink">Page not found</h1>
      <p className="max-w-sm text-ink-muted">The page you are looking for doesn’t exist or is no longer available.</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link href="/products" className={buttonClass("primary")}>
          Browse products
        </Link>
        <Link href="/" className={buttonClass("secondary")}>
          Go to home
        </Link>
      </div>
    </main>
  );
}
