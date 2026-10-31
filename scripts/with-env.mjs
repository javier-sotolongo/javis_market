// Ejecuta un comando con las variables del .env de la raíz cargadas (si existe), sin sobrescribir las que ya
// estén definidas en el entorno. Se usa en los scripts `dev` y `start` de la web: `next dev` lanza procesos hijos
// y no admite `--env-file` en NODE_OPTIONS. En producción PM2 inyecta las variables y este archivo no se usa.
//
//   node ../scripts/with-env.mjs next dev
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envFile = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Usage: node scripts/with-env.mjs <command> [...args]");
  process.exit(1);
}

const child = spawn(command, args, { stdio: "inherit", env: process.env });
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
