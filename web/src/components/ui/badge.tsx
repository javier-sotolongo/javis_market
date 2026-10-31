import type { ReactNode } from "react";

const tones = {
  gray: "bg-gray-100 text-gray-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
} as const;

export function Badge({
  tone = "gray",
  children,
}: {
  readonly tone?: keyof typeof tones;
  readonly children: ReactNode;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
