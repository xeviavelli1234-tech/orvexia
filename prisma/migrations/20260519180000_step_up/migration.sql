-- Estrategia step-up: subir gradualmente hacia el máximo sin competencia
ALTER TYPE "NoCompetitionMode" ADD VALUE IF NOT EXISTS 'STEP_UP';

ALTER TABLE "SellerListing"
  ADD COLUMN "stepUpType" "UndercutType" NOT NULL DEFAULT 'AMOUNT',
  ADD COLUMN "stepUpValue" DOUBLE PRECISION NOT NULL DEFAULT 0.05;

ALTER TABLE "SellerAccount"
  ADD COLUMN "defaultStepUpType" "UndercutType" NOT NULL DEFAULT 'AMOUNT',
  ADD COLUMN "defaultStepUpValue" DOUBLE PRECISION NOT NULL DEFAULT 0.05;
