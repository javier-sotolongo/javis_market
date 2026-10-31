import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoreCategory } from "@javis-market/api";
import { CatalogView } from "@/components/store/catalog/catalog-view";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getStoreCategory((await params).slug);
  return { title: category?.name ?? "Category" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = await getStoreCategory(slug);
  if (!category) notFound();
  return (
    <CatalogView
      params={{
        q: one(query.q)?.trim() || undefined,
        sort: one(query.sort),
        stock: one(query.stock),
        page: one(query.page),
      }}
      category={category}
    />
  );
}
