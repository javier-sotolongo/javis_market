"use client";

import { createContext, type ReactNode, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { type ActionState, IDLE } from "@/lib/action-state";
import { buttonClass } from "./button-class";

interface FormContextValue {
  readonly state: ActionState;
  readonly pending: boolean;
}

const FormContext = createContext<FormContextValue>({ state: IDLE, pending: false });

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Formulario conectado a una Server Action. Muestra el mensaje global y los errores por campo y conserva lo escrito
 * cuando hay errores (React restablece los formularios con `action` por defecto; aquí se envía con `onSubmit`).
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  showSuccess = true,
  confirm,
}: {
  readonly action: Action;
  readonly children: ReactNode;
  readonly className?: string;
  readonly resetOnSuccess?: boolean;
  readonly showSuccess?: boolean;
  readonly confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.status === "success") formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <FormContext value={{ state, pending }}>
      <form
        ref={formRef}
        className={className}
        onSubmit={(event) => {
          event.preventDefault();
          if (confirm && !window.confirm(confirm)) return;
          const formData = new FormData(event.currentTarget);
          startTransition(() => formAction(formData));
        }}
      >
        {children}
        <FormMessage showSuccess={showSuccess} />
      </form>
    </FormContext>
  );
}

function FormMessage({ showSuccess }: { readonly showSuccess: boolean }) {
  const { state } = useContext(FormContext);
  if (state.status === "error") {
    return (
      <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.message}
      </p>
    );
  }
  if (state.status === "success" && showSuccess && state.message) {
    return (
      <p role="status" className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        {state.message}
      </p>
    );
  }
  return null;
}

export function FieldError({ name }: { readonly name: string }) {
  const { state } = useContext(FormContext);
  const message = state.status === "error" ? state.fieldErrors[name] : undefined;
  return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null;
}

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
}: {
  readonly children: ReactNode;
  readonly pendingLabel?: string;
  readonly variant?: "primary" | "secondary" | "danger" | "ghost";
  readonly className?: string;
}) {
  const { pending } = useContext(FormContext);
  return (
    <button type="submit" disabled={pending} className={`${buttonClass(variant)} ${className}`}>
      {pending ? (pendingLabel ?? "Saving…") : children}
    </button>
  );
}
