/** Clases de botón compartidas por componentes de servidor y de cliente (tienda y panel). */
export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors select-none disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-contrast hover:bg-brand-hover active:bg-brand-active",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink-subtle hover:bg-canvas",
  danger: "border border-danger/30 bg-surface text-danger hover:bg-danger-soft",
  ghost: "text-ink-muted hover:bg-canvas-muted hover:text-ink",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]}`;
}
