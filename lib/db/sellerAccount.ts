import "server-only";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";
import { MARKETPLACE_IDS } from "@/lib/amazon/endpoints";

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

export async function setAccountSettings(params: {
  userId: string;
  scheduleEnabled: boolean;
  scheduleStartHour: number;
  scheduleEndHour: number;
  dryRun: boolean;
  patchDelayMs: number;
  autoSyncHours: number;
  defaultStrategy: "BUYBOX" | "MATCH" | "FIXED" | "MARGIN";
  defaultUndercutType: "AMOUNT" | "PERCENT";
  defaultUndercutValue: number;
  defaultNoCompetition: "MAX" | "HOLD";
  alertsEnabled: boolean;
  alertEmail: string | null;
  alertOnBuyBoxLost: boolean;
  alertOnPriceFloor: boolean;
  alertOnError: boolean;
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
      alertsEnabled: params.alertsEnabled,
      alertEmail: params.alertEmail?.trim() ? params.alertEmail.trim() : null,
      alertOnBuyBoxLost: params.alertOnBuyBoxLost,
      alertOnPriceFloor: params.alertOnPriceFloor,
      alertOnError: params.alertOnError,
    },
  });
}
