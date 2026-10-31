import { getPrisma } from "@javis-market/db";
import { notFound } from "../../infrastructure/errors";
import { parseInput } from "../../infrastructure/validation";
import { type Actor, recordAudit, requireAdmin } from "../access";
import { type CategoryInput, categorySchema } from "./schemas";
import { resolveSlug } from "./slugs";

export async function listCategories(actor: Actor) {
  requireAdmin(actor);
  return getPrisma().category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
}

export async function getCategory(actor: Actor, id: string) {
  requireAdmin(actor);
  const category = await getPrisma().category.findUnique({ where: { id } });
  if (!category) throw notFound("Category");
  return category;
}

export async function createCategory(actor: Actor, input: CategoryInput) {
  requireAdmin(actor);
  const data = parseInput(categorySchema, input);
  const prisma = getPrisma();
  const slug = await resolveSlug(
    data.slug,
    data.name,
    async (s) => !!(await prisma.category.findUnique({ where: { slug: s } })),
  );
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.create({ data: { ...data, slug } });
    await recordAudit(
      actor,
      { action: "category.create", entityType: "category", entityId: category.id, changes: { name: data.name, slug } },
      tx,
    );
    return category;
  });
}

export async function updateCategory(actor: Actor, id: string, input: CategoryInput) {
  requireAdmin(actor);
  const data = parseInput(categorySchema, input);
  const prisma = getPrisma();
  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) throw notFound("Category");
  const slug =
    data.slug && data.slug !== current.slug
      ? await resolveSlug(
          data.slug,
          data.name,
          async (s) => !!(await prisma.category.findUnique({ where: { slug: s } })),
        )
      : current.slug;
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.update({ where: { id }, data: { ...data, slug } });
    await recordAudit(
      actor,
      { action: "category.update", entityType: "category", entityId: id, changes: { ...data, slug } },
      tx,
    );
    return category;
  });
}

/** Borra la categoría; los productos solo pierden la asociación. */
export async function deleteCategory(actor: Actor, id: string) {
  requireAdmin(actor);
  await getPrisma().$transaction(async (tx) => {
    const category = await tx.category.findUnique({ where: { id } });
    if (!category) throw notFound("Category");
    await tx.category.delete({ where: { id } });
    await recordAudit(
      actor,
      { action: "category.delete", entityType: "category", entityId: id, changes: { name: category.name } },
      tx,
    );
  });
}
