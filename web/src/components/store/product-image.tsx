import { Package } from "lucide-react";
import Image from "next/image";
import type { StoreImage } from "@javis-market/api";

/**
 * Imagen de producto dentro de un contenedor de proporción fija (sin saltos de contenido), con `object-contain`
 * para conservar el empaque completo y `mix-blend-multiply` para que el fondo blanco de la foto se funda con la
 * baldosa. Sin foto, muestra un respaldo neutro: no implica falta de stock.
 */
export function ProductImage({
  image,
  sizes,
  priority = false,
  className = "",
}: {
  readonly image: StoreImage | null;
  readonly sizes: string;
  readonly priority?: boolean;
  readonly className?: string;
}) {
  if (!image) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-2 text-ink-subtle/35">
        <Package aria-hidden strokeWidth={1} className="size-1/4 max-h-16 max-w-16" />
        <span className="text-xs font-medium text-ink-subtle/70">Photo coming soon</span>
      </div>
    );
  }
  return (
    <Image
      src={image.url}
      alt={image.alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!image.url.startsWith("/")}
      className={`object-contain mix-blend-multiply ${className}`}
    />
  );
}
