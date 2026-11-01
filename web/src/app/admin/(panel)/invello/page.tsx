import Link from "next/link";
import { getInvelloOverview, listInvelloProducts } from "@javis-market/api";
import { centsToDecimalString, formatMoney, money } from "@javis-market/shared";
import { Card, PageHeader } from "@/components/admin/page-header";
import { ProductStatusBadge } from "@/components/admin/product-status-badge";
import { ActionButton } from "@/components/ui/action-button";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button-class";
import { controlClass } from "@/components/ui/fields";
import { Pagination } from "@/components/ui/pagination";
import { requireAdminSession } from "@/lib/server/session";
import { sellInvelloProductAction, setSellingAction, syncInvelloAction } from "./actions";

export const metadata = { title: "Invello catalog" };

const FILTERS = [
  { value: "all", label: "All products" },
  { value: "not_selling", label: "Not in my store" },
  { value: "selling", label: "In my store" },
  { value: "in_stock", label: "Supplier has stock" },
  { value: "discontinued", label: "Discontinued by supplier" },
] as const;

const dateTime = (value: Date) => value.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export default async function InvelloPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const admin = await requireAdminSession();
  const { q, filter, category, page } = await searchParams;
  const overview = await getInvelloOverview(admin);

  if (!overview.configured) {
    return (
      <>
        <PageHeader title="Invello catalog" />
        <Card>
          <p className="text-sm text-gray-700">
            Invello is not connected. Set <code>INVELLO_API_KEY</code> in the server environment and restart the app and
            the worker.
          </p>
        </Card>
      </>
    );
  }

  const result = await listInvelloProducts(admin, {
    ...(q ? { query: q } : {}),
    ...(filter ? { filter } : {}),
    ...(category ? { category } : {}),
    page,
  });

  return (
    <>
      <PageHeader
        title="Invello catalog"
        description={`Products from ${overview.supplierName ?? "your supplier"}. Pick the ones you want to sell with “Add to store”: the price starts at the supplier's price and you can change it. Stock is kept in sync automatically.`}
        actions={
          <ActionButton action={syncInvelloAction} variant="primary">
            Sync now
          </ActionButton>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
        <span>
          <strong className="text-gray-900">{overview.selling}</strong> in your store ·{" "}
          <strong className="text-gray-900">{overview.total}</strong> available from the supplier
        </span>
        <span>
          {overview.lastSuccessAt
            ? `Last synced ${dateTime(overview.lastSuccessAt)}`
            : "Not synced yet — click Sync now."}
        </span>
      </div>
      {overview.lastError ? (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Last sync{overview.lastRunAt ? ` (${dateTime(overview.lastRunAt)})` : ""} had a problem: {overview.lastError}
        </p>
      ) : null}

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, SKU, brand or UPC"
          className={`${controlClass} w-full sm:w-72`}
        />
        <select name="filter" defaultValue={filter ?? "all"} className={controlClass} aria-label="Show">
          {FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={category ?? ""} className={controlClass} aria-label="Category">
          <option value="">All categories</option>
          {overview.categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button className={buttonClass("secondary")}>Filter</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Supplier price</th>
              <th className="px-4 py-3">Supplier stock</th>
              <th className="px-4 py-3">In your store</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.items.map((item) => (
              <tr key={item.id} className="align-top hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {item.imageUrls.length > 0 ? (
                        // Miniatura servida por el propio panel (ruta protegida), no por Invello.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/admin/invello/${item.id}/image`}
                          alt=""
                          loading="lazy"
                          className="size-full object-contain"
                        />
                      ) : null}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {[
                          item.sku,
                          item.brand,
                          item.categoryName,
                          item.unitsPerCase ? `${item.unitsPerCase}/case` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {!item.active ? (
                        <span className="mt-1 inline-block">
                          <Badge tone="red">Discontinued by supplier</Badge>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {item.priceCents === null ? (
                    <span className="text-gray-400">No price</span>
                  ) : (
                    formatMoney(money(item.priceCents))
                  )}
                  {item.mapPriceCents !== null ? (
                    <p className="text-xs text-gray-500">MAP {formatMoney(money(item.mapPriceCents))}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {item.available === null ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <Badge tone={item.available > 0 ? "green" : "gray"}>{item.available} available</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  {item.store ? (
                    <StoreCell
                      store={item.store}
                      supplierPriceCents={item.priceCents}
                      mapPriceCents={item.mapPriceCents}
                    />
                  ) : item.active ? (
                    <ActionForm
                      action={sellInvelloProductAction.bind(null, item.id)}
                      className="w-64"
                      confirm={`Add "${item.name}" to your store at this price? It will be published right away.`}
                    >
                      <label htmlFor={`price-${item.id}`} className="mb-1 block text-xs text-gray-600">
                        Your selling price (USD)
                      </label>
                      <div className="flex gap-2">
                        <input
                          id={`price-${item.id}`}
                          name="price"
                          required
                          inputMode="decimal"
                          placeholder="0.00"
                          defaultValue={item.priceCents === null ? "" : centsToDecimalString(item.priceCents)}
                          className={`${controlClass} w-24`}
                        />
                        <SubmitButton pendingLabel="Adding…">Add to store</SubmitButton>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Publishes it in your store with its main photo. Stock follows the supplier.
                      </p>
                    </ActionForm>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  {overview.lastSuccessAt ? "No products match these filters." : "Click Sync now to load the catalog."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/admin/invello"
        params={{ q, filter, category }}
      />
    </>
  );
}

function StoreCell({
  store,
  supplierPriceCents,
  mapPriceCents,
}: {
  readonly store: {
    readonly productId: string;
    readonly status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    readonly priceCents: number;
    readonly available: number;
  };
  readonly supplierPriceCents: number | null;
  readonly mapPriceCents: number | null;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <ProductStatusBadge status={store.status} />
        <span className="font-medium">{formatMoney(money(store.priceCents))}</span>
        <Link href={`/admin/products/${store.productId}`} className="text-xs text-gray-600 underline">
          Edit
        </Link>
        <Link href={`/admin/products/${store.productId}#supplier-photos`} className="text-xs text-gray-600 underline">
          Photos
        </Link>
      </div>
      <p className="text-xs text-gray-500">{store.available} available in your store</p>
      {supplierPriceCents !== null && store.priceCents < supplierPriceCents ? (
        <p className="text-xs text-amber-700">Below the supplier price.</p>
      ) : mapPriceCents !== null && store.priceCents < mapPriceCents ? (
        <p className="text-xs text-amber-700">Below the minimum advertised price (MAP).</p>
      ) : null}
      {store.status === "ACTIVE" ? (
        <ActionButton
          action={setSellingAction.bind(null, store.productId, false)}
          variant="ghost"
          className="px-2 py-1 text-xs"
          confirm="Stop selling this product? It will be hidden from the store."
        >
          Stop selling
        </ActionButton>
      ) : (
        <ActionButton action={setSellingAction.bind(null, store.productId, true)} className="px-2 py-1 text-xs">
          Sell again
        </ActionButton>
      )}
    </div>
  );
}
