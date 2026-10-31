import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

test.describe.configure({ mode: "serial" });

test("admin area requires a session", async ({ page }) => {
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel("Email", { exact: true }).fill(E2E_ADMIN.email);
  await page.getByLabel("Password", { exact: true }).fill("wrong password!!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Invalid email or password." })).toBeVisible();
});

test("owner creates a product with photos, publishes it and a shopper adds it to the cart", async ({
  page,
}, testInfo) => {
  // --- Login ---
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(E2E_ADMIN.email);
  await page.getByLabel("Password", { exact: true }).fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // --- Category ---
  await page.getByRole("link", { name: "Categories" }).click();
  await page.locator("#new-name").fill("Pantry");
  await page.getByRole("button", { name: "Create category" }).click();
  await expect(page.getByText("Category created.")).toBeVisible();

  // --- Product (with a validation error first: the form keeps what was typed) ---
  await page.getByRole("link", { name: "Products" }).click();
  await page.getByRole("link", { name: "Add product" }).first().click();
  await page.getByLabel("Name", { exact: true }).fill("Organic Honey 500 g");
  await page.getByLabel("Description", { exact: true }).fill("Raw organic honey.\nProduct of the USA.");
  await page.getByLabel("Pantry", { exact: true }).check();
  await page.getByLabel("SKU", { exact: true }).fill("HONEY-500");
  await page.getByLabel("Price (USD)", { exact: true }).fill("12.3.4");
  await page.getByLabel("Initial stock", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page.getByText("Enter a valid amount, e.g. 12.99.")).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Organic Honey 500 g");
  await page.getByLabel("Price (USD)", { exact: true }).fill("12.99");
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page.getByText("Product created as a draft.")).toBeVisible();

  // --- Photo upload ---
  const photo = testInfo.outputPath("honey.jpg");
  mkdirSync(path.dirname(photo), { recursive: true });
  await sharp({ create: { width: 1200, height: 900, channels: 3, background: "#e0a526" } })
    .jpeg()
    .toFile(photo);
  await page.getByLabel("Upload photos", { exact: true }).setInputFiles(photo);
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.getByText("1 image(s) uploaded.")).toBeVisible();
  await expect(page.getByText("Main")).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("admin-product.png"), fullPage: true });

  // --- Import from a disallowed URL is refused ---
  await page.getByLabel("Import from URL", { exact: true }).fill("http://127.0.0.1/secret.png");
  await page.getByRole("button", { name: "Import image" }).click();
  await expect(page.getByText("This address is not allowed.")).toBeVisible();

  // --- Publish ---
  await page.getByLabel("Status", { exact: true }).selectOption("ACTIVE");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText("Product saved.")).toBeVisible();

  // --- Storefront as a guest ---
  const shopper = await page.context().browser()!.newContext();
  const store = await shopper.newPage();
  await store.goto("/");
  await expect(store.getByRole("link", { name: "Pantry" }).first()).toBeVisible();
  await store.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });
  await store.getByRole("link", { name: /Organic Honey 500 g/ }).click();
  await expect(store.getByRole("heading", { name: "Organic Honey 500 g" })).toBeVisible();
  await expect(store.getByText("$12.99")).toBeVisible();
  await expect(store.getByText("Only 3 left")).toBeVisible();
  await expect(store.locator('img[src*="media%2Fproducts%2F"]').first()).toBeVisible();

  await store.screenshot({ path: testInfo.outputPath("product.png"), fullPage: true });
  await store.getByRole("button", { name: "Increase quantity" }).click();
  await expect(store.getByLabel("Quantity", { exact: true })).toHaveValue("2");
  await store.getByRole("button", { name: "Add to cart" }).click();
  await expect(store.getByText("Added to your cart.")).toBeVisible();

  await store.goto("/cart");
  await expect(store.getByText("$25.98").first()).toBeVisible();
  await expect(store.getByRole("button", { name: "Checkout" })).toBeDisabled();
  await store.screenshot({ path: testInfo.outputPath("cart.png"), fullPage: true });

  // --- Inventory adjustment is reflected in the store ---
  await page.getByRole("link", { name: "Inventory" }).click();
  await page.getByRole("link", { name: "Adjust" }).click();
  await page.getByLabel("Action", { exact: true }).selectOption("set");
  await page.getByLabel("Quantity", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("Stock updated. On hand: 0.")).toBeVisible();

  await store.reload();
  await expect(store.getByText("No longer available. Please remove it.")).toBeVisible();
  await store.getByRole("button", { name: "Remove" }).click();
  await expect(store.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();

  await page.getByRole("link", { name: "Activity log" }).click();
  await expect(page.getByText("product.status.active")).toBeVisible();
  await shopper.close();
});
