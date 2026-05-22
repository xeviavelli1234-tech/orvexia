-- CreateEnum
CREATE TYPE "AffiliateConversionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "AffiliateConversion" (
    "id" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "commission" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "AffiliateConversionStatus" NOT NULL DEFAULT 'PENDING',
    "clickEventId" TEXT,
    "rawPayload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateConversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AffiliateConversion_store_receivedAt_idx" ON "AffiliateConversion"("store", "receivedAt");

-- CreateIndex
CREATE INDEX "AffiliateConversion_status_idx" ON "AffiliateConversion"("status");

-- CreateIndex
CREATE INDEX "AffiliateConversion_clickEventId_idx" ON "AffiliateConversion"("clickEventId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateConversion_network_transactionId_key" ON "AffiliateConversion"("network", "transactionId");

-- AddForeignKey
ALTER TABLE "AffiliateConversion" ADD CONSTRAINT "AffiliateConversion_clickEventId_fkey" FOREIGN KEY ("clickEventId") REFERENCES "AffiliateClickEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
