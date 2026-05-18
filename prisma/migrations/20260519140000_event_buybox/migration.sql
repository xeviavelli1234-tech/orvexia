-- Estado de Buy Box por evento de reprecio
ALTER TABLE "RepricingEvent" ADD COLUMN "buyBox" "BuyBoxStatus" NOT NULL DEFAULT 'UNKNOWN';
