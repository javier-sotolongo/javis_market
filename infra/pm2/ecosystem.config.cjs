/**
 * PLANTILLA de PM2 para Javis Market (no ejecutada todavía en ningún servidor).
 *
 * Procesos: `javis-web` (Next.js) y `javis-worker` (tareas diferidas), una instancia de cada uno.
 *
 * Uso previsto en el VPS, desde la raíz del repositorio desplegado:
 *   JAVIS_ENV_FILE=<ENV_FILE_PATH> pm2 start infra/pm2/ecosystem.config.cjs
 *   pm2 save
 *
 * Marcadores pendientes: <ENV_FILE_PATH>, <LOG_DIR>, <APP_PORT>. Ver docs/deployment.md.
 */
const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");

const repoRoot = path.resolve(__dirname, "../..");

// El archivo de entorno vive fuera del repositorio (permisos 600, propietario el usuario de la app).
const envFile = process.env.JAVIS_ENV_FILE;
if (!envFile) {
  throw new Error("Define JAVIS_ENV_FILE con la ruta del archivo de entorno de producción");
}
const fileEnv = parseEnv(fs.readFileSync(envFile, "utf8"));

const env = { ...fileEnv, NODE_ENV: "production", APP_ENV: fileEnv.APP_ENV || "production" };
const port = env.PORT || "<APP_PORT>";
const logDir = env.LOG_DIR || "<LOG_DIR>";

module.exports = {
  apps: [
    {
      name: "javis-web",
      cwd: path.join(repoRoot, "web"),
      script: require.resolve("next/dist/bin/next", { paths: [path.join(repoRoot, "web")] }),
      // Solo escucha en loopback: el tráfico público entra únicamente por Nginx.
      args: `start --hostname 127.0.0.1 --port ${port}`,
      instances: 1,
      exec_mode: "fork",
      env,
      max_memory_restart: "768M",
      kill_timeout: 10000,
      exp_backoff_restart_delay: 200,
      out_file: path.join(logDir, "web.out.log"),
      error_file: path.join(logDir, "web.err.log"),
      time: true,
    },
    {
      name: "javis-worker",
      cwd: path.join(repoRoot, "worker"),
      script: "src/index.ts",
      interpreter: "node",
      node_args: ["--import", "tsx", "--conditions=react-server"],
      instances: 1,
      exec_mode: "fork",
      env,
      max_memory_restart: "384M",
      // Da tiempo a terminar el trabajo en curso tras SIGTERM/SIGINT.
      kill_timeout: 30000,
      exp_backoff_restart_delay: 500,
      out_file: path.join(logDir, "worker.out.log"),
      error_file: path.join(logDir, "worker.err.log"),
      time: true,
    },
  ],
};
