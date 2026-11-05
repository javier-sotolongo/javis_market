import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { getCurrentAdmin } from "@/lib/server/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <Logo variant="full" className="mx-auto h-20 w-auto" priority />
        <h1 className="mt-4 mb-6 text-center text-sm text-gray-500">Store administration</h1>
        <LoginForm />
      </div>
    </main>
  );
}
