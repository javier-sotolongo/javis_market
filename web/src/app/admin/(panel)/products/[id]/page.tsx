import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  type AdminActor,
  MAX_FILES_PER_UPLOAD,
  MAX_IMAGES_PER_PRODUCT,
  getInvelloPhotosForProduct,
  getProductForAdmin,
  isDomainError,
  listCategories,
  productImageUrl,
} from "@javis-market/api";
import { formatMoney, money } from "@javis-market/shared";
import { CategoryCheckboxes } from "@/components/admin/category-checkboxes";
import { Card, PageHeader } from "@/components/admin/page-header";
import { ProductStatusBadge } from "@/components/admin/product-status-badge";
import { VariantFields } from "@/components/admin/variant-fields";
import { ActionButton } from "@/components/ui/action-button";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { SelectField, TextAreaField, TextField, inputClass } from "@/components/ui/fields";
import { requireAdminSession } from "@/lib/server/session";
import { addInvelloPhotoAction } from "../../invello/actions";
import {
  addVariantAction,
  deleteImageAction,
  importImageAction,
  moveImageAction,
  setVariantArchivedAction,
  updateImageAltAction,
  updateProductAction,
  updateVariantAction,
  uploadImagesAction,
} from "../actions";

export const metadata = { title: "Edit product" };

async function loadProduct(admin: AdminActor, id: string) {
  try {
    return await getProductForAdmin(admin, id);
  } catch (error) {
    if (isDomainError(error) && error.code === "not_found") notFound();
    throw error;
  }
}

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const admin = await requireAdminSession();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [product, categories, invello, { created }] = await Promise.all([
    loadProduct(admin, id),
    listCategories(admin),
    getInvelloPhotosForProduct(admin, id),
    searchParams,
  ]);
  const activeVariants = product.variants.filter((v) => !v.archivedAt);

  return (
    <>
      <PageHeader
        title={product.name}
        description={`/products/${product.slug}`}
        actions={
          <>
            <ProductStatusBadge status={product.status} />
            {product.status === "ACTIVE" ? (
              <Link href={`/products/${product.slug}`} className="text-sm text-gray-600 underline" target="_blank">
                View in store ↗
              </Link>
            ) : null}
          </>
        }
      />

      {created ? (
        <p className="mb-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Product created as a draft. Add photos below, then set the status to <strong>Published</strong> to show it in
          the store.
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Details">
            <ActionForm action={updateProductAction.bind(null, product.id)} className="grid gap-4">
              <TextField label="Name" name="name" required defaultValue={product.name} />
              <TextField
                label="URL slug"
                name="slug"
                defaultValue={product.slug}
                hint="Changing it breaks existing links to this product."
              />
              <TextAreaField label="Description" name="description" rows={8} defaultValue={product.description} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Brand" name="brand" defaultValue={product.brand ?? ""} />
                <TextField
                  label="Supplier"
                  name="supplier"
                  defaultValue={product.supplier ?? ""}
                  hint="Internal reference."
                />
              </div>
              <CategoryCheckboxes categories={categories} selected={product.categoryIds} />
              <SelectField
                label="Status"
                name="status"
                defaultValue={product.status}
                options={[
                  { value: "DRAFT", label: "Draft — hidden from the store" },
                  { value: "ACTIVE", label: "Published — visible in the store" },
                  { value: "ARCHIVED", label: "Archived" },
                ]}
              />
              <div>
                <SubmitButton>Save product</SubmitButton>
              </div>
            </ActionForm>
          </Card>

          <Card title={`Photos (${product.images.length}/${MAX_IMAGES_PER_PRODUCT})`}>
            {product.images.length === 0 ? (
              <p className="mb-4 text-sm text-gray-500">
                No photos yet. The first photo is the main image in the store.
              </p>
            ) : (
              <ul className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {product.images.map((image, index) => (
                  <li key={image.id} className="rounded-lg border border-gray-200 p-2">
                    <div className="relative aspect-square overflow-hidden rounded-md bg-gray-100">
                      <Image
                        src={productImageUrl(image.storageKey)}
                        alt={image.altText}
                        fill
                        sizes="200px"
                        unoptimized
                        className="object-contain"
                      />
                      {index === 0 ? (
                        <span className="absolute top-1 left-1">
                          <Badge tone="green">Main</Badge>
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500" title={image.sourceUrl ?? undefined}>
                      {image.source === "URL_IMPORT" ? "Imported from URL" : "Uploaded"} · {image.width}×{image.height}
                    </p>
                    <ActionForm action={updateImageAltAction.bind(null, image.id)} className="mt-2" showSuccess={false}>
                      <label className="sr-only" htmlFor={`alt-${image.id}`}>
                        Alt text
                      </label>
                      <div className="flex gap-1">
                        <input
                          id={`alt-${image.id}`}
                          name="altText"
                          defaultValue={image.altText}
                          placeholder="Alt text"
                          className={`${inputClass} px-2 py-1 text-xs`}
                        />
                        <SubmitButton variant="secondary" className="px-2 py-1 text-xs" pendingLabel="…">
                          Save
                        </SubmitButton>
                      </div>
                    </ActionForm>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <ActionButton
                        action={moveImageAction.bind(null, image.id, "up")}
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        title="Move earlier"
                      >
                        ←
                      </ActionButton>
                      <ActionButton
                        action={moveImageAction.bind(null, image.id, "down")}
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        title="Move later"
                      >
                        →
                      </ActionButton>
                      <ActionButton
                        action={deleteImageAction.bind(null, image.id)}
                        variant="danger"
                        className="px-2 py-1 text-xs"
                        confirm="Delete this photo?"
                      >
                        Delete
                      </ActionButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid gap-6 border-t border-gray-100 pt-4 lg:grid-cols-2">
              <ActionForm action={uploadImagesAction.bind(null, product.id)} resetOnSuccess className="space-y-2">
                <label htmlFor="images" className="block text-sm font-medium text-gray-700">
                  Upload photos
                </label>
                <input
                  id="images"
                  name="images"
                  type="file"
                  multiple
                  required
                  accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm"
                />
                <p className="text-xs text-gray-500">
                  JPEG, PNG, WebP, AVIF or GIF · up to 10 MB each · {MAX_FILES_PER_UPLOAD} at a time.
                </p>
                <FieldError name="images" />
                <SubmitButton pendingLabel="Uploading…">Upload</SubmitButton>
              </ActionForm>

              <ActionForm action={importImageAction.bind(null, product.id)} resetOnSuccess className="space-y-2">
                <TextField
                  label="Import from URL"
                  name="url"
                  type="url"
                  required
                  placeholder="https://…"
                  hint="The image is downloaded and stored on this server."
                />
                <TextField label="Alt text" name="altText" id="import-alt" placeholder="Optional" />
                <SubmitButton variant="secondary" pendingLabel="Importing…">
                  Import image
                </SubmitButton>
              </ActionForm>
            </div>
          </Card>

          {invello && invello.photos.length > 0 ? (
            <div id="supplier-photos">
              <Card title="Supplier photos (Invello)">
                <p className="mb-4 text-sm text-gray-500">
                  Choose which supplier photos to use. Each one is downloaded and stored on this server; it can take up
                  to a minute.
                </p>
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {invello.photos.map((photo) => (
                    <li key={photo.url} className="rounded-lg border border-gray-200 p-2">
                      <div className="relative aspect-square overflow-hidden rounded-md bg-gray-100">
                        {/* Miniatura servida por el propio panel (ruta protegida), no por Invello. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/admin/invello/${invello.invelloProductId}/image?i=${photo.index}`}
                          alt=""
                          loading="lazy"
                          className="size-full object-contain"
                        />
                      </div>
                      <div className="mt-2">
                        {photo.added ? (
                          <Badge tone="green">Added</Badge>
                        ) : (
                          <ActionButton
                            action={addInvelloPhotoAction.bind(null, invello.invelloProductId, photo.index)}
                            className="px-2 py-1 text-xs"
                            pendingLabel="Downloading…"
                          >
                            Add photo
                          </ActionButton>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card title="Variants">
            <ul className="space-y-3">
              {product.variants.map((variant) => (
                <li
                  key={variant.id}
                  className={`rounded-lg border p-3 ${variant.archivedAt ? "border-dashed border-gray-200 opacity-70" : "border-gray-200"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{variant.title}</p>
                      <p className="text-xs text-gray-500">{variant.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatMoney(money(variant.priceCents))}</p>
                      <Link href={`/admin/inventory/${variant.id}`} className="text-xs text-gray-500 underline">
                        {variant.stockLevel?.onHand ?? 0} on hand
                      </Link>
                    </div>
                  </div>
                  {variant.archivedAt ? (
                    <div className="mt-2 flex items-center justify-between">
                      <Badge>Archived</Badge>
                      <ActionButton
                        action={setVariantArchivedAction.bind(null, variant.id, false)}
                        className="px-2 py-1 text-xs"
                      >
                        Restore
                      </ActionButton>
                    </div>
                  ) : (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-gray-600">Edit</summary>
                      <ActionForm action={updateVariantAction.bind(null, variant.id)} className="mt-3 space-y-3">
                        <VariantFields idPrefix={variant.id} defaults={variant} compact />
                        <div className="flex flex-wrap justify-between gap-2">
                          <SubmitButton>Save variant</SubmitButton>
                        </div>
                      </ActionForm>
                      <div className="mt-2">
                        <ActionButton
                          action={setVariantArchivedAction.bind(null, variant.id, true)}
                          variant="danger"
                          className="px-2 py-1 text-xs"
                          confirm="Archive this variant? It will no longer be sold."
                        >
                          Archive variant
                        </ActionButton>
                      </div>
                    </details>
                  )}
                </li>
              ))}
            </ul>
            {activeVariants.length === 0 ? (
              <p className="mt-3 text-sm text-amber-700">Add a variant to be able to publish this product.</p>
            ) : null}
            <details className="mt-4 border-t border-gray-100 pt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">Add variant</summary>
              <ActionForm action={addVariantAction.bind(null, product.id)} resetOnSuccess className="mt-3 space-y-3">
                <VariantFields idPrefix="new" compact />
                <p className="text-xs text-gray-500">New variants start with 0 units; add stock from Inventory.</p>
                <SubmitButton>Add variant</SubmitButton>
              </ActionForm>
            </details>
          </Card>
        </div>
      </div>
    </>
  );
}
