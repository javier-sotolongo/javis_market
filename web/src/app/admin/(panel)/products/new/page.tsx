import { listCategories } from "@javis-market/api";
import { CategoryCheckboxes } from "@/components/admin/category-checkboxes";
import { Card, PageHeader } from "@/components/admin/page-header";
import { VariantFields } from "@/components/admin/variant-fields";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { TextAreaField, TextField } from "@/components/ui/fields";
import { requireAdminSession } from "@/lib/server/session";
import { createProductAction } from "../actions";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const admin = await requireAdminSession();
  const categories = await listCategories(admin);

  return (
    <>
      <PageHeader
        title="New product"
        description="The product is saved as a draft. You can add photos and publish it on the next screen."
      />
      <ActionForm action={createProductAction} className="space-y-6">
        <Card title="Details">
          <div className="grid gap-4">
            <TextField label="Name" name="name" required maxLength={200} />
            <TextAreaField label="Description" name="description" rows={6} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Brand" name="brand" placeholder="Optional" />
              <TextField
                label="Supplier"
                name="supplier"
                placeholder="e.g. Deliflow"
                hint="Internal reference, not shown in the store."
              />
            </div>
            <CategoryCheckboxes categories={categories} />
          </div>
        </Card>
        <Card title="Price & SKU">
          <VariantFields />
        </Card>
        <Card title="Inventory">
          <div className="max-w-xs">
            <TextField
              label="Initial stock"
              name="initialStock"
              inputMode="numeric"
              defaultValue="0"
              hint="Units you have on hand now."
            />
          </div>
        </Card>
        <div className="flex justify-end">
          <SubmitButton pendingLabel="Creating…">Create product</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
