"use server";

import { createCategory, deleteCategory, updateCategory } from "@javis-market/api";
import type { ActionState } from "@/lib/action-state";
import { formText, runAction } from "@/lib/server/actions";
import { requireAdminSession } from "@/lib/server/session";

function categoryInput(formData: FormData) {
  return {
    name: formText(formData, "name"),
    slug: formText(formData, "slug"),
    description: formText(formData, "description"),
    sortOrder: formText(formData, "sortOrder") || "0",
  };
}

export async function createCategoryAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(async () => {
    await createCategory(admin, categoryInput(formData));
    return "Category created.";
  });
}

export async function updateCategoryAction(
  categoryId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(async () => {
    await updateCategory(admin, categoryId, categoryInput(formData));
    return "Category saved.";
  });
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionState> {
  const admin = await requireAdminSession();
  return runAction(() => deleteCategory(admin, categoryId));
}
