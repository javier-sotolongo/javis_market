"use client";

import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

/** Select que envía su formulario al cambiar (el formulario incluye un botón de respaldo para uso sin JavaScript). */
export function SubmitOnChangeSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(event) => event.currentTarget.form?.requestSubmit()} />;
}

export function SubmitOnChangeCheckbox(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" {...props} onChange={(event) => event.currentTarget.form?.requestSubmit()} />;
}
