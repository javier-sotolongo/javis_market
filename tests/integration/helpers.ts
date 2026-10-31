import type { AdminActor } from "@javis-market/api";
import { createProduct, updateProduct } from "@javis-market/api";

export const admin: AdminActor = { type: "admin", userId: "test-admin", email: "owner@example.com" };

let counter = 0;

/** Crea un producto con una variante y lo publica. */
export async function createPublishedProduct(options: { stock?: number; price?: string; name?: string } = {}) {
  counter += 1;
  const product = await createProduct(admin, {
    name: options.name ?? `Test product ${counter}`,
    sku: `TEST-${counter}-${Date.now()}`,
    price: options.price ?? "9.99",
    initialStock: String(options.stock ?? 10),
  });
  await updateProduct(admin, product.id, { name: product.name, status: "ACTIVE" });
  return { product, variant: product.variants[0]! };
}
