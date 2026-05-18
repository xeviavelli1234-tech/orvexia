-- Sincronización automática programada del catálogo
ALTER TABLE "SellerAccount" ADD COLUMN "autoSyncHours" INTEGER NOT NULL DEFAULT 0;
