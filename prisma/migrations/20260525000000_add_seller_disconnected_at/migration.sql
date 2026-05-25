-- RGPD / Amazon DPP: registra el momento de desconexión para que el cron
-- de purga elimine la SellerAccount (y, en cascada, listings, runs, eventos,
-- auditoría y el refresh token cifrado) cuando hayan pasado 30 días.

ALTER TABLE "SellerAccount"
  ADD COLUMN "disconnectedAt" TIMESTAMP(3);

CREATE INDEX "SellerAccount_active_disconnectedAt_idx"
  ON "SellerAccount" ("active", "disconnectedAt");

-- Filas ya inactivas antes de esta migración: las marcamos como
-- desconectadas ahora para que entren en la ventana de retención
-- (en lugar de quedarse "huérfanas" para siempre).
UPDATE "SellerAccount"
  SET "disconnectedAt" = NOW()
  WHERE "active" = false AND "disconnectedAt" IS NULL;
