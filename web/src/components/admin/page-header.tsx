import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({
  title,
  children,
  actions,
}: {
  readonly title?: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}
