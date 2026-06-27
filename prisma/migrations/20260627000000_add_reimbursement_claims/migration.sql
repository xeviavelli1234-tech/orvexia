-- CreateEnum
CREATE TYPE "ReimbursementClaimType" AS ENUM ('WAREHOUSE_LOST', 'WAREHOUSE_DAMAGED', 'INBOUND_SHORTAGE', 'CUSTOMER_RETURN_MISSING', 'REIMBURSEMENT_SHORTFALL', 'OVERCHARGED_FEE');

-- CreateEnum
CREATE TYPE "ReimbursementClaimStatus" AS ENUM ('DETECTED', 'READY', 'FILED', 'RECOVERED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "SellerAccount" ADD COLUMN "lastReimbursementAuditAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ReimbursementClaim" (
    "id" TEXT NOT NULL,
    "sellerAccountId" TEXT NOT NULL,
    "type" "ReimbursementClaimType" NOT NULL,
    "status" "ReimbursementClaimStatus" NOT NULL DEFAULT 'DETECTED',
    "sku" TEXT NOT NULL,
    "asin" TEXT NOT NULL DEFAULT '',
    "fnsku" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "estimatedAmount" DOUBLE PRECISION NOT NULL,
    "recoveredAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "caseText" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowExpiresAt" TIMESTAMP(3),
    "filedAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReimbursementClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReimbursementClaim_sellerAccountId_dedupeKey_key" ON "ReimbursementClaim"("sellerAccountId", "dedupeKey");

-- CreateIndex
CREATE INDEX "ReimbursementClaim_sellerAccountId_status_idx" ON "ReimbursementClaim"("sellerAccountId", "status");

-- CreateIndex
CREATE INDEX "ReimbursementClaim_sellerAccountId_detectedAt_idx" ON "ReimbursementClaim"("sellerAccountId", "detectedAt");

-- AddForeignKey
ALTER TABLE "ReimbursementClaim" ADD CONSTRAINT "ReimbursementClaim_sellerAccountId_fkey" FOREIGN KEY ("sellerAccountId") REFERENCES "SellerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
