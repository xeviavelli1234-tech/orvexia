-- Seguridad: passkeys (WebAuthn), magic links, login attempts,
-- trusted locations, challenges WebAuthn temporales y IP allowlist.

CREATE TABLE "Passkey" (
  "id"           TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "publicKey"    TEXT NOT NULL,
  "counter"      INTEGER NOT NULL DEFAULT 0,
  "transports"   TEXT NOT NULL DEFAULT '',
  "deviceType"   TEXT NOT NULL DEFAULT 'singleDevice',
  "backedUp"     BOOLEAN NOT NULL DEFAULT false,
  "name"         TEXT NOT NULL DEFAULT 'Mi llave',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt"   TIMESTAMP(3),
  CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Passkey_credentialId_key" ON "Passkey"("credentialId");
CREATE INDEX "Passkey_userId_idx" ON "Passkey"("userId");
ALTER TABLE "Passkey"
  ADD CONSTRAINT "Passkey_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MagicLink" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "tokenHash"   TEXT NOT NULL,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "usedAt"      TIMESTAMP(3),
  "ipAtRequest" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MagicLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MagicLink_tokenHash_key" ON "MagicLink"("tokenHash");
CREATE INDEX "MagicLink_userId_expiresAt_idx" ON "MagicLink"("userId", "expiresAt");
ALTER TABLE "MagicLink"
  ADD CONSTRAINT "MagicLink_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LoginAttempt" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT,
  "email"     TEXT,
  "ip"        TEXT,
  "country"   TEXT,
  "userAgent" TEXT,
  "method"    TEXT NOT NULL DEFAULT 'password',
  "success"   BOOLEAN NOT NULL,
  "reason"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LoginAttempt_userId_createdAt_idx" ON "LoginAttempt"("userId", "createdAt");
CREATE INDEX "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");
ALTER TABLE "LoginAttempt"
  ADD CONSTRAINT "LoginAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TrustedLocation" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "ip"         TEXT NOT NULL,
  "country"    TEXT,
  "label"      TEXT NOT NULL DEFAULT 'Sin etiqueta',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrustedLocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TrustedLocation_userId_ip_key" ON "TrustedLocation"("userId", "ip");
CREATE INDEX "TrustedLocation_userId_idx" ON "TrustedLocation"("userId");
ALTER TABLE "TrustedLocation"
  ADD CONSTRAINT "TrustedLocation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WebAuthnChallenge" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT,
  "challenge" TEXT NOT NULL,
  "type"      TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebAuthnChallenge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WebAuthnChallenge_challenge_key" ON "WebAuthnChallenge"("challenge");
CREATE INDEX "WebAuthnChallenge_challenge_expiresAt_idx" ON "WebAuthnChallenge"("challenge", "expiresAt");

-- IP allowlist por cuenta
ALTER TABLE "SellerAccount" ADD COLUMN "ipAllowlist" TEXT NOT NULL DEFAULT '';
