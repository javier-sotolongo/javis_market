import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// Se guarda en globalThis para compartir una única instancia (y un único pool de conexiones) por proceso,
// también cuando la recarga en caliente de Next.js reevalúa los módulos en desarrollo.
const globalForPrisma = globalThis as unknown as { javisPrisma?: PrismaClient };

/** Tamaño del pool por proceso (web y worker tienen el suyo). Configurable con DATABASE_POOL_MAX. */
function poolMax(): number {
  const value = Number(process.env.DATABASE_POOL_MAX ?? 10);
  return Number.isInteger(value) && value > 0 ? value : 10;
}

/**
 * Devuelve el cliente Prisma compartido del proceso.
 *
 * El cliente se crea de forma perezosa: importar este paquete no abre conexiones,
 * de modo que la compilación y el renderizado estático no dependen de la base de datos.
 */
export function getPrisma(): PrismaClient {
  if (globalForPrisma.javisPrisma) {
    return globalForPrisma.javisPrisma;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: poolMax() }) });
  globalForPrisma.javisPrisma = client;
  return client;
}

/** Cierra la conexión si se llegó a abrir (usado en el apagado ordenado del worker y en las pruebas). */
export async function disconnectPrisma(): Promise<void> {
  await globalForPrisma.javisPrisma?.$disconnect();
  delete globalForPrisma.javisPrisma;
}
