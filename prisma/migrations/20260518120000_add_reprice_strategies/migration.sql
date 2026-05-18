-- Estrategias de reprecio por producto

CREATE TYPE "RepriceStrategy" AS ENUM ('BUYBOX', 'MATCH', 'FIXED', 'MARGIN');
CREATE TYPE "UndercutType" AS ENUM ('AMOUNT', 'PERCENT');
CREATE TYPE "NoCompetitionMode" AS ENUM ('MAX', 'HOLD');

ALTER TABLE "SellerListing"
  ADD COLUMN "strategy" "RepriceStrategy" NOT NULL DEFAULT 'BUYBOX',
  ADD COLUMN "undercutType" "UndercutType" NOT NULL DEFAULT 'AMOUNT',
  ADD COLUMN "undercutValue" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
  ADD COLUMN "fixedPrice" DOUBLE PRECISION,
  ADD COLUMN "cost" DOUBLE PRECISION,
  ADD COLUMN "feePercent" DOUBLE PRECISION DEFAULT 15,
  ADD COLUMN "targetMargin" DOUBLE PRECISION DEFAULT 10,
  ADD COLUMN "noCompetition" "NoCompetitionMode" NOT NULL DEFAULT 'MAX';
