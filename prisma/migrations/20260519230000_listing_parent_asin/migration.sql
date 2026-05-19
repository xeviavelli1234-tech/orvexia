-- Variaciones: ASIN padre por listing
ALTER TABLE "SellerListing" ADD COLUMN "parentAsin" TEXT NOT NULL DEFAULT '';
