"use server";

import { addToCart, removeCartLine, updateCartLine } from "@javis-market/api";
import type { ActionState } from "@/lib/action-state";
import { formText, runAction } from "@/lib/server/actions";
import { getCartToken, setCartToken } from "@/lib/server/cart-cookie";

export async function addToCartAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const current = await getCartToken();
    const { token } = await addToCart(current, {
      variantId: formText(formData, "variantId"),
      quantity: formText(formData, "quantity") || "1",
    });
    if (token !== current) await setCartToken(token);
    return "Added to your cart.";
  });
}

export async function updateCartLineAction(
  lineId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await updateCartLine(await getCartToken(), { lineId, quantity: formText(formData, "quantity") });
  });
}

export async function removeCartLineAction(lineId: string): Promise<ActionState> {
  return runAction(async () => removeCartLine(await getCartToken(), lineId));
}
