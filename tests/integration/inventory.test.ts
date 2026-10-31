import { describe, expect, it } from "vitest";
import { DomainError, adjustStock, getAvailability, GUEST } from "@javis-market/api";
import { getPrisma } from "@javis-market/db";
import { admin, createPublishedProduct } from "./helpers";

describe("inventory", () => {
  it("never oversells under concurrent removals", async () => {
    const { variant } = await createPublishedProduct({ stock: 10 });
    const results = await Promise.allSettled(
      Array.from({ length: 25 }, () => adjustStock(admin, { variantId: variant.id, mode: "remove", quantity: 1 })),
    );
    const succeeded = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(succeeded).toHaveLength(10);
    expect(rejected.every((r) => r.reason instanceof DomainError && r.reason.code === "insufficient_stock")).toBe(true);

    const level = await getPrisma().stockLevel.findUniqueOrThrow({ where: { variantId: variant.id } });
    expect(level.onHand).toBe(0);
    // 1 movimiento inicial (+10) y 10 salidas.
    expect(await getPrisma().stockMovement.count({ where: { variantId: variant.id } })).toBe(11);
  });

  it("keeps on hand above reserved units", async () => {
    const { variant } = await createPublishedProduct({ stock: 5 });
    await getPrisma().stockLevel.update({ where: { variantId: variant.id }, data: { reserved: 3 } });
    await expect(adjustStock(admin, { variantId: variant.id, mode: "set", quantity: 2 })).rejects.toMatchObject({
      code: "insufficient_stock",
    });
    expect((await getAvailability([variant.id])).get(variant.id)).toBe(2);
  });

  it("records a count as the difference and audits it", async () => {
    const { variant } = await createPublishedProduct({ stock: 4 });
    const result = await adjustStock(admin, { variantId: variant.id, mode: "set", quantity: 7, note: "Shelf count" });
    expect(result).toEqual({ onHand: 7, delta: 3 });
    const movement = await getPrisma().stockMovement.findFirstOrThrow({
      where: { variantId: variant.id, reason: "COUNT" },
    });
    expect(movement).toMatchObject({ quantity: 3, onHandAfter: 7, note: "Shelf count" });
    expect(await getPrisma().auditLog.count({ where: { action: "inventory.adjust", entityId: variant.id } })).toBe(2);
  });

  it("requires an admin", async () => {
    const { variant } = await createPublishedProduct();
    await expect(adjustStock(GUEST, { variantId: variant.id, mode: "add", quantity: 1 })).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });
});
