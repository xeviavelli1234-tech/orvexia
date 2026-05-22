-- AlterTable
ALTER TABLE "SellerAccount" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "SellerAccount" ADD COLUMN "stripeSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SellerAccount_stripeCustomerId_key" ON "SellerAccount"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerAccount_stripeSubscriptionId_key" ON "SellerAccount"("stripeSubscriptionId");
