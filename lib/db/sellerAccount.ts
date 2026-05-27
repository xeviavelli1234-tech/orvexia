import "server-only";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";
import { MARKETPLACE_IDS, EU_MARKETPLACE_IDS } from "@/lib/amazon/endpoints";

const TRIAL_DAYS = 14;
const DEFAULT_INTERVAL_SECONDS = 900; // 15 min (TRIAL)

export async function getSellerAccountByUserId(userId: string) {
  return prisma.sellerAccount.findUnique({ where: { userId } });
}

export async function upsertSellerAccount(params: {
  userId: string;
  amazonSellerId: string;
  refreshToken: string; // plaintext, will be encrypted before persist
  spApiEnv: "sandbox" | "production";
}) {
  // El placeholder de modo demo NO es un secreto → se guarda tal cual,
  // sin requerir ENCRYPTION_KEY (así el demo funciona aunque la var no
  // esté configurada en producción). Los refresh tokens REALES sí se
  // cifran (y exigen ENCRYPTION_KEY, como debe ser).
  const encrypted =
    params.refreshToken === "FIXTURE_NO_TOKEN"
      ? "FIXTURE_NO_TOKEN"
      : encryptToken(params.refreshToken);
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  return prisma.sellerAccount.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      amazonSellerId: params.amazonSellerId,
      marketplaceId: MARKETPLACE_IDS.ES,
      refreshToken: encrypted,
      spApiEnv: params.spApiEnv,
      plan: "TRIAL",
      trialEndsAt,
      intervalSeconds: DEFAULT_INTERVAL_SECONDS,
      active: true,
    },
    update: {
      amazonSellerId: params.amazonSellerId,
      refreshToken: encrypted,
      spApiEnv: params.spApiEnv,
      active: true,
    },
  });
}

export async function deactivateSellerAccount(userId: string) {
  return prisma.sellerAccount.update({
    where: { userId },
    data: { active: false },
  });
}

/**
 * Modo MANUAL: el vendedor no está en Amazon. Crea (o reactiva) una
 * SellerAccount sin OAuth, con un `amazonSellerId` sintético para satisfacer
 * el UNIQUE. Se usa para que vendedores de Shopify, web propia, tiendas
 * físicas, etc. puedan subir su catálogo vía CSV y recibir un plan de precios
 * sugerido por la misma IA, sin escribir nunca en Amazon.
 */
export async function upsertManualSellerAccount(userId: string) {
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const syntheticSellerId = `MANUAL-${userId.slice(0, 12)}`;
  return prisma.sellerAccount.upsert({
    where: { userId },
    create: {
      userId,
      amazonSellerId: syntheticSellerId,
      marketplaceId: MARKETPLACE_IDS.ES,
      refreshToken: "MANUAL_NO_TOKEN",
      spApiEnv: "sandbox",
      mode: "manual",
      plan: "TRIAL",
      trialEndsAt,
      intervalSeconds: DEFAULT_INTERVAL_SECONDS,
      active: true,
    },
    update: {
      mode: "manual",
      active: true,
    },
  });
}

/** Datos fiscales del cliente para la factura. */
export async function setBillingProfile(params: {
  userId: string;
  billingName: string;
  billingTaxId: string;
  billingAddress: string;
  billingCountry: string;
}) {
  const acc = await prisma.sellerAccount.findUnique({
    where: { userId: params.userId },
    select: { id: true },
  });
  if (!acc) throw new Error("no_account");
  const cut = (s: string, n: number) => s.trim().slice(0, n);
  return prisma.sellerAccount.update({
    where: { userId: params.userId },
    data: {
      billingName: cut(params.billingName, 160),
      billingTaxId: cut(params.billingTaxId, 40),
      billingAddress: cut(params.billingAddress, 240),
      billingCountry: cut(params.billingCountry || "ES", 4).toUpperCase(),
    },
  });
}

/**
 * RGPD — exporta TODOS los datos del repricer del usuario en un objeto
 * serializable. NUNCA incluye el refresh token (secreto).
 */
export async function exportSellerData(userId: string) {
  const account = await prisma.sellerAccount.findUnique({
    where: { userId },
    include: {
      listings: true,
      runs: {
        orderBy: { startedAt: "desc" },
        include: { events: true },
      },
    },
  });
  if (!account) return null;
  const { refreshToken: _omit, ...safe } = account;
  void _omit;
  return {
    exportedAt: new Date().toISOString(),
    account: safe,
  };
}

/**
 * RGPD — borrado total: elimina la cuenta de repricer y, en cascada,
 * sus listings, ciclos y eventos. El token de Amazon se destruye con
 * la fila. No borra la cuenta de usuario (login) del comparador.
 */
export async function deleteSellerAccount(userId: string) {
  return prisma.sellerAccount.deleteMany({ where: { userId } });
}

export async function setAccountSettings(params: {
  userId: string;
  marketplaceId: string;
  scheduleEnabled: boolean;
  scheduleStartHour: number;
  scheduleEndHour: number;
  dryRun: boolean;
  patchDelayMs: number;
  autoSyncHours: number;
  defaultStrategy: "BUYBOX" | "BUYBOX_WINNER" | "MATCH" | "FIXED" | "MARGIN";
  defaultUndercutType: "AMOUNT" | "PERCENT";
  defaultUndercutValue: number;
  defaultNoCompetition: "MAX" | "HOLD" | "STEP_UP";
  defaultStepUpType: "AMOUNT" | "PERCENT";
  defaultStepUpValue: number;
  alertsEnabled: boolean;
  alertEmail: string | null;
  alertOnBuyBoxLost: boolean;
  alertOnPriceFloor: boolean;
  alertOnError: boolean;
  minChangeAmount: number;
  minChangePct: number;
  debounceSeconds: number;
  priceWarCycles: number;
  priceWarAction: "FLOOR" | "PAUSE";
  stepUpAccelCycles: number;
  stepUpMaxMult: number;
}) {
  const acc = await prisma.sellerAccount.findUnique({
    where: { userId: params.userId },
    select: { id: true },
  });
  if (!acc) throw new Error("no_account");

  const clampH = (n: number, max: number) =>
    Math.max(0, Math.min(max, Math.round(n)));

  return prisma.sellerAccount.update({
    where: { userId: params.userId },
    data: {
      marketplaceId: EU_MARKETPLACE_IDS.includes(params.marketplaceId)
        ? params.marketplaceId
        : MARKETPLACE_IDS.ES,
      scheduleEnabled: params.scheduleEnabled,
      scheduleStartHour: clampH(params.scheduleStartHour, 23),
      scheduleEndHour: clampH(params.scheduleEndHour, 24),
      dryRun: params.dryRun,
      patchDelayMs: Math.max(0, Math.min(10000, Math.round(params.patchDelayMs))),
      autoSyncHours: Math.max(0, Math.min(168, Math.round(params.autoSyncHours))),
      defaultStrategy: params.defaultStrategy,
      defaultUndercutType: params.defaultUndercutType,
      defaultUndercutValue: Math.max(0, params.defaultUndercutValue),
      defaultNoCompetition: params.defaultNoCompetition,
      defaultStepUpType: params.defaultStepUpType,
      defaultStepUpValue: Math.max(0, params.defaultStepUpValue),
      alertsEnabled: params.alertsEnabled,
      alertEmail: params.alertEmail?.trim() ? params.alertEmail.trim() : null,
      alertOnBuyBoxLost: params.alertOnBuyBoxLost,
      alertOnPriceFloor: params.alertOnPriceFloor,
      alertOnError: params.alertOnError,
      minChangeAmount: Math.max(0, params.minChangeAmount),
      minChangePct: Math.max(0, Math.min(100, params.minChangePct)),
      debounceSeconds: Math.max(0, Math.min(86400, Math.round(params.debounceSeconds))),
      priceWarCycles: Math.max(0, Math.min(50, Math.round(params.priceWarCycles))),
      priceWarAction: params.priceWarAction === "PAUSE" ? "PAUSE" : "FLOOR",
      stepUpAccelCycles: Math.max(0, Math.min(50, Math.round(params.stepUpAccelCycles))),
      stepUpMaxMult: Math.max(1, Math.min(64, params.stepUpMaxMult)),
    },
  });
}
