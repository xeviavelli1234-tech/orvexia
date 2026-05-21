import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Quota tracker: una fila por cuenta y día. Incrementa contadores tras cada
 * PATCH del motor. Sirve para mostrar "uso de hoy" al usuario y detectar
 * abusos / throttling sostenido.
 *
 * Best-effort: nunca lanza ni rompe el ciclo del motor.
 */

function todayDate(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export interface PatchOutcome {
  success: boolean;
  rateLimited?: boolean;
  retries?: number;
}

export async function recordPatch(
  sellerAccountId: string,
  outcome: PatchOutcome,
): Promise<void> {
  try {
    const day = todayDate();
    await prisma.repriceQuotaUsage.upsert({
      where: {
        sellerAccountId_day: { sellerAccountId, day },
      },
      create: {
        sellerAccountId,
        day,
        patchCount: 1,
        patchRetries: outcome.retries ?? 0,
        errorCount: outcome.success ? 0 : 1,
        rateLimitedCount: outcome.rateLimited ? 1 : 0,
      },
      update: {
        patchCount: { increment: 1 },
        patchRetries: { increment: outcome.retries ?? 0 },
        errorCount: { increment: outcome.success ? 0 : 1 },
        rateLimitedCount: { increment: outcome.rateLimited ? 1 : 0 },
      },
    });
  } catch (e) {
    console.warn("[quota] recordPatch fallo:", e);
  }
}

export async function getTodayUsage(sellerAccountId: string) {
  return prisma.repriceQuotaUsage.findUnique({
    where: { sellerAccountId_day: { sellerAccountId, day: todayDate() } },
  });
}

export async function getLastDaysUsage(
  sellerAccountId: string,
  days = 14,
) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);
  return prisma.repriceQuotaUsage.findMany({
    where: { sellerAccountId, day: { gte: since } },
    orderBy: { day: "asc" },
  });
}
