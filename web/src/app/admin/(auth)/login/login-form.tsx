"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/button-class";
import { inputClass } from "@/components/ui/fields";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const { error: signInError } = await authClient.signIn.email({
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
          });
          if (signInError) {
            // Mensaje genérico: no revela si la cuenta existe.
            setError(
              signInError.status === 429
                ? "Too many attempts. Please wait a minute and try again."
                : "Invalid email or password.",
            );
            return;
          }
          router.replace("/admin");
          router.refresh();
        });
      }}
    >
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={`${buttonClass("primary")} w-full`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
