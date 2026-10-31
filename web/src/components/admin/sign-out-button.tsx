"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-60"
      onClick={() =>
        startTransition(async () => {
          await authClient.signOut();
          router.replace("/admin/login");
          router.refresh();
        })
      }
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
