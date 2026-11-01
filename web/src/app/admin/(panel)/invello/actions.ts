"use server";

import { after } from "next/server";
import {
  addInvelloMainPhoto,
  addInvelloPhoto,
  createLogger,
  sellInvelloProduct,
  setProductStatus,
  syncInvello,
} from "@javis-market/api";
import type { ActionState } from "@/lib/action-state";
import { formText, runAction } from "@/lib/server/actions";
import { requireAdminSession } from "@/lib/server/session";

const logger = createLogger("web.invello");

export async function syncInvelloAction(): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(async () => {
    const result = await syncInvello(admin);
    if (result.skipped) return "A sync is already running. Refresh in a minute.";
    return `Synced ${result.products} product(s)${result.full ? " (full sync)" : ""}.`;
  });
}

export async function sellInvelloProductAction(
  invelloProductId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(async () => {
    await sellInvelloProduct(admin, invelloProductId, { price: formText(formData, "price"), publish: true });
    // Invello sirve las fotos despacio (hasta ~40 s): la principal se descarga después de responder.
    after(() =>
      addInvelloMainPhoto(admin, invelloProductId).catch((error: unknown) =>
        logger.warn("main photo download failed", { invelloProductId, error: String(error) }),
      ),
    );
    return "Added to your store. Its main photo appears in a minute; choose more on the product page.";
  });
}

export async function setSellingAction(productId: string, selling: boolean): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(() => setProductStatus(admin, productId, selling ? "ACTIVE" : "DRAFT").then(() => undefined));
}

export async function addInvelloPhotoAction(invelloProductId: string, index: number): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(() => addInvelloPhoto(admin, invelloProductId, index).then(() => undefined));
}
