import { z } from "zod";
import { parseDecimalToCents } from "@javis-market/shared";
import { SLUG_PATTERN } from "../../infrastructure/slug";

/** Texto opcional de formulario: vacío ⇒ null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

/** Precio escrito por el administrador ("12.99") ⇒ centavos enteros. */
export const priceField = z.string().transform((value, ctx) => {
  const cents = parseDecimalToCents(value);
  if (cents === null) {
    ctx.addIssue({ code: "custom", message: "Enter a valid amount, e.g. 12.99." });
    return z.NEVER;
  }
  return cents;
});

const optionalPriceField = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value?.trim()) return null;
    const cents = parseDecimalToCents(value);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Enter a valid amount, e.g. 12.99." });
      return z.NEVER;
    }
    return cents;
  });

const optionalSlug = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .refine((value) => !value || SLUG_PATTERN.test(value), "Use lowercase letters, numbers and hyphens only.");

export const skuField = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, "SKU is required.")
  .max(64)
  .regex(/^[A-Z0-9][A-Z0-9._-]*$/, "Use letters, numbers, dots, hyphens or underscores.");

export const variantFields = {
  sku: skuField,
  title: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || "Default"),
  price: priceField,
  compareAtPrice: optionalPriceField,
  cost: optionalPriceField,
  weightGrams: z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value?.trim()) return null;
      const grams = Number(value);
      if (!Number.isInteger(grams) || grams < 0) {
        ctx.addIssue({ code: "custom", message: "Enter a whole number of grams." });
        return z.NEVER;
      }
      return grams;
    }),
};

export const productStatusField = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);

export const productFields = {
  name: z.string().trim().min(1, "Name is required.").max(200),
  slug: optionalSlug,
  description: z.string().trim().max(20_000).default(""),
  brand: optionalText(120),
  supplier: optionalText(120),
  categoryIds: z.array(z.uuid()).max(50).default([]),
};

export const createProductSchema = z
  .object({
    ...productFields,
    ...variantFields,
    initialStock: z.coerce.number().int("Enter a whole number.").min(0).max(1_000_000).default(0),
  })
  .refine((data) => data.compareAtPrice === null || data.compareAtPrice > data.price, {
    message: "Compare-at price must be higher than the price.",
    path: ["compareAtPrice"],
  });

export const updateProductSchema = z.object({ ...productFields, status: productStatusField });

export const variantSchema = z
  .object(variantFields)
  .refine((data) => data.compareAtPrice === null || data.compareAtPrice > data.price, {
    message: "Compare-at price must be higher than the price.",
    path: ["compareAtPrice"],
  });

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  slug: optionalSlug,
  description: z.string().trim().max(2_000).default(""),
  sortOrder: z.coerce.number().int().min(-1000).max(1000).default(0),
});

export type CreateProductInput = z.input<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;
export type VariantInput = z.input<typeof variantSchema>;
export type CategoryInput = z.input<typeof categorySchema>;
