-- Etiquetas / grupos de producto (cadena separada por comas)
ALTER TABLE "SellerListing" ADD COLUMN "tags" TEXT NOT NULL DEFAULT '';
