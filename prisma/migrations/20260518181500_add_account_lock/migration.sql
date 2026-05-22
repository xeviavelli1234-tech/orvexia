-- Lock de ciclo de reprecio (evita ejecuciones solapadas por cuenta)
ALTER TABLE "SellerAccount" ADD COLUMN "lockedAt" TIMESTAMP(3);
