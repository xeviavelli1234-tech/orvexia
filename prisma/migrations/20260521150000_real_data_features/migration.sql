-- Datos reales: quota tracker, errores consecutivos, sync inverso,
-- pedidos SP-API Orders + KPIs derivados.

-- ── SellerListing: resiliencia / sync inverso ────────────────────────────
ALTER TABLE "SellerListing" ADD COLUMN "consecutiveErrors" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SellerListing" ADD COLUMN "autoPausedAt" TIMESTAMP(3);
ALTER TABLE "SellerListing" ADD COLUMN "autoPausedReason" TEXT;
ALTER TABLE "SellerListing" ADD COLUMN "lastExpectedPrice" DOUBLE PRECISION;
ALTER TABLE "SellerListing" ADD COLUMN "lastExpectedAt" TIMESTAMP(3);
ALTER TABLE "SellerListing" ADD COLUMN "manualPriceDetected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SellerListing" ADD COLUMN "manualPriceAt" TIMESTAMP(3);
ALTER TABLE "SellerListing" ADD COLUMN "manualPriceBefore" DOUBLE PRECISION;
ALTER TABLE "SellerListing" ADD COLUMN "manualPriceAfter" DOUBLE PRECISION;

-- ── RepriceQuotaUsage ────────────────────────────────────────────────────
CREATE TABLE "RepriceQuotaUsage" (
  "id"               TEXT NOT NULL,
  "sellerAccountId"  TEXT NOT NULL,
  "day"              DATE NOT NULL,
  "patchCount"       INTEGER NOT NULL DEFAULT 0,
  "patchRetries"     INTEGER NOT NULL DEFAULT 0,
  "errorCount"       INTEGER NOT NULL DEFAULT 0,
  "rateLimitedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RepriceQuotaUsage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RepriceQuotaUsage_sellerAccountId_day_key"
  ON "RepriceQuotaUsage"("sellerAccountId", "day");
CREATE INDEX "RepriceQuotaUsage_sellerAccountId_day_idx"
  ON "RepriceQuotaUsage"("sellerAccountId", "day");

-- ── RepriceOrder + RepriceOrderItem ──────────────────────────────────────
CREATE TABLE "RepriceOrder" (
  "id"              TEXT NOT NULL,
  "sellerAccountId" TEXT NOT NULL,
  "amazonOrderId"   TEXT NOT NULL,
  "purchaseDate"    TIMESTAMP(3) NOT NULL,
  "orderStatus"     TEXT NOT NULL,
  "totalAmount"     DOUBLE PRECISION,
  "currency"        TEXT NOT NULL DEFAULT 'EUR',
  "marketplaceId"   TEXT NOT NULL DEFAULT 'A1RKKUPIHCS9HS',
  "buyerEmail"      TEXT,
  "fulfillment"     TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RepriceOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RepriceOrder_sellerAccountId_amazonOrderId_key"
  ON "RepriceOrder"("sellerAccountId", "amazonOrderId");
CREATE INDEX "RepriceOrder_sellerAccountId_purchaseDate_idx"
  ON "RepriceOrder"("sellerAccountId", "purchaseDate");

CREATE TABLE "RepriceOrderItem" (
  "id"        TEXT NOT NULL,
  "orderId"   TEXT NOT NULL,
  "listingId" TEXT,
  "asin"      TEXT NOT NULL,
  "sku"       TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "quantity"  INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DOUBLE PRECISION,
  "itemPrice" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepriceOrderItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RepriceOrderItem_orderId_idx"           ON "RepriceOrderItem"("orderId");
CREATE INDEX "RepriceOrderItem_listingId_createdAt_idx" ON "RepriceOrderItem"("listingId", "createdAt");
CREATE INDEX "RepriceOrderItem_asin_idx"              ON "RepriceOrderItem"("asin");
CREATE INDEX "RepriceOrderItem_sku_idx"               ON "RepriceOrderItem"("sku");

ALTER TABLE "RepriceOrderItem"
  ADD CONSTRAINT "RepriceOrderItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "RepriceOrder"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RepriceOrderItem"
  ADD CONSTRAINT "RepriceOrderItem_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "SellerListing"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
