import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const globalForPrisma = globalThis as unknown as { javisPrisma?: PrismaClient };

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

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  // En desarrollo, la recarga en caliente de Next.js reevalúa módulos; se reutiliza la instancia.
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.javisPrisma = client;
  }
  return client;
}

/** Cierra la conexión si se llegó a abrir (usado en el apagado ordenado del worker). */
export async function disconnectPrisma(): Promise<void> {
  await globalForPrisma.javisPrisma?.$disconnect();
  delete globalForPrisma.javisPrisma;
}
