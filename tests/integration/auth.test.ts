import { describe, expect, it } from "vitest";
import { createAdminUser, getAdminActor, handleAuthRequest, resetAdminPassword } from "@javis-market/api";

const ORIGIN = "http://localhost:3000";

function signIn(email: string, password: string) {
  return handleAuthRequest(
    new Request(`${ORIGIN}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: ORIGIN,
        "x-real-ip": `10.0.0.${Math.floor(Math.random() * 200)}`,
      },
      body: JSON.stringify({ email, password }),
    }),
  );
}

describe("admin access", () => {
  it("lets a CLI-created admin sign in and resolves the session to an admin actor", async () => {
    await createAdminUser({ email: "Owner@Example.com", name: "Owner", password: "correct horse battery" });
    const response = await signIn("owner@example.com", "correct horse battery");
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain("javis.session_token");

    const actor = await getAdminActor(new Headers({ cookie: cookie!.split(";")[0]! }));
    expect(actor).toMatchObject({ type: "admin", email: "owner@example.com" });
  });

  it("rejects wrong passwords, public sign-up and short passwords", async () => {
    await createAdminUser({ email: "owner@example.com", name: "Owner", password: "correct horse battery" });
    expect((await signIn("owner@example.com", "wrong password!!")).status).toBe(401);

    const signUp = await handleAuthRequest(
      new Request(`${ORIGIN}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: ORIGIN },
        body: JSON.stringify({ email: "intruder@example.com", password: "intruder-password", name: "x" }),
      }),
    );
    expect(signUp.status).toBeGreaterThanOrEqual(400);

    await expect(createAdminUser({ email: "a@example.com", name: "A", password: "short" })).rejects.toMatchObject({
      code: "validation_failed",
    });
  });

  it("revokes sessions when the password is reset", async () => {
    await createAdminUser({ email: "owner@example.com", name: "Owner", password: "correct horse battery" });
    const cookie = (await signIn("owner@example.com", "correct horse battery")).headers
      .get("set-cookie")!
      .split(";")[0]!;
    await resetAdminPassword({ email: "owner@example.com", password: "a brand new password" });
    expect(await getAdminActor(new Headers({ cookie }))).toBeNull();
    expect((await signIn("owner@example.com", "a brand new password")).status).toBe(200);
  });

  it("returns null for anonymous requests", async () => {
    expect(await getAdminActor(new Headers())).toBeNull();
  });
});
