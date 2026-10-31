import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { getPrisma, type Prisma } from "@javis-market/db";
import { money, multiplyMoney, sumMoney, type Money } from "@javis-market/shared";
import { getFileStorage } from "../../adapters/storage";
import { DomainError, notFound } from "../../infrastructure/errors";
import { parseInput } from "../../infrastructure/validation";
import { getAvailability } from "../inventory";

/**
 * Carrito de invitado. El navegador guarda un token aleatorio en una cookie HttpOnly; aquí solo se guarda su hash.
 * Añadir al carrito NO reserva inventario (docs/checkout-inventory-payments.md §3); los precios se recalculan
 * siempre con los vigentes y el cliente nunca los envía.
 */

export const MAX_QUANTITY_PER_LINE = 20;
export const MAX_LINES_PER_CART = 50;

export function createCartToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function findOpenCart(
  token: string | null | undefined,
  db: Pick<Prisma.TransactionClient, "cart"> = getPrisma(),
) {
  if (!token || token.length > 100) return null;
  return db.cart.findFirst({ where: { tokenHash: hashToken(token), status: "OPEN" } });
}

const quantityField = z.coerce
  .number()
  .int("Enter a whole number.")
  .min(1)
  .max(MAX_QUANTITY_PER_LINE, `You can add up to ${MAX_QUANTITY_PER_LINE} of each item.`);

const addSchema = z.object({ variantId: z.uuid(), quantity: quantityField.default(1) });

async function purchasableVariant(tx: Prisma.TransactionClient, variantId: string) {
  const variant = await tx.variant.findUnique({
    where: { id: variantId },
    include: { product: { select: { status: true, name: true } } },
  });
  if (!variant || variant.archivedAt || variant.product.status !== "ACTIVE") {
    throw new DomainError("not_found", "This product is no longer available.");
  }
  return variant;
}

function assertAvailable(available: number, quantity: number) {
  if (quantity > available) {
    throw new DomainError(
      "insufficient_stock",
      available === 0 ? "This item is out of stock." : `Only ${available} left in stock.`,
      [{ path: "quantity", message: `Max ${available}.` }],
    );
  }
}

/**
 * Añade una variante al carrito (creándolo si hace falta). Devuelve el token a guardar en la cookie,
 * que es nuevo si no existía un carrito abierto.
 */
export async function addToCart(
  token: string | null | undefined,
  input: z.input<typeof addSchema>,
): Promise<{ token: string }> {
  const data = parseInput(addSchema, input);
  return getPrisma().$transaction(async (tx) => {
    await purchasableVariant(tx, data.variantId);
    let cart = await findOpenCart(token, tx);
    let cartToken = token ?? "";
    if (!cart) {
      cartToken = createCartToken();
      cart = await tx.cart.create({ data: { tokenHash: hashToken(cartToken) } });
    }
    const existing = await tx.cartLine.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: data.variantId } },
    });
    const quantity = (existing?.quantity ?? 0) + data.quantity;
    if (quantity > MAX_QUANTITY_PER_LINE) {
      throw new DomainError("validation_failed", `You can add up to ${MAX_QUANTITY_PER_LINE} of each item.`);
    }
    assertAvailable((await getAvailability([data.variantId], tx)).get(data.variantId) ?? 0, quantity);
    if (existing) {
      await tx.cartLine.update({ where: { id: existing.id }, data: { quantity } });
    } else {
      if ((await tx.cartLine.count({ where: { cartId: cart.id } })) >= MAX_LINES_PER_CART) {
        throw new DomainError("business_rule_violation", "Your cart is full.");
      }
      await tx.cartLine.create({ data: { cartId: cart.id, variantId: data.variantId, quantity } });
    }
    await tx.cart.update({ where: { id: cart.id }, data: { lastActivityAt: new Date() } });
    return { token: cartToken };
  });
}

/** Cambia la cantidad de una línea; 0 la elimina. */
export async function updateCartLine(token: string | null | undefined, input: { lineId: string; quantity: unknown }) {
  const lineId = parseInput(z.uuid(), input.lineId);
  const quantity = parseInput(z.coerce.number().int().min(0).max(MAX_QUANTITY_PER_LINE), input.quantity);
  await getPrisma().$transaction(async (tx) => {
    const cart = await findOpenCart(token, tx);
    const line = cart ? await tx.cartLine.findFirst({ where: { id: lineId, cartId: cart.id } }) : null;
    if (!cart || !line) throw notFound("Cart item");
    if (quantity === 0) {
      await tx.cartLine.delete({ where: { id: line.id } });
    } else {
      if (quantity > line.quantity) {
        await purchasableVariant(tx, line.variantId);
        assertAvailable((await getAvailability([line.variantId], tx)).get(line.variantId) ?? 0, quantity);
      }
      await tx.cartLine.update({ where: { id: line.id }, data: { quantity } });
    }
    await tx.cart.update({ where: { id: cart.id }, data: { lastActivityAt: new Date() } });
  });
}

export async function removeCartLine(token: string | null | undefined, lineId: string) {
  await updateCartLine(token, { lineId, quantity: 0 });
}

export type CartLineIssue = "unavailable" | "insufficient_stock";

export interface CartLineView {
  readonly id: string;
  readonly variantId: string;
  readonly productName: string;
  readonly productSlug: string;
  readonly variantTitle: string;
  readonly sku: string;
  readonly imageUrl: string | null;
  readonly unitPrice: Money;
  readonly quantity: number;
  readonly lineTotal: Money;
  readonly available: number;
  readonly issue: CartLineIssue | null;
}

export interface CartView {
  readonly lines: readonly CartLineView[];
  readonly itemCount: number;
  /** Subtotal indicativo con precios vigentes; los totales definitivos se calculan en el checkout. */
  readonly subtotal: Money;
  readonly hasIssues: boolean;
}

const EMPTY_CART: CartView = { lines: [], itemCount: 0, subtotal: money(0), hasIssues: false };

export async function getCart(token: string | null | undefined): Promise<CartView> {
  const cart = await findOpenCart(token);
  if (!cart) return EMPTY_CART;
  const lines = await getPrisma().cartLine.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: "asc" },
    include: { variant: { include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } } } },
  });
  const availability = await getAvailability(lines.map((line) => line.variantId));
  const storage = getFileStorage();
  const views = lines.map((line): CartLineView => {
    const { variant } = line;
    const available = availability.get(variant.id) ?? 0;
    const purchasable = !variant.archivedAt && variant.product.status === "ACTIVE";
    const unitPrice = money(variant.priceCents);
    const image = variant.product.images[0];
    return {
      id: line.id,
      variantId: variant.id,
      productName: variant.product.name,
      productSlug: variant.product.slug,
      variantTitle: variant.title,
      sku: variant.sku,
      imageUrl: image ? storage.publicUrl(image.storageKey) : null,
      unitPrice,
      quantity: line.quantity,
      lineTotal: multiplyMoney(unitPrice, line.quantity),
      available,
      issue: !purchasable || available === 0 ? "unavailable" : line.quantity > available ? "insufficient_stock" : null,
    };
  });
  const valid = views.filter((line) => line.issue !== "unavailable");
  return {
    lines: views,
    itemCount: views.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: sumMoney(valid.map((line) => line.lineTotal)),
    hasIssues: views.some((line) => line.issue !== null),
  };
}

export async function getCartItemCount(token: string | null | undefined): Promise<number> {
  const cart = await findOpenCart(token);
  if (!cart) return 0;
  const result = await getPrisma().cartLine.aggregate({ where: { cartId: cart.id }, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}
