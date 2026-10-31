import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND_NAME } from "@javis-market/shared";
import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { requireAdminSession } from "@/lib/server/session";

// El panel siempre se renderiza por petición y exige sesión en el servidor.
export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { readonly children: ReactNode }) {
  const admin = await requireAdminSession();
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
      <aside className="border-b border-gray-200 bg-white p-4 md:w-56 md:shrink-0 md:border-r md:border-b-0">
        <Link href="/admin" className="mb-4 block font-semibold text-brand">
          {BRAND_NAME}
          <span className="block text-xs font-normal text-gray-500">Admin</span>
        </Link>
        <AdminNav />
        <div className="mt-6 hidden border-t border-gray-100 pt-4 md:block">
          <p className="truncate text-xs text-gray-500" title={admin.email}>
            {admin.email}
          </p>
          <SignOutButton />
          <Link href="/" className="mt-2 block text-sm text-gray-600 hover:text-gray-900">
            View store ↗
          </Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      <div className="flex items-center justify-between border-t border-gray-200 bg-white p-4 md:hidden">
        <SignOutButton />
        <Link href="/" className="text-sm text-gray-600">
          View store ↗
        </Link>
      </div>
    </div>
  );
}
