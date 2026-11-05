import Image from "next/image";
import Link from "next/link";
import { listProducts, productImageUrl } from "@javis-market/api";
import { formatMoney, money } from "@javis-market/shared";
import { PageHeader } from "@/components/admin/page-header";
import { ProductStatusBadge } from "@/components/admin/product-status-badge";
import { buttonClass } from "@/components/ui/button-class";
import { controlClass } from "@/components/ui/fields";
import { Pagination } from "@/components/ui/pagination";
import { requireAdminSession } from "@/lib/server/session";

export const metadata = { title: "Products" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const admin = await requireAdminSession();
  const { q, status, page } = await searchParams;
  const result = await listProducts(admin, { ...(q ? { query: q } : {}), ...(status ? { status } : {}), page });

  return (
    <>
      <PageHeader
        title="Products"
        actions={
          <Link href="/admin/products/new" className={buttonClass("primary")}>
            Add product
          </Link>
        }
      />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or SKU"
          className={`${controlClass} w-full sm:w-72`}
        />
        <select name="status" defaultValue={status ?? ""} className={controlClass}>
          <option value="">Draft &amp; published</option>
          <option value="ACTIVE">Published</option>
          <option value="DRAFT">Drafts</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button className={buttonClass("secondary")}>Filter</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Variants</th>
              <th className="px-4 py-3">On hand</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.items.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="flex items-center gap-3 font-medium text-gray-900 hover:underline"
                  >
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {product.imageKey ? (
                        <Image
                          src={productImageUrl(product.imageKey)}
                          alt=""
                          fill
                          sizes="40px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                    {product.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <ProductStatusBadge status={product.status} />
                </td>
                <td className="px-4 py-3">
                  {product.minPriceCents === null ? "—" : formatMoney(money(product.minPriceCents))}
                </td>
                <td className="px-4 py-3">{product.variantCount}</td>
                <td className="px-4 py-3">{product.onHand}</td>
              </tr>
            ))}
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  No products found.{" "}
                  <Link href="/admin/products/new" className="text-brand-ink underline">
                    Add your first product
                  </Link>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Pagination page={result.page} totalPages={result.totalPages} basePath="/admin/products" params={{ q, status }} />
    </>
  );
}
