import Image from "next/image";
import { BRAND_NAME } from "@javis-market/shared";

/**
 * Logo oficial (PNG transparentes en public/brand/, generados desde docs/brand/ con generate-logo-assets.py).
 *   variant  "wordmark": carrito + "Javis Market" (cabeceras, donde el lema sería ilegible);
 *            "full": incluye el lema "Tu mejor opción" (pie, pantallas de acceso).
 *   tone     "color": sobre fondos claros; "reversed": letras azul marino en blanco, para fondos azul marino.
 * La altura se fija con `className` (p. ej. "h-12 w-auto"). Sin optimizador: son recursos estáticos ya ajustados.
 */
const SOURCES = {
  wordmark: {
    color: "/brand/logo-wordmark.png",
    reversed: "/brand/logo-wordmark-reversed.png",
    width: 600,
    height: 220,
  },
  full: { color: "/brand/logo.png", reversed: "/brand/logo-reversed.png", width: 720, height: 309 },
} as const;

export function Logo({
  variant = "wordmark",
  tone = "color",
  className = "h-12 w-auto",
  priority = false,
}: {
  readonly variant?: keyof typeof SOURCES;
  readonly tone?: "color" | "reversed";
  readonly className?: string;
  readonly priority?: boolean;
}) {
  const source = SOURCES[variant];
  return (
    <Image
      src={source[tone]}
      width={source.width}
      height={source.height}
      alt={BRAND_NAME}
      unoptimized
      priority={priority}
      className={className}
    />
  );
}
