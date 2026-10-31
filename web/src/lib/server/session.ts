import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type AdminActor, getAdminActor } from "@javis-market/api";

/** Actor administrativo de la petición actual, o `null`. */
export async function getCurrentAdmin(): Promise<AdminActor | null> {
  return getAdminActor(await headers());
}

/** Para páginas y acciones del panel: redirige al login si no hay sesión válida. */
export async function requireAdminSession(): Promise<AdminActor> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
