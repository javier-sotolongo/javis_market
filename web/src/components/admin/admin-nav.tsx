"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/activity", label: "Activity log" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map((link) => {
        const active = "exact" in link ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-sm whitespace-nowrap ${active ? "bg-brand-soft font-medium text-brand" : "text-gray-700 hover:bg-gray-100"}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
