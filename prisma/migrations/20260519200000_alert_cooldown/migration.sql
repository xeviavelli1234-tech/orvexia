-- Cooldown anti-spam de correos de alertas
ALTER TABLE "SellerAccount" ADD COLUMN "lastAlertAt" TIMESTAMP(3);
