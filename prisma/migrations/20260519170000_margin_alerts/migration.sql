-- Calculadora de costes/margen: nuevos componentes de coste por listing
ALTER TABLE "SellerListing" ADD COLUMN "shippingCost" DOUBLE PRECISION;
ALTER TABLE "SellerListing" ADD COLUMN "fbaFee" DOUBLE PRECISION;
ALTER TABLE "SellerListing" ADD COLUMN "vatRate" DOUBLE PRECISION DEFAULT 21;

-- Alertas por email a nivel de cuenta
ALTER TABLE "SellerAccount" ADD COLUMN "alertsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SellerAccount" ADD COLUMN "alertEmail" TEXT;
ALTER TABLE "SellerAccount" ADD COLUMN "alertOnBuyBoxLost" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SellerAccount" ADD COLUMN "alertOnPriceFloor" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SellerAccount" ADD COLUMN "alertOnError" BOOLEAN NOT NULL DEFAULT true;
