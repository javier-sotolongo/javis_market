import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  createProduct,
  deleteProductImage,
  getStoreProduct,
  updateProduct,
  uploadProductImages,
} from "@javis-market/api";
import { admin } from "./helpers";

async function pngBytes(width: number, height: number) {
  return new Uint8Array(
    await sharp({ create: { width, height, channels: 3, background: "#14532d" } })
      .png()
      .withMetadata({ exif: { IFD0: { Copyright: "secret" } } })
      .toBuffer(),
  );
}

describe("product images", () => {
  it("stores uploads as WebP in public storage, resized and without metadata", async () => {
    const product = await createProduct(admin, { name: "Photo product", sku: "IMG-1", price: "3" });
    const { saved, failed } = await uploadProductImages(admin, product.id, [
      { name: "big.png", bytes: await pngBytes(3000, 1500) },
      { name: "fake.png", bytes: new TextEncoder().encode("not an image") },
      {
        name: "logo.svg",
        bytes: new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'),
      },
    ]);
    expect(failed.map((f) => f.name)).toEqual(["fake.png", "logo.svg"]);
    expect(saved).toHaveLength(1);
    const image = saved[0]!;
    expect(image).toMatchObject({
      contentType: "image/webp",
      width: 2000,
      height: 1000,
      source: "UPLOAD",
      position: 0,
    });
    expect(image.storageKey).toMatch(new RegExp(`^products/${product.id}/[0-9a-f-]+\\.webp$`));

    const file = path.join(process.env.STORAGE_PUBLIC_DIR!, image.storageKey);
    expect(existsSync(file)).toBe(true);
    const metadata = await sharp(file).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.exif).toBeUndefined();

    await updateProduct(admin, product.id, { name: "Photo product", status: "ACTIVE" });
    expect((await getStoreProduct(product.slug))?.images[0]?.url).toBe(`/media/${image.storageKey}`);

    await deleteProductImage(admin, image.id);
    expect(existsSync(file)).toBe(false);
  });
});
