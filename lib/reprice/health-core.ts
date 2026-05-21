/**
 * Score de salud del catálogo + generación de sugerencias proactivas.
 *
 * Núcleo puro: sin BD ni server-only, todo derivado de un snapshot de los
 * listings. Lo usa `health.ts` (server-only) que carga los datos.
 *
 * Score 0-100 con desglose por categoría; sugerencias accionables con
 * severidad ordenable.
 */

export interface ListingSnapshot {
  id: string;
  sku: string;
  title: string;
  priceCurrent: number;
  priceMin: number | null;
  priceMax: number | null;
  cost: number | null;
  repricingEnabled: boolean;
  autoPausedAt: Date | null;
  manualPriceDetected: boolean;
  buyBoxStatus: "WON" | "LOST" | "UNKNOWN";
  lastBuyBoxLossStreak: number; // ciclos consecutivos perdiendo Buy Box
  daysSinceLastReprice: number | null;
  daysSinceLastBuyBoxWon: number | null;
  daysAtPriceFloor: number; // días seguidos topando con el mínimo
  consecutiveErrors: number;
  asinValid: boolean; // tiene oferta y ASIN
}

export interface HealthBreakdown {
  active: number;       // % productos con repricingEnabled
  configured: number;   // % con rango Mín/Máx
  costed: number;       // % con coste configurado
  winning: number;      // % con Buy Box ganada
  healthy: number;      // % sin errores ni autopausa
  total: number;        // count total
  byBucket: Record<string, number>;
}

export interface HealthScore {
  score: number;         // 0..100
  letter: "A" | "B" | "C" | "D" | "F";
  breakdown: HealthBreakdown;
}

export function calculateHealth(listings: ListingSnapshot[]): HealthScore {
  const total = listings.length;
  if (total === 0) {
    return {
      score: 0,
      letter: "F",
      breakdown: { active: 0, configured: 0, costed: 0, winning: 0, healthy: 0, total: 0, byBucket: {} },
    };
  }

  const repriceable = listings.filter((l) => l.asinValid);
  const active = listings.filter((l) => l.repricingEnabled).length;
  const configured = listings.filter((l) => l.priceMin != null && l.priceMax != null).length;
  const costed = listings.filter((l) => l.cost != null && l.cost > 0).length;
  const winning = listings.filter((l) => l.buyBoxStatus === "WON").length;
  const healthy = listings.filter(
    (l) => !l.autoPausedAt && l.consecutiveErrors === 0 && !l.manualPriceDetected,
  ).length;

  const pct = (n: number, base = total) => (base > 0 ? Math.round((n / base) * 100) : 0);

  // Score ponderado:
  //  - 25 % configurados (rango Mín/Máx)
  //  - 20 % activos (toggle on)
  //  - 20 % con coste (para margen real)
  //  - 20 % Buy Box ganada (entre los activos)
  //  - 15 % salud técnica (sin errores ni autopausa)
  const wConfig = pct(configured) * 0.25;
  const wActive = pct(active) * 0.20;
  const wCost = pct(costed) * 0.20;
  const wWin = repriceable.length > 0
    ? pct(winning, repriceable.length) * 0.20
    : 20; // no penalizar si nada es repreciable
  const wHealthy = pct(healthy) * 0.15;
  const score = Math.round(wConfig + wActive + wCost + wWin + wHealthy);

  const letter: HealthScore["letter"] =
    score >= 90 ? "A" :
    score >= 75 ? "B" :
    score >= 55 ? "C" :
    score >= 35 ? "D" : "F";

  return {
    score,
    letter,
    breakdown: {
      active: pct(active),
      configured: pct(configured),
      costed: pct(costed),
      winning: repriceable.length > 0 ? pct(winning, repriceable.length) : 0,
      healthy: pct(healthy),
      total,
      byBucket: {
        autopaused: listings.filter((l) => l.autoPausedAt).length,
        manualPrice: listings.filter((l) => l.manualPriceDetected).length,
        noAsin: listings.filter((l) => !l.asinValid).length,
        atFloor: listings.filter((l) => l.daysAtPriceFloor >= 3).length,
        losingBuyBox: listings.filter((l) => l.buyBoxStatus === "LOST").length,
      },
    },
  };
}

// ─── Sugerencias proactivas ─────────────────────────────────────────────────
export type SuggestionSeverity = "info" | "warn" | "critical";
export type SuggestionKind =
  | "no_range"
  | "no_cost"
  | "auto_paused"
  | "manual_price"
  | "stuck_at_floor"
  | "losing_buybox"
  | "no_asin"
  | "stale_sync";

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  severity: SuggestionSeverity;
  listingId?: string;
  title: string;
  detail: string;
  action: string;
}

const SEV_ORDER: Record<SuggestionSeverity, number> = { critical: 0, warn: 1, info: 2 };

export function generateSuggestions(
  listings: ListingSnapshot[],
  opts: { lastSyncAgeHours: number | null } = { lastSyncAgeHours: null },
): Suggestion[] {
  const out: Suggestion[] = [];

  for (const l of listings) {
    // Críticas: bloquean el funcionamiento real
    if (l.autoPausedAt) {
      out.push({
        id: `autopause-${l.id}`,
        kind: "auto_paused",
        severity: "critical",
        listingId: l.id,
        title: `SKU ${l.sku} autopausado`,
        detail: "Acumuló errores consecutivos y el motor lo desactivó automáticamente.",
        action: "Reanudar manualmente y revisar configuración del producto",
      });
    }
    if (l.manualPriceDetected) {
      out.push({
        id: `manual-${l.id}`,
        kind: "manual_price",
        severity: "warn",
        listingId: l.id,
        title: `Precio cambiado fuera del repricer · ${l.sku}`,
        detail:
          "Detectamos que alguien cambió el precio en Seller Central directamente. El motor lo respeta hasta que aceptes.",
        action: "Aceptar el cambio o aplicar el precio del repricer",
      });
    }

    // Warns: configuración incompleta
    if (l.asinValid && (l.priceMin == null || l.priceMax == null)) {
      out.push({
        id: `norange-${l.id}`,
        kind: "no_range",
        severity: "warn",
        listingId: l.id,
        title: `Sin rango Mín/Máx · ${l.sku}`,
        detail: "Sin rango el motor no puede repreciar. Asigna el precio mínimo rentable y un techo razonable.",
        action: "Definir Mín/Máx en el inspector del producto",
      });
    }
    if (l.repricingEnabled && (l.cost == null || l.cost <= 0)) {
      out.push({
        id: `nocost-${l.id}`,
        kind: "no_cost",
        severity: "info",
        listingId: l.id,
        title: `Sin coste configurado · ${l.sku}`,
        detail: "Sin coste no podemos calcular tu margen real ni proteger contra venta a pérdida.",
        action: "Añadir coste + FBA + envío en Por margen",
      });
    }

    // Bloqueado en mínimo
    if (l.repricingEnabled && l.daysAtPriceFloor >= 5) {
      out.push({
        id: `floor-${l.id}`,
        kind: "stuck_at_floor",
        severity: "warn",
        listingId: l.id,
        title: `Lleva ${l.daysAtPriceFloor} días en mínimo · ${l.sku}`,
        detail: "Está topando con el precio mínimo de forma sostenida. Quizá tu coste es alto o la competencia muy agresiva.",
        action: "Bajar el mínimo, mejorar el coste o cambiar estrategia",
      });
    }

    // Buy Box perdida
    if (l.repricingEnabled && l.buyBoxStatus === "LOST" && l.lastBuyBoxLossStreak >= 3) {
      out.push({
        id: `bblost-${l.id}`,
        kind: "losing_buybox",
        severity: "warn",
        listingId: l.id,
        title: `Buy Box perdida hace ${l.lastBuyBoxLossStreak} ciclos · ${l.sku}`,
        detail: "Llevas varios ciclos sin recuperar la Buy Box. Plantéate bajar el mínimo o usar Ganar Buy Box con margen mayor.",
        action: "Revisar estrategia y mínimo",
      });
    }

    // Sin ASIN / oferta
    if (!l.asinValid) {
      out.push({
        id: `noasin-${l.id}`,
        kind: "no_asin",
        severity: "info",
        listingId: l.id,
        title: `Sin oferta / ASIN · ${l.sku}`,
        detail: "El producto no es repreciable hasta que tenga una oferta válida en Amazon.",
        action: "Revisar el listing en Seller Central",
      });
    }
  }

  // Globales: sincronización muy antigua
  if (opts.lastSyncAgeHours != null && opts.lastSyncAgeHours > 48) {
    out.push({
      id: "global-stale-sync",
      kind: "stale_sync",
      severity: "warn",
      title: `Última sincronización hace ${Math.round(opts.lastSyncAgeHours)} h`,
      detail: "Tus listings llevan más de 2 días sin actualizar. Quizá hay productos nuevos o cambios que se te están escapando.",
      action: "Pulsar Sincronizar con Amazon",
    });
  }

  out.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  return out;
}
