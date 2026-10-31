import { describe, expect, it } from "vitest";
import {
  createProduct,
  getStoreProduct,
  listStoreProducts,
  setVariantArchived,
  updateProduct,
  updateVariant,
} from "@javis-market/api";
import { getPrisma } from "@javis-market/db";
import { admin, createPublishedProduct } from "./helpers";

describe("catalog", () => {
  it("stores prices in integer cents and generates unique slugs", async () => {
    const a = await createProduct(admin, { name: "Café Molido", sku: "cafe-1", price: "12.5" });
    const b = await createProduct(admin, { name: "Café Molido", sku: "CAFE-2", price: "0.1" });
    expect(a.slug).toBe("cafe-molido");
    expect(b.slug).toBe("cafe-molido-2");
    expect(a.variants[0]).toMatchObject({ sku: "CAFE-1", priceCents: 1250, currency: "USD" });
    expect(b.variants[0]!.priceCents).toBe(10);
  });

  it("rejects duplicated SKUs with a field error", async () => {
    await createProduct(admin, { name: "One", sku: "DUP-1", price: "1" });
    await expect(createProduct(admin, { name: "Two", sku: "dup-1", price: "1" })).rejects.toMatchObject({
      code: "conflict",
      details: [{ path: "sku" }],
    });
    expect(await getPrisma().product.count()).toBe(1);
  });

  it("validates admin input", async () => {
    await expect(createProduct(admin, { name: "", sku: "X", price: "abc" })).rejects.toMatchObject({
      code: "validation_failed",
    });
    await expect(
      createProduct(admin, { name: "P", sku: "X2", price: "10", compareAtPrice: "5" }),
    ).rejects.toMatchObject({
      details: [{ path: "compareAtPrice" }],
    });
  });

  it("only shows published products with active variants in the store", async () => {
    const draft = await createProduct(admin, { name: "Hidden draft", sku: "DRAFT-1", price: "5" });
    const { product, variant } = await createPublishedProduct({ name: "Visible" });
    const listing = await listStoreProducts();
    expect(listing.items.map((p) => p.name)).toEqual(["Visible"]);
    expect(await getStoreProduct(draft.slug)).toBeNull();
    expect((await getStoreProduct(product.slug))?.variants[0]?.available).toBe(10);

    // No se puede archivar la única variante de un producto publicado.
    await expect(setVariantArchived(admin, variant.id, true)).rejects.toMatchObject({
      code: "business_rule_violation",
    });
  });

  it("refuses to publish a product without active variants and audits price changes", async () => {
    const product = await createProduct(admin, { name: "No variants", sku: "NV-1", price: "5" });
    await setVariantArchived(admin, product.variants[0]!.id, true);
    await expect(updateProduct(admin, product.id, { name: "No variants", status: "ACTIVE" })).rejects.toMatchObject({
      code: "business_rule_violation",
    });

    await setVariantArchived(admin, product.variants[0]!.id, false);
    await updateVariant(admin, product.variants[0]!.id, { sku: "NV-1", price: "6.00" });
    expect(await getPrisma().auditLog.count({ where: { action: "variant.price_change" } })).toBe(1);
  });
});

describe("storefront listing", () => {
  it("filters in-stock products and sorts across the whole catalog", async () => {
    const {
      listStoreProducts: list,
      listStoreCategories: categories,
      createCategory,
      adjustStock,
    } = await import("@javis-market/api");
    const pantry = await createCategory(admin, { name: "Pantry" });
    const zebra = await createPublishedProduct({ name: "Zebra cookies", stock: 2 });
    await createPublishedProduct({ name: "Apple jam", stock: 0 });
    await createPublishedProduct({ name: "Mango tea", stock: 5 });
    await updateProduct(admin, zebra.product.id, { name: "Zebra cookies", status: "ACTIVE", categoryIds: [pantry.id] });

    const byName = await list({ sort: "name", pageSize: 2 });
    expect(byName.items.map((p) => p.name)).toEqual(["Apple jam", "Mango tea"]);
    expect(byName.totalPages).toBe(2);

    const inStock = await list({ inStockOnly: true, sort: "name" });
    expect(inStock.items.map((p) => p.name)).toEqual(["Mango tea", "Zebra cookies"]);

    // Con reservas que igualan el físico deja de estar disponible.
    await getPrisma().stockLevel.update({ where: { variantId: zebra.variant.id }, data: { reserved: 2 } });
    expect((await list({ inStockOnly: true })).items.map((p) => p.name)).toEqual(["Mango tea"]);
    await adjustStock(admin, { variantId: zebra.variant.id, mode: "add", quantity: 1 });
    expect((await list({ inStockOnly: true, categorySlug: "pantry" })).items.map((p) => p.name)).toEqual([
      "Zebra cookies",
    ]);

    const [card] = (await list({ search: "zebra" })).items;
    expect(card).toMatchObject({ variantCount: 1, presentation: null, quickAddVariantId: zebra.variant.id });
    expect(await categories()).toEqual([expect.objectContaining({ slug: "pantry", productCount: 1 })]);
  });
});
