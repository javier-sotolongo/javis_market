import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

/** Páginas visibles: primera, última y vecinas de la actual, con saltos ("…") entre medias. */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  for (const [i, p] of sorted.entries()) {
    if (i > 0 && p - sorted[i - 1]! > 1) result.push("gap");
    result.push(p);
  }
  return result;
}

/** Paginación numerada que conserva el resto de parámetros de la URL. */
export function Pagination({
  page,
  totalPages,
  basePath,
  params = {},
}: {
  readonly page: number;
  readonly totalPages: number;
  readonly basePath: string;
  readonly params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;
  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };
  const item = "flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 text-sm font-medium";
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link className={`${item} gap-1 text-ink hover:bg-canvas-muted`} href={href(page - 1)}>
          <ChevronLeft aria-hidden className="size-4" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sr-only sm:hidden">Previous page</span>
        </Link>
      ) : null}
      <ul className="flex items-center gap-1">
        {pageWindow(page, totalPages).map((p, i) =>
          p === "gap" ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-ink-subtle">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={href(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Page ${p}`}
                className={`${item} ${p === page ? "bg-brand text-brand-contrast" : "text-ink hover:bg-canvas-muted"}`}
              >
                {p}
              </Link>
            </li>
          ),
        )}
      </ul>
      {page < totalPages ? (
        <Link className={`${item} gap-1 text-ink hover:bg-canvas-muted`} href={href(page + 1)}>
          <span className="hidden sm:inline">Next</span>
          <span className="sr-only sm:hidden">Next page</span>
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      ) : null}
    </nav>
  );
}
