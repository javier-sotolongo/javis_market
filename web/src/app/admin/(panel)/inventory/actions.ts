"use server";

import { adjustStock } from "@javis-market/api";
import type { ActionState } from "@/lib/action-state";
import { formText, runAction } from "@/lib/server/actions";
import { requireAdminSession } from "@/lib/server/session";

export async function adjustStockAction(
  variantId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(async () => {
    const result = await adjustStock(admin, {
      variantId,
      mode: formText(formData, "mode") as "add" | "remove" | "set",
      quantity: formText(formData, "quantity"),
      note: formText(formData, "note"),
    });
    return result.delta === 0 ? "No change." : `Stock updated. On hand: ${result.onHand}.`;
  });
}
