import type { Metadata } from "next";
import { CatalogView } from "@/components/store/catalog/catalog-view";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: typeof q === "string" && q ? `Search: ${q}` : "All products" };
}

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return (
    <CatalogView
      params={{
        q: one(params.q)?.trim() || undefined,
        sort: one(params.sort),
        stock: one(params.stock),
        page: one(params.page),
      }}
      category={null}
    />
  );
}
