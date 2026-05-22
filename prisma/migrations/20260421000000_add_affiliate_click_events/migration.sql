-- CreateTable
CREATE TABLE "AffiliateClickEvent" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "selectedRetailer" TEXT NOT NULL,
    "retailerPosition" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "pageContext" TEXT,
    "placement" TEXT,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AffiliateClickEvent_productId_clickedAt_idx" ON "AffiliateClickEvent"("productId", "clickedAt");

-- CreateIndex
CREATE INDEX "AffiliateClickEvent_selectedRetailer_clickedAt_idx" ON "AffiliateClickEvent"("selectedRetailer", "clickedAt");

-- CreateIndex
CREATE INDEX "AffiliateClickEvent_userId_clickedAt_idx" ON "AffiliateClickEvent"("userId", "clickedAt");

-- AddForeignKey
ALTER TABLE "AffiliateClickEvent" ADD CONSTRAINT "AffiliateClickEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClickEvent" ADD CONSTRAINT "AffiliateClickEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
