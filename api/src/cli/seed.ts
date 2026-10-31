/**
 * Datos de prueba para desarrollo local: administrador, categorías, productos con variantes, existencias e
 * ilustraciones de envase generadas (no son fotografías reales). Usa los mismos servicios que el panel
 * (validación, auditoría, procesado de imágenes).
 *
 *   ADMIN_PASSWORD=... npm run db:seed -- --email owner@example.com
 *
 * Se niega a ejecutarse en producción o si ya hay productos en la base de datos.
 */
import { parseArgs } from "node:util";
import sharp from "sharp";
import { disconnectPrisma, getPrisma } from "@javis-market/db";
import { getAppEnvironment } from "../config/env";
import {
  type AdminActor,
  addVariant,
  adjustStock,
  createAdminUser,
  createCategory,
  createProduct,
  updateProduct,
  uploadProductImages,
} from "../index";

type Shape = "jar" | "bottle" | "bag" | "box" | "can" | "bar" | "pump" | "pack";

interface SeedVariant {
  sku: string;
  title?: string;
  price: string;
  compareAtPrice?: string;
  stock: number;
}

interface SeedProduct {
  name: string;
  description: string;
  brand?: string;
  supplier: string;
  categories: string[];
  variants: [SeedVariant, ...SeedVariant[]];
  /** Envase y color de la ilustración; sin `shape`, el producto queda sin imagen. */
  shape?: Shape;
  color?: string;
  label?: string;
  photos?: number;
  status?: "ACTIVE" | "DRAFT";
}

const CATEGORIES = [
  { name: "Pantry", description: "Everyday staples for your kitchen.", sortOrder: 1 },
  { name: "Beverages", description: "Coffee, tea and refreshing drinks.", sortOrder: 2 },
  { name: "Snacks", description: "Treats for any time of the day.", sortOrder: 3 },
  { name: "Household", description: "Cleaning and home essentials.", sortOrder: 4 },
  { name: "Personal Care", description: "Care products for the whole family.", sortOrder: 5 },
];

const PRODUCTS: SeedProduct[] = [
  {
    name: "Organic Wildflower Honey",
    description: "Raw, unfiltered wildflower honey from small farms.\nPerfect for tea, toast and baking.",
    brand: "Golden Fields",
    supplier: "Deliflow",
    categories: ["Pantry"],
    variants: [
      { sku: "HONEY-12OZ", title: "12 oz", price: "8.99", stock: 24 },
      { sku: "HONEY-24OZ", title: "24 oz", price: "15.49", compareAtPrice: "17.99", stock: 3 },
    ],
    shape: "jar",
    color: "#e0a526",
    label: "HONEY",
    photos: 2,
  },
  {
    name: "Extra Virgin Olive Oil",
    description: "Cold-pressed extra virgin olive oil with a smooth, fruity taste.",
    brand: "Mediterra",
    supplier: "Deliflow",
    categories: ["Pantry"],
    variants: [{ sku: "OLIVE-500", title: "16.9 fl oz", price: "12.99", stock: 40 }],
    shape: "bottle",
    color: "#5b7d1e",
    label: "OLIVE OIL",
  },
  {
    name: "Long Grain White Rice",
    description: "Fluffy long grain rice, ideal for everyday meals.",
    brand: "Harvest Table",
    supplier: "Other supplier",
    categories: ["Pantry"],
    variants: [{ sku: "RICE-5LB", title: "5 lb", price: "6.49", stock: 60 }],
    shape: "bag",
    color: "#c9b48a",
    label: "RICE",
  },
  {
    name: "Whole Bean Coffee, Colombia Medium Roast",
    description: "Single-origin coffee with notes of caramel and cocoa.",
    brand: "Andes Roasters",
    supplier: "Deliflow",
    categories: ["Beverages"],
    variants: [
      { sku: "COFFEE-COL-12", title: "12 oz", price: "13.99", stock: 18 },
      { sku: "COFFEE-COL-32", title: "2 lb", price: "29.99", stock: 7 },
    ],
    shape: "bag",
    color: "#5a3a22",
    label: "COFFEE",
    photos: 2,
  },
  {
    name: "Green Tea",
    description: "Delicate Japanese-style green tea in individually wrapped bags.",
    brand: "Leaf & Co",
    supplier: "Other supplier",
    categories: ["Beverages"],
    variants: [{ sku: "TEA-GREEN-40", title: "40 tea bags", price: "5.99", stock: 35 }],
    shape: "box",
    color: "#3f8f5a",
    label: "GREEN TEA",
  },
  {
    name: "Sparkling Water, Lime",
    description: "Zero calories, zero sugar, naturally flavored sparkling water.",
    supplier: "Deliflow",
    categories: ["Beverages"],
    variants: [{ sku: "SPARK-LIME-12", title: "12 × 12 fl oz cans", price: "7.49", stock: 0 }],
    shape: "can",
    color: "#7cb342",
    label: "LIME",
  },
  {
    name: "Unsweetened Almond Milk, Barista Edition, Shelf-Stable Carton for Coffee and Smoothies",
    description:
      "Creamy almond milk that steams and froths well. Store in a cool, dry place; refrigerate after opening.",
    brand: "Nutty Valley",
    supplier: "Deliflow",
    categories: ["Beverages"],
    variants: [{ sku: "ALMOND-BAR-32", title: "32 fl oz", price: "4.79", stock: 14 }],
    shape: "box",
    color: "#a9825a",
    label: "ALMOND",
  },
  {
    name: "Sea Salt Kettle Chips",
    description: "Thick-cut kettle cooked potato chips with a satisfying crunch.",
    brand: "Crunch Bros",
    supplier: "Deliflow",
    categories: ["Snacks"],
    variants: [
      { sku: "CHIPS-SS-5", title: "5 oz", price: "3.99", stock: 50 },
      { sku: "CHIPS-SS-FAM", title: "Family size", price: "6.49", stock: 12 },
    ],
    shape: "bag",
    color: "#2e6fb5",
    label: "CHIPS",
  },
  {
    name: "Dark Chocolate 70% Cacao",
    description: "Rich dark chocolate made from ethically sourced cacao.",
    brand: "Cacao House",
    supplier: "Other supplier",
    categories: ["Snacks"],
    variants: [{ sku: "CHOC-70", title: "3.5 oz bar", price: "3.49", stock: 4 }],
    shape: "bar",
    color: "#4a2c22",
    label: "70% CACAO",
  },
  {
    name: "Mixed Nuts, Lightly Salted",
    description: "Almonds, cashews, pecans and hazelnuts, lightly salted.",
    supplier: "Deliflow",
    categories: ["Snacks", "Pantry"],
    variants: [{ sku: "NUTS-MIX-16", title: "16 oz", price: "11.99", stock: 20 }],
    shape: "jar",
    color: "#b07a3c",
    label: "MIXED NUTS",
  },
  {
    name: "Lavender Dish Soap",
    description: "Plant-based dish soap that cuts through grease.",
    brand: "Clean Home",
    supplier: "Other supplier",
    categories: ["Household"],
    variants: [{ sku: "DISH-LAV", title: "25 fl oz", price: "4.29", stock: 30 }],
    shape: "bottle",
    color: "#8a6cc9",
    label: "DISH SOAP",
  },
  {
    name: "Paper Towels",
    description: "Strong and absorbent paper towels for everyday messes.",
    supplier: "Deliflow",
    categories: ["Household"],
    variants: [{ sku: "TOWEL-6", title: "6 rolls", price: "9.99", stock: 15 }],
  },
  {
    name: "Moisturizing Hand Soap",
    description: "Gentle hand soap with aloe vera and vitamin E.",
    brand: "Pure Care",
    supplier: "Other supplier",
    categories: ["Personal Care"],
    variants: [
      { sku: "HSOAP-ALOE", title: "Aloe", price: "3.79", stock: 25 },
      { sku: "HSOAP-CITRUS", title: "Citrus", price: "3.79", stock: 0 },
    ],
    shape: "pump",
    color: "#2a9d8f",
    label: "HAND SOAP",
  },
  {
    name: "Bamboo Toothbrush",
    description: "Biodegradable bamboo handle with soft bristles.",
    supplier: "Other supplier",
    categories: ["Personal Care"],
    variants: [{ sku: "TBRUSH-4", title: "4 pack", price: "7.99", stock: 22 }],
  },
  {
    name: "Oat & Honey Granola Bars",
    description: "Crunchy granola bars made with whole grain oats and honey.",
    brand: "Morning Trail",
    supplier: "Deliflow",
    categories: ["Snacks"],
    variants: [{ sku: "GRANOLA-12", title: "12 bars", price: "5.49", stock: 40 }],
    shape: "pack",
    color: "#c9822b",
    label: "GRANOLA",
  },
  {
    name: "Pure Maple Syrup",
    description: "Pure Grade A maple syrup. Draft product, not visible in the store.",
    supplier: "Deliflow",
    categories: ["Pantry"],
    variants: [{ sku: "MAPLE-12", title: "12 fl oz", price: "14.99", stock: 0 }],
    shape: "bottle",
    color: "#9a4a12",
    label: "MAPLE",
    status: "DRAFT",
  },
];

const escapeXml = (text: string) => text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Aclara (+) u oscurece (−) un color hexadecimal. */
function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const value = (n >> shift) & 255;
    const target = amount >= 0 ? 255 : 0;
    return Math.round(value + (target - value) * Math.abs(amount));
  };
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Render de muestra del envase sobre fondo blanco, con volumen (degradado lateral, brillo y sombra difusa).
 * No es una fotografía real; solo sirve para revisar el diseño con datos de prueba.
 */
function packshotSvg(shape: Shape, color: string, label: string, brand: string, variant: number): string {
  const text = escapeXml(label);
  const brandText = escapeXml(brand.toUpperCase());
  const defs = `
    <linearGradient id="body" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${shade(color, -0.25)}"/><stop offset=".22" stop-color="${shade(color, 0.12)}"/>
      <stop offset=".55" stop-color="${color}"/><stop offset="1" stop-color="${shade(color, -0.38)}"/>
    </linearGradient>
    <linearGradient id="cap" x1="0" x2="1"><stop offset="0" stop-color="#2b2a27"/><stop offset=".3" stop-color="#6b6862"/><stop offset=".6" stop-color="#3a3834"/><stop offset="1" stop-color="#1c1b19"/></linearGradient>
    <linearGradient id="gloss" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="paper" x1="0" x2="1"><stop offset="0" stop-color="#ece7dc"/><stop offset=".3" stop-color="#fffdf8"/><stop offset="1" stop-color="#e3ddd0"/></linearGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>`;
  const label_ = (x: number, y: number, w: number, h: number, size = 46) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="url(#paper)"/>
    <rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="${h - 28}" rx="3" fill="none" stroke="${color}" stroke-opacity=".35" stroke-width="2"/>
    ${brandText ? `<text x="${x + w / 2}" y="${y + h / 2 - size * 0.45}" text-anchor="middle" font-family="DejaVu Serif, Georgia, serif" font-size="${Math.round(size * 0.42)}" fill="${shade(color, -0.35)}" letter-spacing="4">${brandText}</text>` : ""}
    <text x="${x + w / 2}" y="${y + h / 2 + size * (brandText ? 0.6 : 0.35)}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${size}" font-weight="700" fill="#24211d" letter-spacing="1">${text}</text>`;
  const gloss = (x: number, y: number, w: number, h: number, r = 20) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#gloss)" opacity=".7"/>`;
  const shapes: Record<Shape, string> = {
    jar: `<rect x="415" y="285" width="370" height="95" rx="12" fill="url(#cap)"/>
      <rect x="380" y="370" width="440" height="540" rx="64" fill="url(#body)"/>
      ${gloss(420, 400, 50, 470, 25)}${label_(395, 520, 410, 250)}`,
    bottle: `<rect x="548" y="150" width="104" height="96" rx="10" fill="url(#cap)"/>
      <path d="M562 240h76v110c0 46 98 70 98 150v390a40 40 0 0 1-40 40H504a40 40 0 0 1-40-40V500c0-80 98-104 98-150z" fill="url(#body)"/>
      ${gloss(492, 470, 34, 420, 17)}${label_(478, 560, 244, 270, 36)}`,
    bag: `<path d="M398 250h404l38 650a34 34 0 0 1-34 36H394a34 34 0 0 1-34-36z" fill="url(#body)"/>
      <path d="M398 250h404l4 64H394z" fill="#000" opacity=".14"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${404 + i * 50}" y="256" width="24" height="52" fill="#000" opacity=".06"/>`).join("")}
      ${gloss(410, 330, 60, 560, 30)}${label_(420, 480, 360, 270)}`,
    box: `<path d="M370 280h420v660H370z" fill="url(#body)"/><path d="M790 280l70-58v660l-70 58z" fill="${shade(color, -0.45)}"/>
      <path d="M370 280l70-58h420l-70 58z" fill="${shade(color, 0.25)}"/>${label_(400, 470, 360, 300)}`,
    can: `${[0, 1, 2]
      .map((i) => {
        const x = 300 + i * 205;
        const y = i === 1 ? 260 : 320;
        const h = i === 1 ? 640 : 580;
        return `<rect x="${x}" y="${y}" width="190" height="${h}" rx="26" fill="url(#body)"/>
          <rect x="${x + 6}" y="${y - 6}" width="178" height="30" rx="12" fill="url(#cap)" opacity=".55"/>${gloss(x + 30, y + 50, 40, h - 100, 20)}`;
      })
      .join("")}${label_(420, 520, 360, 230)}`,
    bar: `<g transform="rotate(-10 600 600)">
        <rect x="270" y="410" width="660" height="370" rx="14" fill="url(#body)"/>
        <rect x="270" y="410" width="170" height="370" rx="14" fill="#cfae63"/><rect x="270" y="410" width="170" height="370" rx="14" fill="url(#gloss)" opacity=".5"/>
        ${label_(470, 480, 400, 230)}</g>`,
    pump: `<rect x="520" y="190" width="160" height="34" rx="14" fill="url(#cap)"/><rect x="583" y="220" width="34" height="110" fill="url(#cap)"/>
      <rect x="548" y="320" width="104" height="70" rx="12" fill="url(#cap)"/>
      <rect x="430" y="380" width="340" height="530" rx="58" fill="url(#body)"/>
      ${gloss(462, 410, 40, 470, 20)}${label_(458, 520, 284, 260, 38)}`,
    pack: `<rect x="300" y="350" width="600" height="480" rx="22" fill="url(#body)"/>
      <rect x="300" y="350" width="600" height="60" rx="22" fill="#000" opacity=".12"/>
      ${gloss(330, 420, 540, 30, 15)}${label_(380, 470, 440, 270)}`,
  };
  const tilt = variant ? "translate(600 600) rotate(-7) scale(0.9) translate(-600 -600)" : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><defs>${defs}</defs>
    <rect width="1200" height="1200" fill="#ffffff"/>
    <ellipse cx="600" cy="955" rx="${variant ? 330 : 290}" ry="40" fill="#000" opacity=".14" filter="url(#soft)"/>
    <g transform="${tilt}">${shapes[shape]}</g>
  </svg>`;
}

async function packshot(item: SeedProduct, index: number): Promise<Uint8Array> {
  const svg = packshotSvg(item.shape!, item.color!, item.label ?? item.name, item.brand ?? "", index);
  return new Uint8Array(await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer());
}

async function main() {
  if (getAppEnvironment() === "production") throw new Error("Refusing to seed a production environment.");
  const { values } = parseArgs({
    options: {
      email: { type: "string", default: "owner@javismarket.test" },
      name: { type: "string", default: "Store Owner" },
    },
  });
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("Set ADMIN_PASSWORD for the seeded admin account.");

  const prisma = getPrisma();
  if ((await prisma.product.count()) > 0) {
    console.log("The database already has products; nothing to do.");
    return;
  }

  let adminUser = await prisma.user.findUnique({ where: { email: values.email.toLowerCase() } });
  if (!adminUser) {
    await createAdminUser({ email: values.email, name: values.name, password });
    adminUser = await prisma.user.findUniqueOrThrow({ where: { email: values.email.toLowerCase() } });
    console.log(`Admin created: ${adminUser.email}`);
  }
  const admin: AdminActor = { type: "admin", userId: adminUser.id, email: adminUser.email };

  const categoryIds = new Map<string, string>();
  for (const category of CATEGORIES) {
    categoryIds.set(
      category.name,
      (await createCategory(admin, { ...category, sortOrder: String(category.sortOrder) })).id,
    );
  }

  for (const item of PRODUCTS) {
    const [first, ...rest] = item.variants;
    const categoryIdList = item.categories.map((name) => categoryIds.get(name)!);
    const product = await createProduct(admin, {
      name: item.name,
      description: item.description,
      ...(item.brand ? { brand: item.brand } : {}),
      supplier: item.supplier,
      categoryIds: categoryIdList,
      sku: first.sku,
      ...(first.title ? { title: first.title } : {}),
      price: first.price,
      ...(first.compareAtPrice ? { compareAtPrice: first.compareAtPrice } : {}),
      initialStock: String(first.stock),
    });
    for (const variant of rest) {
      const created = await addVariant(admin, product.id, {
        sku: variant.sku,
        ...(variant.title ? { title: variant.title } : {}),
        price: variant.price,
        ...(variant.compareAtPrice ? { compareAtPrice: variant.compareAtPrice } : {}),
      });
      if (variant.stock > 0) {
        await adjustStock(admin, { variantId: created.id, mode: "add", quantity: variant.stock, note: "Seed stock" });
      }
    }
    if (item.shape) {
      const files = await Promise.all(
        Array.from({ length: item.photos ?? 1 }, async (_, i) => ({
          name: `${first.sku}-${i + 1}.jpg`,
          bytes: await packshot(item, i),
        })),
      );
      await uploadProductImages(admin, product.id, files);
    }
    if (item.status !== "DRAFT") {
      await updateProduct(admin, product.id, {
        name: product.name,
        description: item.description,
        ...(item.brand ? { brand: item.brand } : {}),
        supplier: item.supplier,
        categoryIds: categoryIdList,
        status: "ACTIVE",
      });
    }
    console.log(`  ✓ ${item.name}${item.status === "DRAFT" ? " (draft)" : ""}${item.shape ? "" : " (no image)"}`);
  }
  console.log(`Seeded ${CATEGORIES.length} categories and ${PRODUCTS.length} products.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectPrisma());
