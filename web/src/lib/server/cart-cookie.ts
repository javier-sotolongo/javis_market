import "server-only";
import { cookies } from "next/headers";

const CART_COOKIE = "javis_cart";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function getCartToken(): Promise<string | null> {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

export async function setCartToken(token: string): Promise<void> {
  (await cookies()).set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}
