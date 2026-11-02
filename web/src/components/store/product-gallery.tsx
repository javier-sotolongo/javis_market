"use client";

import { useState } from "react";
import type { StoreImage } from "@javis-market/api";
import { ProductImage } from "./product-image";

/** Galería de la ficha: imagen principal en proporción fija y miniaturas accesibles por teclado. */
export function ProductGallery({ images, name }: { readonly images: readonly StoreImage[]; readonly name: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? null;
  return (
    <div className="lg:sticky lg:top-36">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface shadow-card">
        <ProductImage image={current} sizes="(min-width: 1024px) 45vw, 100vw" priority className="p-[10%]" />
      </div>
      {images.length > 1 ? (
        <ul className="mt-3 grid grid-cols-5 gap-3" aria-label={`${name} images`}>
          {images.map((image, i) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-pressed={i === index}
                className={`relative block aspect-square w-full overflow-hidden rounded-lg bg-surface ring-2 ring-offset-2 ring-offset-canvas ${
                  i === index ? "ring-ink" : "ring-transparent hover:ring-line-strong"
                }`}
              >
                <ProductImage image={{ ...image, alt: "" }} sizes="120px" className="p-2" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
