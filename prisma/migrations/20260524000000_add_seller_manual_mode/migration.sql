-- Manual-mode support for sellers without an Amazon account.
--
-- SellerAccount.mode = 'amazon' (default, existing rows) or 'manual'.
-- For mode='manual', amazonSellerId carries a synthetic id (manual_<cuid>)
-- and refreshToken is empty. The unique constraint on amazonSellerId is
-- preserved by virtue of the synthetic ids being unique.
--
-- SellerListing.source distinguishes rows imported via SP-API from rows
-- uploaded via CSV in manual mode.
--
-- suggestedPrice / suggestedAt / suggestedConfidence / suggestedStrategy /
-- suggestedReason cache the output of the last "Generar plan de precios"
-- batch run so the CSV export endpoint can serve the plan without
-- re-running the AI for every download.

ALTER TABLE "SellerAccount"
  ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'amazon';

ALTER TABLE "SellerListing"
  ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'amazon',
  ADD COLUMN     "suggestedPrice" DOUBLE PRECISION,
  ADD COLUMN     "suggestedAt" TIMESTAMP(3),
  ADD COLUMN     "suggestedConfidence" DOUBLE PRECISION,
  ADD COLUMN     "suggestedStrategy" TEXT,
  ADD COLUMN     "suggestedReason" TEXT;
