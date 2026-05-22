-- Reglas por competidor: listas negra/blanca de seller IDs
ALTER TABLE "SellerListing" ADD COLUMN "excludeSellers" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SellerListing" ADD COLUMN "onlySellers" TEXT NOT NULL DEFAULT '';
