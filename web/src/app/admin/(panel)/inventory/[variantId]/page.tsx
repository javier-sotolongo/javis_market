import Link from "next/link";
import { notFound } from "next/navigation";
import { type AdminActor, getVariantStock, isDomainError, listStockMovements } from "@javis-market/api";
import { Card, PageHeader } from "@/components/admin/page-header";
import { StockAdjustForm } from "@/components/admin/stock-adjust-form";
import { requireAdminSession } from "@/lib/server/session";

export const metadata = { title: "Stock" };

const REASONS = {
  RECEIPT: "Received",
  ADJUSTMENT: "Adjustment",
  COUNT: "Count",
  SALE: "Sale",
  RETURN_RESTOCK: "Return",
  SUPPLIER_SYNC: "Invello sync",
} as const;

export default async function VariantStockPage({ params }: { params: Promise<{ variantId: string }> }) {
  const admin = await requireAdminSession();
  const { variantId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(variantId)) notFound();
  const [item, movements] = await Promise.all([loadVariant(admin, variantId), listStockMovements(admin, variantId)]);

  return (
    <>
      <PageHeader
        title={`${item.productName}${item.variantTitle !== "Default" ? ` — ${item.variantTitle}` : ""}`}
        description={`SKU ${item.sku}`}
        actions={
          <Link href={`/admin/products/${item.productId}`} className="text-sm text-gray-600 underline">
            Edit product
          </Link>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ["On hand", item.onHand],
          ["Reserved", item.reserved],
          ["Available", item.available],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Adjust stock">
          <StockAdjustForm variantId={variantId} />
        </Card>
        <div className="lg:col-span-2">
          <Card title="Movements">
            {movements.length === 0 ? (
              <p className="text-sm text-gray-500">No movements yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="py-2">Date</th>
                    <th className="py-2">Type</th>
                    <th className="py-2 text-right">Change</th>
                    <th className="py-2 text-right">On hand</th>
                    <th className="py-2 pl-4">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td className="py-2 whitespace-nowrap text-gray-600">
                        {movement.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                      <td className="py-2">{REASONS[movement.reason]}</td>
                      <td
                        className={`py-2 text-right font-medium ${movement.quantity > 0 ? "text-emerald-700" : "text-red-700"}`}
                      >
                        {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                      </td>
                      <td className="py-2 text-right">{movement.onHandAfter}</td>
                      <td className="py-2 pl-4 text-gray-600">{movement.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

async function loadVariant(admin: AdminActor, variantId: string) {
  try {
    return await getVariantStock(admin, variantId);
  } catch (error) {
    if (isDomainError(error) && error.code === "not_found") notFound();
    throw error;
  }
}
