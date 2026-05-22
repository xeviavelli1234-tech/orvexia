-- Motor: filtros de competencia, Buy Box, defaults de cuenta, horario, dry-run

CREATE TYPE "FulfillmentFilter" AS ENUM ('ANY', 'FBA', 'FBM');
CREATE TYPE "BuyBoxStatus" AS ENUM ('UNKNOWN', 'WON', 'LOST');

ALTER TABLE "SellerAccount"
  ADD COLUMN "defaultStrategy" "RepriceStrategy" NOT NULL DEFAULT 'BUYBOX',
  ADD COLUMN "defaultUndercutType" "UndercutType" NOT NULL DEFAULT 'AMOUNT',
  ADD COLUMN "defaultUndercutValue" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
  ADD COLUMN "defaultNoCompetition" "NoCompetitionMode" NOT NULL DEFAULT 'MAX',
  ADD COLUMN "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "scheduleStartHour" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "scheduleEndHour" INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN "dryRun" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "patchDelayMs" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "SellerListing"
  ADD COLUMN "useAccountDefaults" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ignoreAmazon" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "fulfillmentFilter" "FulfillmentFilter" NOT NULL DEFAULT 'ANY',
  ADD COLUMN "minSellerRating" DOUBLE PRECISION,
  ADD COLUMN "buyBoxStatus" "BuyBoxStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "buyBoxPrice" DOUBLE PRECISION,
  ADD COLUMN "buyBoxAt" TIMESTAMP(3);

ALTER TABLE "RepricingEvent"
  ADD COLUMN "simulated" BOOLEAN NOT NULL DEFAULT false;
