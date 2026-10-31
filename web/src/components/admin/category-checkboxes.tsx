import Link from "next/link";
import { FieldError } from "@/components/ui/action-form";

export function CategoryCheckboxes({
  categories,
  selected = [],
}: {
  readonly categories: readonly { readonly id: string; readonly name: string }[];
  readonly selected?: readonly string[];
}) {
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-medium text-gray-700">Categories</legend>
      {categories.length === 0 ? (
        <p className="text-sm text-gray-500">
          No categories yet.{" "}
          <Link href="/admin/categories" className="text-brand underline">
            Create one
          </Link>
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <label
              key={category.id}
              className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm has-checked:border-brand has-checked:bg-brand-soft"
            >
              <input
                type="checkbox"
                name="categoryIds"
                value={category.id}
                defaultChecked={selected.includes(category.id)}
                className="accent-brand"
              />
              {category.name}
            </label>
          ))}
        </div>
      )}
      <FieldError name="categoryIds" />
    </fieldset>
  );
}
