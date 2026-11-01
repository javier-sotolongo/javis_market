-- AlterEnum
ALTER TYPE "StockMovementReason" ADD VALUE 'SUPPLIER_SYNC';

-- CreateTable
CREATE TABLE "invello_products" (
    "id" UUID NOT NULL,
    "externalId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "brand" TEXT,
    "upc" TEXT,
    "categoryName" TEXT,
    "unit" TEXT,
    "unitsPerCase" INTEGER,
    "weightGrams" INTEGER,
    "imageUrls" TEXT[],
    "active" BOOLEAN NOT NULL,
    "priceCents" INTEGER,
    "mapPriceCents" INTEGER,
    "available" INTEGER,
    "remoteUpdatedAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL,
    "variantId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invello_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invello_sync_state" (
    "id" TEXT NOT NULL,
    "supplierName" TEXT,
    "productsSyncedAt" TIMESTAMP(3),
    "fullSyncedAt" TIMESTAMP(3),
    "stockSyncedAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invello_sync_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invello_products_externalId_key" ON "invello_products"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "invello_products_sku_key" ON "invello_products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "invello_products_variantId_key" ON "invello_products"("variantId");

-- CreateIndex
CREATE INDEX "invello_products_active_name_idx" ON "invello_products"("active", "name");

-- AddForeignKey
ALTER TABLE "invello_products" ADD CONSTRAINT "invello_products_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Restricciones CHECK (Prisma no las modela).
ALTER TABLE "invello_products"
  ADD CONSTRAINT "invello_products_price_non_negative" CHECK ("priceCents" IS NULL OR "priceCents" >= 0),
  ADD CONSTRAINT "invello_products_map_non_negative" CHECK ("mapPriceCents" IS NULL OR "mapPriceCents" >= 0),
  ADD CONSTRAINT "invello_products_available_non_negative" CHECK ("available" IS NULL OR "available" >= 0),
  ADD CONSTRAINT "invello_products_weight_non_negative" CHECK ("weightGrams" IS NULL OR "weightGrams" >= 0);
