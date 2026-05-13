-- CreateEnum
CREATE TYPE "SellerPlan" AS ENUM ('TRIAL', 'PRO');

-- CreateTable
CREATE TABLE "SellerAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amazonSellerId" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL DEFAULT 'A1RKKUPIHCS9HS',
    "refreshToken" TEXT NOT NULL,
    "spApiEnv" TEXT NOT NULL DEFAULT 'sandbox',
    "plan" "SellerPlan" NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "intervalSeconds" INTEGER NOT NULL DEFAULT 900,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerListing" (
    "id" TEXT NOT NULL,
    "sellerAccountId" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "priceCurrent" DOUBLE PRECISION NOT NULL,
    "priceMin" DOUBLE PRECISION,
    "priceMax" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "repricingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastRepricedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepricingRun" (
    "id" TEXT NOT NULL,
    "sellerAccountId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "listingsProcessed" INTEGER NOT NULL DEFAULT 0,
    "listingsRepriced" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "RepricingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepricingEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "priceBefore" DOUBLE PRECISION NOT NULL,
    "priceAfter" DOUBLE PRECISION NOT NULL,
    "competitorPrice" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepricingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerAccount_userId_key" ON "SellerAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerAccount_amazonSellerId_key" ON "SellerAccount"("amazonSellerId");

-- CreateIndex
CREATE INDEX "SellerAccount_active_lastRunAt_idx" ON "SellerAccount"("active", "lastRunAt");

-- CreateIndex
CREATE INDEX "SellerListing_sellerAccountId_repricingEnabled_idx" ON "SellerListing"("sellerAccountId", "repricingEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "SellerListing_sellerAccountId_sku_key" ON "SellerListing"("sellerAccountId", "sku");

-- CreateIndex
CREATE INDEX "RepricingRun_sellerAccountId_startedAt_idx" ON "RepricingRun"("sellerAccountId", "startedAt");

-- CreateIndex
CREATE INDEX "RepricingEvent_listingId_createdAt_idx" ON "RepricingEvent"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "RepricingEvent_runId_idx" ON "RepricingEvent"("runId");

-- AddForeignKey
ALTER TABLE "SellerAccount" ADD CONSTRAINT "SellerAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerListing" ADD CONSTRAINT "SellerListing_sellerAccountId_fkey" FOREIGN KEY ("sellerAccountId") REFERENCES "SellerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepricingRun" ADD CONSTRAINT "RepricingRun_sellerAccountId_fkey" FOREIGN KEY ("sellerAccountId") REFERENCES "SellerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepricingEvent" ADD CONSTRAINT "RepricingEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RepricingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepricingEvent" ADD CONSTRAINT "RepricingEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "SellerListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
