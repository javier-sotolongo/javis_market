import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getPrisma } from "@javis-market/db";
import { getAppEnvironment, optionalEnv, requireEnv } from "../../config/env";
import { createLogger } from "../../infrastructure/logger";
import type { AdminActor } from "./actor";
import { recordAudit } from "./audit";

const logger = createLogger("auth");

export const MIN_PASSWORD_LENGTH = 12;

function createAuth() {
  const baseURL = optionalEnv("PUBLIC_SITE_URL") ?? "http://localhost:3000";
  return betterAuth({
    appName: "Javis Market",
    baseURL,
    basePath: "/api/auth",
    secret: requireEnv("AUTH_SECRET"),
    trustedOrigins: [baseURL],
    database: prismaAdapter(getPrisma(), { provider: "postgresql", transaction: true }),
    emailAndPassword: {
      enabled: true,
      // Sin registro público: los administradores se crean con `npm run admin:create`.
      disableSignUp: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 15,
    },
    rateLimit: {
      enabled: true,
      // Una sola instancia web en v1: contadores en memoria. Revisar si se escalan instancias.
      storage: "memory",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/change-password": { window: 60, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: getAppEnvironment() === "production",
      cookiePrefix: "javis",
      ipAddress: { ipAddressHeaders: ["x-real-ip", "x-forwarded-for"] },
    },
    telemetry: { enabled: false },
    databaseHooks: {
      session: {
        create: {
          after: async (session) => {
            await recordAudit(
              { type: "system", name: "auth" },
              { action: "admin.sign_in", entityType: "admin_user", entityId: session.userId },
            ).catch((error: unknown) => logger.error("audit failed", { error: String(error) }));
          },
        },
      },
    },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

/** Instancia perezosa: la compilación no necesita AUTH_SECRET ni base de datos. */
export function getAuth() {
  auth ??= createAuth();
  return auth;
}

/** Atiende las rutas `/api/auth/*` de Better Auth. */
export function handleAuthRequest(request: Request): Promise<Response> {
  return getAuth().handler(request);
}

/** Devuelve el actor administrativo de la petición, o `null` si no hay sesión válida. */
export async function getAdminActor(headers: Headers): Promise<AdminActor | null> {
  const session = await getAuth().api.getSession({ headers });
  if (!session) return null;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipAddress = headers.get("x-real-ip") ?? forwarded;
  const userAgent = headers.get("user-agent");
  return {
    type: "admin",
    userId: session.user.id,
    email: session.user.email,
    ...(ipAddress ? { ipAddress } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}
