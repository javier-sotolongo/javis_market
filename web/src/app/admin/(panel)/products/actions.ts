"use server";

import { redirect } from "next/navigation";
import {
  DomainError,
  addVariant,
  createProduct,
  deleteProductImage,
  importProductImageFromUrl,
  moveProductImage,
  setVariantArchived,
  updateProduct,
  updateProductImageAlt,
  updateVariant,
  uploadProductImages,
} from "@javis-market/api";
import type { ActionState } from "@/lib/action-state";
import { formFiles, formText, formTexts, runAction } from "@/lib/server/actions";
import { requireAdminSession } from "@/lib/server/session";

// El valor real lo valida el servicio con Zod; aquí solo se tipa la cadena del formulario.
type ProductStatusValue = "DRAFT" | "ACTIVE" | "ARCHIVED";

function variantInput(formData: FormData) {
  return {
    sku: formText(formData, "sku"),
    title: formText(formData, "title"),
    price: formText(formData, "price"),
    compareAtPrice: formText(formData, "compareAtPrice"),
    cost: formText(formData, "cost"),
    weightGrams: formText(formData, "weightGrams"),
  };
}

function productInput(formData: FormData) {
  return {
    name: formText(formData, "name"),
    slug: formText(formData, "slug"),
    description: formText(formData, "description"),
    brand: formText(formData, "brand"),
    supplier: formText(formData, "supplier"),
    categoryIds: formTexts(formData, "categoryIds"),
  };
}

export async function createProductAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdminSession();
  let productId = "";
  const result = await runAction(async () => {
    const product = await createProduct(admin, {
      ...productInput(formData),
      ...variantInput(formData),
      initialStock: formText(formData, "initialStock") || "0",
    });
    productId = product.id;
  });
  if (result.status === "success") redirect(`/admin/products/${productId}?created=1`);
  return result;
}

export async function updateProductAction(
  productId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(async () => {
    await updateProduct(admin, productId, {
      ...productInput(formData),
      status: formText(formData, "status") as ProductStatusValue,
    });
    return "Product saved.";
  });
}

export async function addVariantAction(
  productId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(async () => {
    await addVariant(admin, productId, variantInput(formData));
    return "Variant added.";
  });
}

export async function updateVariantAction(
  variantId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(async () => {
    await updateVariant(admin, variantId, variantInput(formData));
    return "Variant saved.";
  });
}

export async function setVariantArchivedAction(variantId: string, archived: boolean): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(() => setVariantArchived(admin, variantId, archived));
}

export async function uploadImagesAction(
  productId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(async () => {
    const { saved, failed } = await uploadProductImages(admin, productId, await formFiles(formData, "images"));
    const failures = failed.map((f) => `${f.name}: ${f.message}`).join(" ");
    if (saved.length === 0 && failed.length > 0) {
      throw new DomainError("validation_failed", failures);
    }
    return failed.length
      ? `${saved.length} image(s) uploaded. Not uploaded — ${failures}`
      : `${saved.length} image(s) uploaded.`;
  });
}

export async function importImageAction(
  productId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(async () => {
    await importProductImageFromUrl(admin, productId, {
      url: formText(formData, "url"),
      altText: formText(formData, "altText"),
    });
    return "Image imported and saved.";
  });
}

export async function updateImageAltAction(
  imageId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(async () => {
    await updateProductImageAlt(admin, imageId, formText(formData, "altText"));
    return "Saved.";
  });
}

export async function moveImageAction(imageId: string, direction: "up" | "down"): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(() => moveProductImage(admin, imageId, direction));
}

export async function deleteImageAction(imageId: string): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(() => deleteProductImage(admin, imageId));
}
