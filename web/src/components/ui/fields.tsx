import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { FieldError } from "./action-form";

/** Estilo de control sin ancho fijo (filtros en línea). */
export const controlClass =
  "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-xs placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none";

export const inputClass = `block w-full ${controlClass}`;

/** Etiqueta, ayuda y error de un campo. `htmlFor` es el id del control; `name` es la clave de su error. */
function Field({
  label,
  htmlFor,
  name,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  name: string;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
      <FieldError name={name} />
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  readonly label: string;
  readonly name: string;
  readonly hint?: string;
};

export function TextField({ label, name, hint, id, className = "", ...props }: TextFieldProps) {
  return (
    <Field label={label} htmlFor={id ?? name} name={name} hint={hint}>
      <input id={id ?? name} name={name} className={`${inputClass} ${className}`} {...props} />
    </Field>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  readonly label: string;
  readonly name: string;
  readonly hint?: string;
};

export function TextAreaField({ label, name, hint, id, rows = 5, ...props }: TextAreaFieldProps) {
  return (
    <Field label={label} htmlFor={id ?? name} name={name} hint={hint}>
      <textarea id={id ?? name} name={name} rows={rows} className={inputClass} {...props} />
    </Field>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  readonly label: string;
  readonly name: string;
  readonly hint?: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
};

export function SelectField({ label, name, hint, id, options, ...props }: SelectFieldProps) {
  return (
    <Field label={label} htmlFor={id ?? name} name={name} hint={hint}>
      <select id={id ?? name} name={name} className={inputClass} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
