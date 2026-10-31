/**
 * Gestión de administradores desde el servidor (no hay registro público).
 *
 *   npm run admin:create -- --email owner@example.com --name "Owner"
 *   npm run admin:reset-password -- --email owner@example.com
 *
 * La contraseña se pide por la terminal sin mostrarla, o se lee de ADMIN_PASSWORD (solo para automatización).
 */
import { parseArgs } from "node:util";
import { disconnectPrisma } from "@javis-market/db";
import { createAdminUser, resetAdminPassword } from "../modules/access";
import { isDomainError } from "../infrastructure/errors";

async function promptHidden(question: string): Promise<string> {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) {
    throw new Error("No TTY available: set ADMIN_PASSWORD to provide the password non-interactively.");
  }
  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const onData = (char: string) => {
      if (char === "\r" || char === "\n" || char === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (char === "\u0003") {
        stdin.setRawMode(false);
        reject(new Error("Cancelled"));
      } else if (char === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.on("data", onData);
  });
}

async function readPassword(): Promise<string> {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  const password = await promptHidden("Password: ");
  const confirmation = await promptHidden("Repeat password: ");
  if (password !== confirmation) throw new Error("Passwords do not match.");
  return password;
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { email: { type: "string" }, name: { type: "string" } },
  });
  const command = positionals[0];
  if (!values.email || (command !== "create" && command !== "reset-password")) {
    console.error("Usage: admin <create|reset-password> --email <email> [--name <name>]");
    process.exitCode = 1;
    return;
  }
  const password = await readPassword();
  if (command === "create") {
    const admin = await createAdminUser({ email: values.email, name: values.name ?? values.email, password });
    console.log(`Admin created: ${admin.email}`);
  } else {
    await resetAdminPassword({ email: values.email, password });
    console.log(`Password updated and sessions revoked for ${values.email}`);
  }
}

main()
  .catch((error: unknown) => {
    if (isDomainError(error)) {
      console.error(error.message, ...error.details.map((d) => `\n  - ${d.message}`));
    } else {
      console.error(error instanceof Error ? error.message : error);
    }
    process.exitCode = 1;
  })
  .finally(() => disconnectPrisma());
