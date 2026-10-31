/**
 * Logger mínimo en JSON por línea hacia stdout/stderr, recogido por PM2.
 * Nunca debe recibir secretos, datos de tarjeta ni contraseñas.
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

export function createLogger(component: string): Logger {
  const write = (level: LogLevel, message: string, fields?: LogFields) => {
    const line = JSON.stringify({ time: new Date().toISOString(), level, component, message, ...fields });
    if (level === "error" || level === "warn") {
      console.error(line);
    } else {
      console.log(line);
    }
  };

  return {
    debug: (message, fields) => write("debug", message, fields),
    info: (message, fields) => write("info", message, fields),
    warn: (message, fields) => write("warn", message, fields),
    error: (message, fields) => write("error", message, fields),
  };
}
