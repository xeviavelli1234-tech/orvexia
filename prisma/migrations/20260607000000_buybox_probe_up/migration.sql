-- Sondeo al alza de la Buy Box (BUYBOX_WINNER): cuando tenemos la Buy Box,
-- en vez de mantener el precio, subir un paso por ciclo hacia el techo para
-- recuperar margen hasta perderla. Opt-in por cuenta y por listing.

ALTER TABLE "SellerAccount"
  ADD COLUMN "defaultBuyBoxProbeUp" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SellerListing"
  ADD COLUMN "buyBoxProbeUp" BOOLEAN NOT NULL DEFAULT false;
