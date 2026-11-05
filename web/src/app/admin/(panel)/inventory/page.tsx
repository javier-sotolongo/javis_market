import Link from "next/link";
import { listStock } from "@javis-market/api";
import { PageHeader } from "@/components/admin/page-header";
import { buttonClass } from "@/components/ui/button-class";
import { Badge } from "@/components/ui/badge";
import { controlClass } from "@/components/ui/fields";
import { Pagination } from "@/components/ui/pagination";
import { requireAdminSession } from "@/lib/server/session";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const admin = await requireAdminSession();
  const { q, low, page } = await searchParams;
  const result = await listStock(admin, { ...(q ? { query: q } : {}), lowStockOnly: low === "1", page });

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Available = on hand − reserved. Reservations will be created at checkout."
      />
      <form className="mb-4 flex flex-wrap items-center gap-2" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by product or SKU"
          className={`${controlClass} w-full sm:w-72`}
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="low" value="1" defaultChecked={low === "1"} className="accent-brand" /> Low stock
          only
        </label>
        <button className={buttonClass("secondary")}>Filter</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">On hand</th>
              <th className="px-4 py-3 text-right">Reserved</th>
              <th className="px-4 py-3 text-right">Available</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.items.map((item) => (
              <tr key={item.variantId}>
                <td className="px-4 py-3">
                  <Link href={`/admin/products/${item.productId}`} className="hover:underline">
                    {item.productName}
                  </Link>
                  {item.variantTitle !== "Default" ? (
                    <span className="text-gray-500"> — {item.variantTitle}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-gray-600">{item.sku}</td>
                <td className="px-4 py-3 text-right">{item.onHand}</td>
                <td className="px-4 py-3 text-right">{item.reserved}</td>
                <td className="px-4 py-3 text-right">
                  <Badge tone={item.available === 0 ? "red" : item.available <= 5 ? "amber" : "green"}>
                    {item.available}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/inventory/${item.variantId}`} className="text-sm text-brand-ink underline">
                    Adjust
                  </Link>
                </td>
              </tr>
            ))}
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  No variants found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Pagination page={result.page} totalPages={result.totalPages} basePath="/admin/inventory" params={{ q, low }} />
    </>
  );
}
