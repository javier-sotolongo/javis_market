// Entorno de desarrollo completo con un solo comando (`npm run dev:all`):
//   1. Arranca el PostgreSQL local (scripts/dev-db.sh) si no está en marcha.
//   2. Aplica las migraciones pendientes (migrate deploy: nunca borra datos).
//   3. Levanta la web (Next.js con recarga en caliente) y el worker en paralelo.
// Ctrl+C detiene la web y el worker por completo. La base de datos sigue en marcha (`npm run db:local:stop`).
import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
process.chdir(root);

if (!existsSync(".env")) {
  console.error("Missing .env — copy .env.example to .env and fill it in (see README.md).");
  process.exit(1);
}

execFileSync("bash", ["scripts/dev-db.sh", "start"], { stdio: "inherit" });
execFileSync("npm", ["run", "--silent", "db:migrate:deploy"], { stdio: ["ignore", "ignore", "inherit"] });
console.log("Database ready. Starting web and worker… (Ctrl+C to stop)\n");

// Cada servicio en su propio grupo de procesos para poder detenerlo entero (npm → sh → node → hijos de Next.js).
const services = [
  ["worker", "dev:worker"],
  ["web", "dev"],
].map(([name, script]) => ({
  name,
  child: spawn("npm", ["run", "--silent", script], { stdio: "inherit", detached: true }),
}));

let stopping = false;
function stopAll(exitCode) {
  if (stopping) return;
  stopping = true;
  console.log("\nStopping web and worker…");
  for (const { child } of services) {
    try {
      process.kill(-child.pid, "SIGINT");
    } catch {
      // El grupo ya terminó.
    }
  }
  // Si algo no termina a tiempo, se fuerza.
  setTimeout(() => {
    for (const { child } of services) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        // Ya terminó.
      }
    }
    process.exit(exitCode);
  }, 5000).unref();
}

for (const { name, child } of services) {
  child.on("exit", (code) => {
    if (!stopping) {
      console.error(`\n${name} exited (code ${code ?? "signal"}); stopping the rest.`);
      stopAll(code ?? 1);
    }
    if (services.every((s) => s.child.exitCode !== null || s.child.signalCode !== null)) process.exit(0);
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
