-- Mejoras del motor: histéresis (anti-flapping), debounce, detector de guerra
-- de precios, aceleración geométrica del STEP_UP, estrategia BUYBOX_WINNER y
-- cache del último precio de competencia / streaks por listing.

-- Nueva estrategia: bajar respecto al precio actual del ganador de la Buy Box.
ALTER TYPE "RepriceStrategy" ADD VALUE IF NOT EXISTS 'BUYBOX_WINNER';

ALTER TABLE "SellerAccount"
  ADD COLUMN "minChangeAmount"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "minChangePct"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "debounceSeconds"    INTEGER          NOT NULL DEFAULT 0,
  ADD COLUMN "priceWarCycles"     INTEGER          NOT NULL DEFAULT 0,
  ADD COLUMN "priceWarAction"     TEXT             NOT NULL DEFAULT 'FLOOR',
  ADD COLUMN "stepUpAccelCycles"  INTEGER          NOT NULL DEFAULT 0,
  ADD COLUMN "stepUpMaxMult"      DOUBLE PRECISION NOT NULL DEFAULT 8;

ALTER TABLE "SellerListing"
  ADD COLUMN "lastCompetitorPrice" DOUBLE PRECISION,
  ADD COLUMN "lastCompetitorAt"    TIMESTAMP(3),
  ADD COLUMN "priceWarStreak"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "noCompetitionStreak" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastDirection"       TEXT;
