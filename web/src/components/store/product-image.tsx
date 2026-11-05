import { Package } from "lucide-react";
import Image from "next/image";
import type { StoreImage } from "@javis-market/api";

/**
 * Imagen de producto dentro de un contenedor de proporción fija (sin saltos de contenido), con `object-contain` para
 * conservar el empaque completo.
 *   Fotos de estudio (cuadradas, fondo blanco): margen interior y `mix-blend-multiply`, el blanco se funde con la baldosa.
 *   Fotos reales no cuadradas (fondo propio gris, mesa…): ocupan todo el ancho sobre una copia ampliada y desenfocada
 *   de sí mismas, para que no se vean como un rectángulo flotando dentro de la baldosa.
 * Sin foto, muestra un respaldo neutro: no implica falta de stock.
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
  const unoptimized = !image.url.startsWith("/");
  // Sin dimensiones conocidas (p. ej. líneas del carrito) se trata como foto de estudio: conserva el margen.
  const ratio = image.width > 0 && image.height > 0 ? image.width / image.height : 1;
  const isSquare = ratio > 0.92 && ratio < 1.08;
  if (isSquare) {
    return (
      <Image
        src={image.url}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        className={`object-contain mix-blend-multiply ${className}`}
      />
    );
  }
  return (
    <>
      <Image
        src={image.url}
        alt=""
        aria-hidden
        fill
        sizes="96px"
        unoptimized={unoptimized}
        className="scale-125 object-cover opacity-90 blur-2xl"
      />
      <Image
        src={image.url}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        className={`object-contain ${className} p-0!`}
      />
    </>
  );
}
