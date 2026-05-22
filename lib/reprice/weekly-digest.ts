import "server-only";
import { prisma } from "@/lib/prisma";
import { getCatalogHealth } from "./health";
import { getSalesKpisForUser } from "./orders-sync";
import { getLastDaysUsage } from "./quota";
import { sendRepricerWeeklyDigestEmail } from "@/lib/email";
import { sendToExternalChannels } from "./notify-external";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Recopila datos de la última semana de un seller y genera un resumen
 * ejecutivo (texto + secciones) usando IA si hay key. Si no, fallback
 * heurístico. Envía por email y por canales externos suscritos.
 */
export async function generateAndSendWeeklyDigest(
  sellerAccountId: string,
  opts?: { force?: boolean },
): Promise<{ sent: boolean; reason?: string }> {
  const acc = await prisma.sellerAccount.findUnique({
    where: { id: sellerAccountId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!acc) return { sent: false, reason: "no_account" };

  // Cooldown 6 días para no spamear
  if (!opts?.force && acc.weeklyDigestSentAt) {
    const age = Date.now() - acc.weeklyDigestSentAt.getTime();
    if (age < 6 * 24 * 60 * 60 * 1000) return { sent: false, reason: "cooldown" };
  }

  // Recopila datos
  const [health, sales, quota] = await Promise.all([
    getCatalogHealth(acc.userId),
    getSalesKpisForUser(acc.userId, 7),
    getLastDaysUsage(sellerAccountId, 7),
  ]);

  const lastWeek = new Date(Date.now() - ONE_WEEK_MS);
  const eventsCount = await prisma.repricingEvent.count({
    where: {
      listing: { sellerAccountId },
      createdAt: { gte: lastWeek },
      success: true,
    },
  });
  const errorsCount = await prisma.repricingEvent.count({
    where: {
      listing: { sellerAccountId },
      createdAt: { gte: lastWeek },
      success: false,
    },
  });

  const summary = {
    healthScore: health.health.score,
    healthLetter: health.health.letter,
    suggestionsCount: health.suggestions.length,
    topSuggestions: health.suggestions.slice(0, 3).map((s) => s.title),
    eventsCount,
    errorsCount,
    ordersCount: sales.ordersTotal,
    revenueTotal: sales.revenueTotal,
    bestHour: bestHour(sales.hourlyDistribution),
    quotaPatch: quota.reduce((s, q) => s + q.patchCount, 0),
    quotaRateLimited: quota.reduce((s, q) => s + q.rateLimitedCount, 0),
  };

  // Narrativa 100% local: la heurística enriquecida (`heuristicNarrative`)
  // genera un resumen ejecutivo a partir de las métricas, sin cloud.
  const narrative = heuristicNarrative(summary);

  // Envío email
  const to = (acc.alertEmail && acc.alertEmail.trim()) || acc.user.email;
  await sendRepricerWeeklyDigestEmail({
    to,
    name: acc.user.name,
    narrative,
    summary,
    aiUsed: false,
  }).catch((e) => console.warn("[weekly-digest] email failed:", e));

  // Notificación externa (resumen acortado)
  const short = `📊 Resumen semanal Orvexia\nSalud: ${summary.healthLetter} (${summary.healthScore}/100) · Eventos: ${summary.eventsCount} · Errores: ${summary.errorsCount} · Pedidos: ${summary.ordersCount} · Sugerencias: ${summary.suggestionsCount}`;
  await sendToExternalChannels({
    sellerAccountId,
    category: "weekly",
    text: short,
  }).catch(() => {});

  await prisma.sellerAccount.update({
    where: { id: sellerAccountId },
    data: { weeklyDigestSentAt: new Date() },
  });

  return { sent: true };
}

function bestHour(hist: number[]): number | null {
  let bestH = -1;
  let bestV = -1;
  for (let h = 0; h < hist.length; h++) {
    if (hist[h] > bestV) {
      bestV = hist[h];
      bestH = h;
    }
  }
  return bestV > 0 ? bestH : null;
}

interface DigestSummary {
  healthScore: number;
  healthLetter: string;
  suggestionsCount: number;
  topSuggestions: string[];
  eventsCount: number;
  errorsCount: number;
  ordersCount: number;
  revenueTotal: number;
  bestHour: number | null;
  quotaPatch: number;
  quotaRateLimited: number;
}

function heuristicNarrative(s: DigestSummary): string {
  const lines: string[] = [];
  lines.push(
    `Tu catálogo cerró la semana con un score de salud ${s.healthLetter} (${s.healthScore}/100).`,
  );
  if (s.ordersCount > 0) {
    lines.push(
      `Has tenido ${s.ordersCount} pedidos con ${s.revenueTotal.toFixed(2)} € de facturación.`,
    );
    if (s.bestHour != null) {
      lines.push(`Tu franja con más ventas fue ${String(s.bestHour).padStart(2, "0")}:00.`);
    }
  }
  lines.push(
    `El motor aplicó ${s.eventsCount} cambios exitosos y registró ${s.errorsCount} errores.`,
  );
  if (s.quotaRateLimited > 0) {
    lines.push(
      `Atención: hubo ${s.quotaRateLimited} peticiones rate-limited por Amazon esta semana.`,
    );
  }
  if (s.suggestionsCount > 0) {
    lines.push(
      `Tienes ${s.suggestionsCount} sugerencias accionables pendientes. Revisa el panel para resolverlas.`,
    );
  }
  return lines.join(" ");
}

export async function runWeeklyDigestForAll(): Promise<{
  accounts: number;
  sent: number;
  skipped: number;
}> {
  const accounts = await prisma.sellerAccount.findMany({
    where: { active: true },
    select: { id: true },
  });
  let sent = 0;
  let skipped = 0;
  for (const acc of accounts) {
    const r = await generateAndSendWeeklyDigest(acc.id);
    if (r.sent) sent++;
    else skipped++;
  }
  return { accounts: accounts.length, sent, skipped };
}
