import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BRAND_NAME } from "@javis-market/shared";
import { getCurrentAdmin } from "@/lib/server/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-xl font-semibold text-brand">{BRAND_NAME}</p>
        <h1 className="mt-1 mb-6 text-sm text-gray-500">Store administration</h1>
        <LoginForm />
      </div>
    </main>
  );
}
