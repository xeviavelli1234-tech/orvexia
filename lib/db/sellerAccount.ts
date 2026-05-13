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
  const encrypted = encryptToken(params.refreshToken);
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
