import { listCategories } from "@javis-market/api";
import { Card, PageHeader } from "@/components/admin/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { TextAreaField, TextField } from "@/components/ui/fields";
import { requireAdminSession } from "@/lib/server/session";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "./actions";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const admin = await requireAdminSession();
  const categories = await listCategories(admin);

  return (
    <>
      <PageHeader
        title="Categories"
        description="Categories group products in the store navigation. Only categories with published products are shown."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500">No categories yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {categories.map((category) => (
                  <li key={category.id} className="py-3">
                    <details>
                      <summary className="flex cursor-pointer items-center justify-between gap-4">
                        <span>
                          <span className="font-medium">{category.name}</span>{" "}
                          <span className="text-xs text-gray-500">/categories/{category.slug}</span>
                        </span>
                        <span className="text-xs text-gray-500">{category._count.products} product(s)</span>
                      </summary>
                      <ActionForm
                        action={updateCategoryAction.bind(null, category.id)}
                        className="mt-3 grid gap-3 sm:grid-cols-2"
                      >
                        <TextField
                          label="Name"
                          name="name"
                          id={`name-${category.id}`}
                          required
                          defaultValue={category.name}
                        />
                        <TextField
                          label="URL slug"
                          name="slug"
                          id={`slug-${category.id}`}
                          defaultValue={category.slug}
                        />
                        <div className="sm:col-span-2">
                          <TextAreaField
                            label="Description"
                            name="description"
                            rows={2}
                            defaultValue={category.description}
                          />
                        </div>
                        <TextField
                          label="Sort order"
                          name="sortOrder"
                          id={`sort-${category.id}`}
                          inputMode="numeric"
                          defaultValue={category.sortOrder}
                        />
                        <div className="flex items-end justify-between gap-2 sm:col-span-2">
                          <SubmitButton>Save</SubmitButton>
                          <ActionButton
                            action={deleteCategoryAction.bind(null, category.id)}
                            variant="danger"
                            confirm={`Delete "${category.name}"? Products stay, but lose this category.`}
                          >
                            Delete
                          </ActionButton>
                        </div>
                      </ActionForm>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card title="New category">
          <ActionForm action={createCategoryAction} resetOnSuccess className="grid gap-3">
            <TextField label="Name" name="name" id="new-name" required />
            <TextField label="URL slug" name="slug" id="new-slug" placeholder="Generated from the name" />
            <TextAreaField label="Description" name="description" rows={2} />
            <TextField
              label="Sort order"
              name="sortOrder"
              id="new-sort"
              inputMode="numeric"
              defaultValue="0"
              hint="Lower numbers appear first."
            />
            <div>
              <SubmitButton>Create category</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
