import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly children?: ReactNode;
  readonly action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-surface px-6 py-14 text-center shadow-card">
      <span className="flex size-14 items-center justify-center rounded-full bg-canvas text-ink-subtle">
        <Icon aria-hidden className="size-7" strokeWidth={1.5} />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-ink">{title}</h2>
      {children ? <div className="mt-1 max-w-md text-sm text-ink-muted">{children}</div> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
