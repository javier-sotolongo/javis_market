import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GUEST,
  addInvelloPhoto,
  getInvelloPhotosForProduct,
  INVELLO_SYSTEM_ACTOR,
  getStoreProduct,
  listInvelloProducts,
  sellInvelloProduct,
  syncInvello,
} from "@javis-market/api";
import { getPrisma } from "@javis-market/db";
import { admin } from "./helpers";

/** API de Invello simulada en memoria: GET /me, /products y /stock con la forma documentada. */
interface FakeProduct {
  id: string;
  sku: string;
  name: string;
  active: boolean;
  price: number | null;
  available: number;
  updated_at: string;
}

let catalog: FakeProduct[] = [];
let requests: URL[] = [];

function productDto(p: FakeProduct) {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: "Supplier description",
    brand: "Acme",
    upc: null,
    category: { id: 7, name: "Beverages" },
    unit: "can",
    units_per_case: 24,
    weight_kg: 0.39,
    images: [`https://cdn.invello.test/${p.sku}.jpg`],
    active: p.active,
    updated_at: p.updated_at,
    prices: { currency: "USD", unit: p.price, pallet: null, container: null, map: 1.49 },
    stock: { available: p.available },
  };
}

function fakeInvello(input: string | URL | Request): Response {
  const url = new URL(input instanceof Request ? input.url : input);
  requests.push(url);
  const since = url.searchParams.get("updated_since");
  const changed = (p: FakeProduct) => (since ? p.updated_at > since : p.active);
  const json = (body: unknown) => Response.json(body);
  if (url.pathname.endsWith("/me")) {
    return json({
      organization: { id: 1, name: "Acme Distribution" },
      api_key: { name: "Test", key_prefix: "inv_live_test", expires_at: null },
      permissions: { catalog: true, prices: true, stock: true, category_ids: null },
    });
  }
  if (url.pathname.endsWith("/products")) {
    return json({ data: catalog.filter(changed).map(productDto), next_cursor: null });
  }
  if (url.pathname.endsWith("/stock")) {
    return json({
      data: catalog
        .filter(changed)
        .map((p) => ({ sku: p.sku, available: p.available, active: p.active, updated_at: p.updated_at })),
      next_cursor: null,
    });
  }
  return Response.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
}

const later = () => new Date(Date.now() + 5 * 60_000).toISOString();

async function sellFirst(sku: string, price = "1.99") {
  const item = await getPrisma().invelloProduct.findUniqueOrThrow({ where: { sku } });
  return sellInvelloProduct(admin, item.id, { price });
}

async function onHand(sku: string) {
  const variant = await getPrisma().variant.findUniqueOrThrow({ where: { sku }, include: { stockLevel: true } });
  return variant.stockLevel!.onHand;
}

describe("invello", () => {
  beforeEach(() => {
    process.env.INVELLO_API_KEY = "inv_live_test";
    requests = [];
    catalog = [
      {
        id: "1",
        sku: "ACM-1",
        name: "Sparkling Water",
        active: true,
        price: 0.89,
        available: 120,
        updated_at: "2026-10-01T00:00:00.000Z",
      },
      {
        id: "2",
        sku: "ACM-2",
        name: "Lime Soda",
        active: true,
        price: null,
        available: 0,
        updated_at: "2026-10-01T00:00:00.000Z",
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => fakeInvello(input)),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.INVELLO_API_KEY;
  });

  it("copies the supplier catalog with prices in cents and stock", async () => {
    const result = await syncInvello(INVELLO_SYSTEM_ACTOR);
    expect(result).toMatchObject({ skipped: false, full: true, products: 2, failed: 0 });
    const water = await getPrisma().invelloProduct.findUniqueOrThrow({ where: { sku: "ACM-1" } });
    expect(water).toMatchObject({
      name: "Sparkling Water",
      priceCents: 89,
      mapPriceCents: 149,
      available: 120,
      weightGrams: 390,
      categoryName: "Beverages",
      active: true,
      variantId: null,
    });
    expect((await getPrisma().invelloProduct.findUniqueOrThrow({ where: { sku: "ACM-2" } })).priceCents).toBeNull();
    expect(requests[0]!.toString()).not.toContain("inv_live_test");
  });

  it("then syncs incrementally with updated_since", async () => {
    await syncInvello(INVELLO_SYSTEM_ACTOR);
    requests = [];
    const second = await syncInvello(INVELLO_SYSTEM_ACTOR);
    expect(second.full).toBe(false);
    const productsCall = requests.find((url) => url.pathname.endsWith("/products"))!;
    expect(productsCall.searchParams.get("updated_since")).toBeTruthy();
    expect(requests.some((url) => url.pathname.endsWith("/stock"))).toBe(true);
  });

  it("sells a product at the admin's price and keeps its stock in sync", async () => {
    await syncInvello(INVELLO_SYSTEM_ACTOR);
    const { productId } = await sellFirst("ACM-1", "1.25");

    const product = await getPrisma().product.findUniqueOrThrow({
      where: { id: productId },
      include: { variants: true, categories: { include: { category: true } } },
    });
    expect(product).toMatchObject({ status: "ACTIVE", supplier: "Acme Distribution (Invello)", brand: "Acme" });
    expect(product.variants[0]).toMatchObject({ sku: "ACM-1", priceCents: 125, costCents: 89, weightGrams: 390 });
    expect(product.categories.map((c) => c.category.name)).toEqual(["Beverages"]);
    expect(await onHand("ACM-1")).toBe(120);
    expect((await getStoreProduct(product.slug))?.variants[0]?.available).toBe(120);

    // El proveedor vende unidades: la siguiente sincronización ajusta la tienda.
    catalog[0]!.available = 80;
    catalog[0]!.updated_at = later();
    expect((await syncInvello(INVELLO_SYSTEM_ACTOR)).linkedStockChanges).toBe(1);
    expect(await onHand("ACM-1")).toBe(80);
    const movement = await getPrisma().stockMovement.findFirstOrThrow({
      where: { reason: "SUPPLIER_SYNC" },
      orderBy: { createdAt: "desc" },
    });
    expect(movement).toMatchObject({ quantity: -40, onHandAfter: 80, actorType: "SYSTEM", actorId: "invello-sync" });

    // El administrador puede cambiar el precio: la sincronización no lo pisa.
    await getPrisma().variant.update({ where: { sku: "ACM-1" }, data: { priceCents: 199 } });
    catalog[0]!.price = 0.95;
    catalog[0]!.updated_at = later();
    await syncInvello(INVELLO_SYSTEM_ACTOR);
    expect((await getPrisma().variant.findUniqueOrThrow({ where: { sku: "ACM-1" } })).priceCents).toBe(199);
    const page = await listInvelloProducts(admin, { filter: "selling" });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ priceCents: 95, store: { priceCents: 199, available: 80 } });
  });

  it("sets stock to zero when the supplier discontinues a product", async () => {
    await syncInvello(INVELLO_SYSTEM_ACTOR);
    await sellFirst("ACM-1");
    catalog[0]!.active = false;
    catalog[0]!.updated_at = later();
    await syncInvello(INVELLO_SYSTEM_ACTOR);
    expect(await onHand("ACM-1")).toBe(0);
    expect((await listInvelloProducts(admin, { filter: "discontinued" })).items.map((i) => i.sku)).toEqual(["ACM-1"]);
  });

  it("marks products missing from a full sync as inactive", async () => {
    await syncInvello(INVELLO_SYSTEM_ACTOR);
    catalog = catalog.slice(0, 1);
    await syncInvello(INVELLO_SYSTEM_ACTOR, { full: true });
    expect((await getPrisma().invelloProduct.findUniqueOrThrow({ where: { sku: "ACM-2" } })).active).toBe(false);
  });

  it("requires a price when the supplier has none and refuses to sell twice", async () => {
    await syncInvello(INVELLO_SYSTEM_ACTOR);
    await expect(sellFirst("ACM-2", "")).rejects.toMatchObject({ code: "validation_failed" });
    await sellFirst("ACM-1");
    await expect(sellFirst("ACM-1")).rejects.toMatchObject({ code: "conflict" });
    const item = await getPrisma().invelloProduct.findUniqueOrThrow({ where: { sku: "ACM-2" } });
    await expect(sellInvelloProduct(GUEST, item.id, { price: "1" })).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("lets the admin choose supplier photos only after selling, without downloading any by itself", async () => {
    await syncInvello(INVELLO_SYSTEM_ACTOR);
    const item = await getPrisma().invelloProduct.findUniqueOrThrow({ where: { sku: "ACM-1" } });
    await expect(addInvelloPhoto(admin, item.id, 0)).rejects.toMatchObject({ code: "invalid_state" });
    const { productId } = await sellFirst("ACM-1");
    expect(await getPrisma().productImage.count()).toBe(0);
    expect(await getInvelloPhotosForProduct(admin, productId)).toEqual({
      invelloProductId: item.id,
      photos: [{ index: 0, url: "https://cdn.invello.test/ACM-1.jpg", added: false }],
    });
    await expect(addInvelloPhoto(admin, item.id, 5)).rejects.toMatchObject({ code: "not_found" });
  });

  it("does not run two syncs at once", async () => {
    await getPrisma().invelloSyncState.create({
      data: { id: "invello", lockedUntil: new Date(Date.now() + 60_000) },
    });
    expect((await syncInvello(INVELLO_SYSTEM_ACTOR)).skipped).toBe(true);
    expect(requests).toHaveLength(0);
  });

  it("reports Invello errors and releases the lock", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: "Invalid, expired or revoked API key.", code: "API_KEY_INVALID" }, { status: 401 }),
      ),
    );
    await expect(syncInvello(INVELLO_SYSTEM_ACTOR)).rejects.toMatchObject({ code: "invalid_state" });
    const state = await getPrisma().invelloSyncState.findUniqueOrThrow({ where: { id: "invello" } });
    expect(state.lastError).toContain("API_KEY_INVALID");
    expect(state.lockedUntil).toBeNull();
  });
});
