"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button-class";

/** Error inesperado en una página de la tienda: mensaje claro y opción de reintentar. */
export default function StoreError({
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-shop px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl bg-surface px-6 py-12 text-center shadow-card">
        <span className="flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
          <TriangleAlert aria-hidden className="size-7" strokeWidth={1.5} />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-ink">Something went wrong</h1>
        <p className="mt-1 text-sm text-ink-muted">We couldn’t load this page. Please try again in a moment.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className={buttonClass("primary")}>
            <RotateCcw aria-hidden className="size-4" />
            Try again
          </button>
          <Link href="/" className={buttonClass("secondary")}>
            Go to home
          </Link>
        </div>
      </div>
    </div>
  );
}
