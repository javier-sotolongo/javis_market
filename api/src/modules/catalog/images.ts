import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getPrisma, type ImageSource } from "@javis-market/db";
import { getFileStorage } from "../../adapters/storage";
import { DomainError, notFound } from "../../infrastructure/errors";
import { createLogger } from "../../infrastructure/logger";
import { type Actor, recordAudit, requireAdmin, requireAdminOrSystem } from "../access";
import { processProductImage } from "./image-processing";
import { downloadRemoteImage } from "./remote-image";

const logger = createLogger("catalog.images");

export const MAX_IMAGES_PER_PRODUCT = 20;
export const MAX_FILES_PER_UPLOAD = 10;

async function storeImage(
  actor: Actor,
  productId: string,
  input: { body: Uint8Array; source: ImageSource; sourceUrl?: string; altText?: string },
) {
  const processed = await processProductImage(input.body);
  const storage = getFileStorage();
  const storageKey = `products/${productId}/${randomUUID()}.${processed.extension}`;

  // El archivo se escribe antes de la transacción (sin mantenerla abierta durante E/S);
  // si la transacción falla, se elimina para no dejar huérfanos.
  await storage.put({
    visibility: "public",
    key: storageKey,
    contentType: processed.contentType,
    body: processed.data,
  });
  try {
    return await getPrisma().$transaction(async (tx) => {
      const count = await tx.productImage.count({ where: { productId } });
      if (count >= MAX_IMAGES_PER_PRODUCT) {
        throw new DomainError(
          "business_rule_violation",
          `A product can have at most ${MAX_IMAGES_PER_PRODUCT} images.`,
        );
      }
      const image = await tx.productImage.create({
        data: {
          productId,
          storageKey,
          contentType: processed.contentType,
          width: processed.width,
          height: processed.height,
          sizeBytes: processed.sizeBytes,
          altText: input.altText?.trim().slice(0, 300) ?? "",
          position: count,
          source: input.source,
          sourceUrl: input.sourceUrl ?? null,
        },
      });
      await recordAudit(
        actor,
        {
          action: "product.image.add",
          entityType: "product",
          entityId: productId,
          changes: { imageId: image.id, source: input.source, sourceUrl: input.sourceUrl ?? null },
        },
        tx,
      );
      return image;
    });
  } catch (error) {
    await storage
      .delete({ visibility: "public", key: storageKey })
      .catch((e: unknown) => logger.error("orphan cleanup failed", { storageKey, error: String(e) }));
    throw error;
  }
}

async function assertProductExists(productId: string) {
  const product = await getPrisma().product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw notFound("Product");
}

/** Sube una o varias fotos desde el formulario del panel. Devuelve las guardadas y los errores por archivo. */
export async function uploadProductImages(
  actor: Actor,
  productId: string,
  files: readonly { readonly name: string; readonly bytes: Uint8Array }[],
) {
  requireAdmin(actor);
  await assertProductExists(productId);
  if (files.length === 0) throw new DomainError("validation_failed", "Choose at least one image.");
  if (files.length > MAX_FILES_PER_UPLOAD) {
    throw new DomainError("validation_failed", `Upload at most ${MAX_FILES_PER_UPLOAD} images at a time.`);
  }
  const saved = [];
  const failed: { name: string; message: string }[] = [];
  for (const file of files) {
    try {
      saved.push(await storeImage(actor, productId, { body: file.bytes, source: "UPLOAD" }));
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      failed.push({ name: file.name, message: error.message });
    }
  }
  return { saved, failed };
}

/** Descarga una imagen desde otro almacenamiento y la guarda en el VPS (la tienda no depende del origen). */
export async function importProductImageFromUrl(
  actor: Actor,
  productId: string,
  input: { url: string; altText?: string },
) {
  requireAdmin(actor);
  await assertProductExists(productId);
  const { url, body } = await downloadRemoteImage(input.url);
  return storeImage(actor, productId, {
    body,
    source: "URL_IMPORT",
    sourceUrl: url,
    ...(input.altText ? { altText: input.altText } : {}),
  });
}

export async function updateProductImageAlt(actor: Actor, imageId: string, altText: string) {
  requireAdmin(actor);
  const image = await getPrisma()
    .productImage.update({ where: { id: imageId }, data: { altText: altText.trim().slice(0, 300) } })
    .catch(() => null);
  if (!image) throw notFound("Image");
  return image;
}

/** Mueve una imagen una posición; la primera es la imagen principal del producto. */
export async function moveProductImage(actor: Actor, imageId: string, direction: "up" | "down") {
  requireAdmin(actor);
  await getPrisma().$transaction(async (tx) => {
    const image = await tx.productImage.findUnique({ where: { id: imageId } });
    if (!image) throw notFound("Image");
    const images = await tx.productImage.findMany({
      where: { productId: image.productId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    const index = images.findIndex((i) => i.id === imageId);
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;
    [images[index], images[target]] = [images[target]!, images[index]!];
    for (const [position, item] of images.entries()) {
      if (item.position !== position) await tx.productImage.update({ where: { id: item.id }, data: { position } });
    }
  });
}

export async function deleteProductImage(actor: Actor, imageId: string) {
  requireAdmin(actor);
  const image = await getPrisma().$transaction(async (tx) => {
    const found = await tx.productImage.findUnique({ where: { id: imageId } });
    if (!found) throw notFound("Image");
    await tx.productImage.delete({ where: { id: imageId } });
    const rest = await tx.productImage.findMany({
      where: { productId: found.productId },
      orderBy: { position: "asc" },
    });
    for (const [position, item] of rest.entries()) {
      if (item.position !== position) await tx.productImage.update({ where: { id: item.id }, data: { position } });
    }
    await recordAudit(
      actor,
      {
        action: "product.image.delete",
        entityType: "product",
        entityId: found.productId,
        changes: { imageId, storageKey: found.storageKey },
      },
      tx,
    );
    return found;
  });
  // El archivo se borra tras confirmar la transacción; un fallo aquí solo deja un archivo huérfano (se registra).
  await getFileStorage()
    .delete({ visibility: "public", key: image.storageKey })
    .catch((error: unknown) =>
      logger.error("image file delete failed", { storageKey: image.storageKey, error: String(error) }),
    );
}

/**
 * Miniatura WebP de una imagen remota, sin guardarla: para previsualizar en el panel imágenes de proveedores que no
 * se pueden enlazar directamente. Usa la misma descarga protegida que la importación por URL.
 */
export async function previewRemoteImage(actor: Actor, url: string, size = 160): Promise<Uint8Array> {
  requireAdminOrSystem(actor);
  const { body } = await downloadRemoteImage(url);
  try {
    return new Uint8Array(
      await sharp(body, { limitInputPixels: 50_000_000 })
        .rotate()
        .resize(size, size, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 70 })
        .toBuffer(),
    );
  } catch {
    throw new DomainError("validation_failed", "The file is not a valid image.");
  }
}

export function productImageUrl(storageKey: string): string {
  return getFileStorage().publicUrl(storageKey);
}
