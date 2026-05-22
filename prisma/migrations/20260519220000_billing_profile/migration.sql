-- Datos fiscales del cliente para la factura
ALTER TABLE "SellerAccount" ADD COLUMN "billingName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SellerAccount" ADD COLUMN "billingTaxId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SellerAccount" ADD COLUMN "billingAddress" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SellerAccount" ADD COLUMN "billingCountry" TEXT NOT NULL DEFAULT 'ES';
