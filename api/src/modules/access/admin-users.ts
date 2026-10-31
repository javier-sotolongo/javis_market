import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { getPrisma } from "@javis-market/db";
import { DomainError } from "../../infrastructure/errors";
import { parseInput } from "../../infrastructure/validation";
import type { Actor } from "./actor";
import { requireAdmin } from "./actor";
import { recordAudit } from "./audit";
import { MIN_PASSWORD_LENGTH } from "./auth";

const SYSTEM_CLI: Actor = { type: "system", name: "cli" };

const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(128);

const createAdminSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  name: z.string().trim().min(1).max(120),
  password: passwordSchema,
});

/**
 * Crea un administrador. Solo se usa desde la línea de comandos del servidor (`npm run admin:create`):
 * no existe registro público. Guarda la contraseña con el mismo formato que Better Auth (proveedor `credential`).
 */
export async function createAdminUser(input: { email: string; name: string; password: string }) {
  const data = parseInput(createAdminSchema, input);
  const prisma = getPrisma();
  if (await prisma.user.findUnique({ where: { email: data.email } })) {
    throw new DomainError("conflict", `An admin with email ${data.email} already exists.`);
  }
  const userId = randomUUID();
  const passwordHash = await hashPassword(data.password);
  await prisma.$transaction(async (tx) => {
    await tx.user.create({ data: { id: userId, email: data.email, name: data.name, emailVerified: true } });
    await tx.account.create({
      data: { id: randomUUID(), accountId: userId, providerId: "credential", userId, password: passwordHash },
    });
    await recordAudit(
      SYSTEM_CLI,
      { action: "admin.create", entityType: "admin_user", entityId: userId, changes: { email: data.email } },
      tx,
    );
  });
  return { id: userId, email: data.email };
}

/** Restablece la contraseña desde la línea de comandos y cierra todas las sesiones del administrador. */
export async function resetAdminPassword(input: { email: string; password: string }) {
  const email = input.email.toLowerCase();
  const password = parseInput(passwordSchema, input.password);
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new DomainError("not_found", `No admin with email ${email}.`);
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    await tx.account.updateMany({
      where: { userId: user.id, providerId: "credential" },
      data: { password: passwordHash },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await recordAudit(SYSTEM_CLI, { action: "admin.password_reset", entityType: "admin_user", entityId: user.id }, tx);
  });
}

export async function listAdminUsers(actor: Actor) {
  requireAdmin(actor);
  return getPrisma().user.findMany({
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}
