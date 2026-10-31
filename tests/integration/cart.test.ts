import { describe, expect, it } from "vitest";
import {
  addToCart,
  getCart,
  getCartItemCount,
  setVariantArchived,
  addVariant,
  updateCartLine,
} from "@javis-market/api";
import { getPrisma } from "@javis-market/db";
import { admin, createPublishedProduct } from "./helpers";

describe("cart", () => {
  it("creates a guest cart storing only the token hash, without reserving stock", async () => {
    const { variant } = await createPublishedProduct({ stock: 5, price: "2.50" });
    const { token } = await addToCart(null, { variantId: variant.id, quantity: 2 });
    expect(token).toMatch(/^[\w-]{40,}$/);
    const cart = await getPrisma().cart.findFirstOrThrow();
    expect(cart.tokenHash).not.toBe(token);

    const again = await addToCart(token, { variantId: variant.id, quantity: 1 });
    expect(again.token).toBe(token);

    const view = await getCart(token);
    expect(view.lines).toHaveLength(1);
    expect(view.lines[0]).toMatchObject({
      quantity: 3,
      unitPrice: { amountCents: 250 },
      lineTotal: { amountCents: 750 },
    });
    expect(view.subtotal).toEqual({ amountCents: 750, currency: "USD" });
    expect((await getPrisma().stockLevel.findUniqueOrThrow({ where: { variantId: variant.id } })).reserved).toBe(0);
  });

  it("does not allow adding more than is available", async () => {
    const { variant } = await createPublishedProduct({ stock: 2 });
    const { token } = await addToCart(null, { variantId: variant.id, quantity: 2 });
    await expect(addToCart(token, { variantId: variant.id, quantity: 1 })).rejects.toMatchObject({
      code: "insufficient_stock",
    });
    await expect(
      updateCartLine(token, { lineId: (await getCart(token)).lines[0]!.id, quantity: 3 }),
    ).rejects.toMatchObject({
      code: "insufficient_stock",
    });
  });

  it("flags lines that become unavailable and excludes them from the subtotal", async () => {
    const { product, variant } = await createPublishedProduct({ stock: 3, price: "4" });
    await addVariant(admin, product.id, { sku: `ALT-${Date.now()}`, price: "1" });
    const { token } = await addToCart(null, { variantId: variant.id, quantity: 1 });
    await setVariantArchived(admin, variant.id, true);
    const view = await getCart(token);
    expect(view.lines[0]?.issue).toBe("unavailable");
    expect(view.subtotal.amountCents).toBe(0);
    expect(view.hasIssues).toBe(true);
  });

  it("ignores unknown or foreign tokens", async () => {
    const { variant } = await createPublishedProduct();
    const { token } = await addToCart(null, { variantId: variant.id });
    expect(await getCartItemCount("not-a-real-token")).toBe(0);
    const line = (await getCart(token)).lines[0]!;
    await expect(updateCartLine("other-token", { lineId: line.id, quantity: 0 })).rejects.toMatchObject({
      code: "not_found",
    });
  });
});
