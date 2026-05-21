import "server-only";
import { prisma } from "@/lib/prisma";
import {
  calculateHealth,
  generateSuggestions,
  type HealthScore,
  type Suggestion,
  type ListingSnapshot,
} from "./health-core";

export type { HealthScore, Suggestion } from "./health-core";

/**
 * Carga listings + últimos eventos del seller y construye el health score
 * + sugerencias proactivas. Devuelve ambas cosas para la UI.
 */
export async function getCatalogHealth(userId: string): Promise<{
  health: HealthScore;
  suggestions: Suggestion[];
}> {
  const acc = await prisma.sellerAccount.findUnique({
    where: { userId },
    select: { id: true, lastSyncAt: true },
  });
  if (!acc) {
    return {
      health: calculateHealth([]),
      suggestions: [],
    };
  }

  // Carga listings + últimos 30 eventos para calcular streaks y "días en mínimo"
  const listings = await prisma.sellerListing.findMany({
    where: { sellerAccountId: acc.id },
    include: {
      events: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          priceAfter: true,
          reason: true,
          buyBox: true,
          success: true,
          createdAt: true,
        },
      },
    },
  });

  const now = Date.now();
  const snapshots: ListingSnapshot[] = listings.map((l) => {
    // Streak Buy Box perdida: cuántos de los eventos más recientes están en LOST seguidos
    let lossStreak = 0;
    let firstWonAgoDays: number | null = null;
    for (const e of l.events) {
      if (e.buyBox === "LOST") lossStreak++;
      else {
        if (e.buyBox === "WON" && firstWonAgoDays == null) {
          firstWonAgoDays = Math.round((now - e.createdAt.getTime()) / (24 * 60 * 60 * 1000));
        }
        break;
      }
    }
    // Días tocando mínimo: eventos consecutivos con reason="min_floor"/"margin_floor"
    let floorStreak = 0;
    for (const e of l.events) {
      if (e.success && (e.reason === "min_floor" || e.reason === "margin_floor")) {
        floorStreak++;
      } else break;
    }
    const daysAtPriceFloor =
      floorStreak === 0
        ? 0
        : Math.max(
            1,
            Math.round(
              (now - (l.events[Math.min(floorStreak - 1, l.events.length - 1)].createdAt.getTime())) /
                (24 * 60 * 60 * 1000),
            ),
          );

    const daysSinceLastReprice = l.lastRepricedAt
      ? Math.round((now - l.lastRepricedAt.getTime()) / (24 * 60 * 60 * 1000))
      : null;

    return {
      id: l.id,
      sku: l.sku,
      title: l.title,
      priceCurrent: l.priceCurrent,
      priceMin: l.priceMin,
      priceMax: l.priceMax,
      cost: l.cost,
      repricingEnabled: l.repricingEnabled,
      autoPausedAt: l.autoPausedAt,
      manualPriceDetected: l.manualPriceDetected,
      buyBoxStatus: l.buyBoxStatus as "WON" | "LOST" | "UNKNOWN",
      lastBuyBoxLossStreak: lossStreak,
      daysSinceLastReprice,
      daysSinceLastBuyBoxWon: firstWonAgoDays,
      daysAtPriceFloor,
      consecutiveErrors: l.consecutiveErrors,
      asinValid: !!l.asin && l.priceCurrent > 0,
    };
  });

  const lastSyncAgeHours = acc.lastSyncAt
    ? (now - acc.lastSyncAt.getTime()) / (60 * 60 * 1000)
    : null;

  return {
    health: calculateHealth(snapshots),
    suggestions: generateSuggestions(snapshots, { lastSyncAgeHours }),
  };
}

// ─── Detector de dumpers (acumula y persiste en BD) ────────────────────────
/**
 * Registra un competidor como potencial dumper. Se incrementa la cuenta
 * cuando un mismo seller nos baja el precio repetidamente. Cuando supera
 * un umbral (5 detecciones), se considera confirmado.
 */
export async function recordDumperHit(
  sellerAccountId: string,
  amazonSellerId: string,
): Promise<void> {
  try {
    await prisma.detectedDumper.upsert({
      where: {
        sellerAccountId_amazonSellerId: { sellerAccountId, amazonSellerId },
      },
      create: { sellerAccountId, amazonSellerId, occurrences: 1 },
      update: {
        occurrences: { increment: 1 },
        lastDetectedAt: new Date(),
      },
    });
  } catch (e) {
    console.warn("[health] recordDumperHit:", e);
  }
}

export async function listConfirmedDumpers(sellerAccountId: string) {
  return prisma.detectedDumper.findMany({
    where: { sellerAccountId, occurrences: { gte: 5 }, acknowledged: false },
    orderBy: { occurrences: "desc" },
    take: 10,
  });
}
