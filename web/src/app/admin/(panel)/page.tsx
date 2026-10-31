import Link from "next/link";
import { countProductsByStatus, listStock } from "@javis-market/api";
import { Card, PageHeader } from "@/components/admin/page-header";
import { buttonClass } from "@/components/ui/button-class";
import { Badge } from "@/components/ui/badge";
import { requireAdminSession } from "@/lib/server/session";

export default async function AdminDashboardPage() {
  const admin = await requireAdminSession();
  const [counts, lowStock] = await Promise.all([
    countProductsByStatus(admin),
    listStock(admin, { lowStockOnly: true }),
  ]);

  const stats = [
    { label: "Published products", value: counts.ACTIVE, href: "/admin/products?status=ACTIVE" },
    { label: "Drafts", value: counts.DRAFT, href: "/admin/products?status=DRAFT" },
    { label: "Low stock variants (≤ 5)", value: lowStock.totalItems, href: "/admin/inventory?low=1" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <Link href="/admin/products/new" className={buttonClass("primary")}>
            Add product
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs hover:border-gray-300"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stat.value}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6">
        <Card title="Low stock">
          {lowStock.items.length === 0 ? (
            <p className="text-sm text-gray-500">No variants are running low.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {lowStock.items.slice(0, 10).map((item) => (
                <li key={item.variantId} className="flex items-center justify-between gap-4 py-2 text-sm">
                  <Link href={`/admin/inventory/${item.variantId}`} className="hover:underline">
                    {item.productName}
                    {item.variantTitle !== "Default" ? ` — ${item.variantTitle}` : ""}{" "}
                    <span className="text-gray-400">({item.sku})</span>
                  </Link>
                  <Badge tone={item.available === 0 ? "red" : "amber"}>{item.available} available</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
