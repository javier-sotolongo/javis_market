import sharp from "sharp";
import { DomainError } from "../../infrastructure/errors";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 2000;
const MAX_INPUT_PIXELS = 50_000_000;

/** Formatos de entrada admitidos, detectados por contenido (no por extensión). SVG queda excluido. */
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "gif", "heif"]);

export interface ProcessedImage {
  readonly data: Uint8Array;
  readonly contentType: "image/webp";
  readonly extension: "webp";
  readonly width: number;
  readonly height: number;
  readonly sizeBytes: number;
}

/**
 * Valida y normaliza una imagen de producto: orientación corregida, tamaño máximo, WebP y sin metadatos
 * (EXIF, ubicación). El archivo resultante es siempre generado por el servidor.
 */
export async function processProductImage(input: Uint8Array): Promise<ProcessedImage> {
  if (input.byteLength === 0) {
    throw new DomainError("validation_failed", "The image file is empty.");
  }
  if (input.byteLength > MAX_IMAGE_BYTES) {
    throw new DomainError("payload_too_large", `Images must be ${MAX_IMAGE_BYTES / 1024 / 1024} MB or smaller.`);
  }

  let format: string | undefined;
  try {
    format = (await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata()).format;
  } catch {
    throw new DomainError("validation_failed", "The file is not a valid image.");
  }
  if (!format || !ACCEPTED_FORMATS.has(format)) {
    throw new DomainError("validation_failed", "Unsupported image format. Use JPEG, PNG, WebP, AVIF or GIF.");
  }

  try {
    const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, animated: false })
      .rotate()
      .resize({ width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return {
      data: new Uint8Array(data),
      contentType: "image/webp",
      extension: "webp",
      width: info.width,
      height: info.height,
      sizeBytes: info.size,
    };
  } catch {
    throw new DomainError("validation_failed", "The image could not be processed.");
  }
}
