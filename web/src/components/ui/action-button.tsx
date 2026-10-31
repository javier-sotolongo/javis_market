"use client";

import { type ReactNode, useState, useTransition } from "react";
import type { ActionState } from "@/lib/action-state";
import { buttonClass } from "./button-class";

/** Botón que ejecuta una Server Action sin campos (archivar, mover, eliminar…), con confirmación opcional. */
export function ActionButton({
  action,
  children,
  confirm,
  variant = "secondary",
  className = "",
  title,
}: {
  readonly action: () => Promise<ActionState>;
  readonly children: ReactNode;
  readonly confirm?: string;
  readonly variant?: "primary" | "secondary" | "danger" | "ghost";
  readonly className?: string;
  readonly title?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        title={title}
        aria-label={title}
        disabled={pending}
        className={`${buttonClass(variant)} ${className}`}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(null);
          startTransition(async () => {
            const result = await action();
            if (result.status === "error") setError(result.message);
          });
        }}
      >
        {children}
      </button>
      {error ? (
        <span role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </span>
  );
}
