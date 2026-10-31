import { DomainError } from "../../infrastructure/errors";

/**
 * Quién ejecuta una operación. Todos los servicios lo reciben y comprueban la autorización ellos mismos.
 * En v1 existe un único rol administrativo (el dueño de la tienda): todo `admin` tiene todos los permisos.
 */
export type Actor =
  | {
      readonly type: "admin";
      readonly userId: string;
      readonly email: string;
      readonly ipAddress?: string;
      readonly userAgent?: string;
    }
  | { readonly type: "guest" }
  | { readonly type: "system"; readonly name: string };

export type AdminActor = Extract<Actor, { type: "admin" }>;

export function requireAdmin(actor: Actor): asserts actor is AdminActor {
  if (actor.type === "admin") return;
  if (actor.type === "guest") throw new DomainError("unauthenticated", "Please sign in.");
  throw new DomainError("forbidden", "You do not have permission to perform this action.");
}

export const GUEST: Actor = { type: "guest" };
