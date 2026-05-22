-- Herramientas extra: vacaciones, notas, canales notificación, dumpers, explicaciones IA

-- ── SellerAccount: vacaciones + cooldown digest semanal ─────────────────
ALTER TABLE "SellerAccount" ADD COLUMN "vacationFrom"       TIMESTAMP(3);
ALTER TABLE "SellerAccount" ADD COLUMN "vacationTo"         TIMESTAMP(3);
ALTER TABLE "SellerAccount" ADD COLUMN "vacationNote"       TEXT NOT NULL DEFAULT '';
ALTER TABLE "SellerAccount" ADD COLUMN "weeklyDigestSentAt" TIMESTAMP(3);

-- ── ListingNote ─────────────────────────────────────────────────────────
CREATE TABLE "ListingNote" (
  "id"        TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ListingNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ListingNote_listingId_createdAt_idx" ON "ListingNote"("listingId", "createdAt");
ALTER TABLE "ListingNote"
  ADD CONSTRAINT "ListingNote_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "SellerListing"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── NotificationChannel ─────────────────────────────────────────────────
CREATE TABLE "NotificationChannel" (
  "id"              TEXT NOT NULL,
  "sellerAccountId" TEXT NOT NULL,
  "kind"            TEXT NOT NULL,
  "label"           TEXT NOT NULL DEFAULT 'Canal',
  "webhookUrl"      TEXT NOT NULL,
  "extraTarget"     TEXT NOT NULL DEFAULT '',
  "enabled"         BOOLEAN NOT NULL DEFAULT true,
  "alertBuyBoxLost" BOOLEAN NOT NULL DEFAULT true,
  "alertPriceFloor" BOOLEAN NOT NULL DEFAULT true,
  "alertError"      BOOLEAN NOT NULL DEFAULT true,
  "alertAutoPause"  BOOLEAN NOT NULL DEFAULT true,
  "alertWeekly"     BOOLEAN NOT NULL DEFAULT true,
  "lastSentAt"      TIMESTAMP(3),
  "lastError"       TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationChannel_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NotificationChannel_sellerAccountId_enabled_idx"
  ON "NotificationChannel"("sellerAccountId", "enabled");

-- ── EventExplanation ────────────────────────────────────────────────────
CREATE TABLE "EventExplanation" (
  "id"        TEXT NOT NULL,
  "eventId"   TEXT NOT NULL,
  "narrative" TEXT NOT NULL,
  "source"    TEXT NOT NULL DEFAULT 'ai',
  "tokensIn"  INTEGER NOT NULL DEFAULT 0,
  "tokensOut" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventExplanation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EventExplanation_eventId_key" ON "EventExplanation"("eventId");
CREATE INDEX "EventExplanation_createdAt_idx" ON "EventExplanation"("createdAt");

-- ── DetectedDumper ──────────────────────────────────────────────────────
CREATE TABLE "DetectedDumper" (
  "id"              TEXT NOT NULL,
  "sellerAccountId" TEXT NOT NULL,
  "amazonSellerId"  TEXT NOT NULL,
  "occurrences"     INTEGER NOT NULL DEFAULT 1,
  "lastDetectedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledged"    BOOLEAN NOT NULL DEFAULT false,
  "excluded"        BOOLEAN NOT NULL DEFAULT false,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DetectedDumper_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DetectedDumper_sellerAccountId_amazonSellerId_key"
  ON "DetectedDumper"("sellerAccountId", "amazonSellerId");
CREATE INDEX "DetectedDumper_sellerAccountId_acknowledged_idx"
  ON "DetectedDumper"("sellerAccountId", "acknowledged");
