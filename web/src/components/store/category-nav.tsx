"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

/** Navegación de categorías con estado activo; en pantallas estrechas se desplaza en horizontal con un fundido. */
export function CategoryNav({ categories }: { readonly categories: readonly NavCategory[] }) {
  const pathname = usePathname();
  const links = [
    { id: "all", name: "All products", href: "/products" },
    ...categories.map((c) => ({ id: c.id, name: c.name, href: `/categories/${c.slug}` })),
  ];
  return (
    <nav aria-label="Categories">
      <ul className="-mb-px flex scrollbar-none gap-6 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-3rem),transparent)] pr-8 md:[mask-image:none] md:pr-0">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <li key={link.id} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center border-b-2 text-[0.9375rem] font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "border-ink text-ink"
                    : "border-transparent text-ink-muted hover:border-titanium hover:text-ink"
                }`}
              >
                {link.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
