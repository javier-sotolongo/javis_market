// Vacía todas las tablas de la base de datos indicada en DATABASE_URL. Solo para bases de pruebas.
import { disconnectPrisma, getPrisma } from "@javis-market/db";

const url = process.env.DATABASE_URL ?? "";
if (!new URL(url).pathname.includes("test")) {
  throw new Error("Refusing to truncate a database whose name does not contain 'test'.");
}

const prisma = getPrisma();
const tables = await prisma.$queryRaw<{ tablename: string }[]>`
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
if (tables.length > 0) {
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `"public"."${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
}
await disconnectPrisma();
