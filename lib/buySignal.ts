import { prisma } from "@/lib/prisma";

export interface BuySignalResult {
  score: number;
  label: string;
  color: "green" | "blue" | "yellow" | "orange" | "red" | "gray";
  // Factores siempre reales
  storeScore:  number;   // 0-20  basado en reputación de tienda
  dealScore:   number;   // 0-15  basado en priceOld validado
  isFakeDeal:  boolean;
  // Factores que requieren historial
  priceScore:  number | null;  // null = sin datos
  trendScore:  number | null;  // null = sin datos
  priceMin90d: number | null;
  priceMax90d: number | null;
  priceAvg90d: number | null;
  trendSlope:  number | null;
  // Meta
  historyDays: number;
  recommendation: string;
}

function getLabel(score: number): { label: string; color: BuySignalResult["color"] } {
  if (score >= 80) return { label: "Compra ahora",     color: "green"  };
  if (score >= 65) return { label: "Buen momento",     color: "blue"   };
  if (score >= 45) return { label: "Espera un poco",   color: "yellow" };
  if (score >= 25) return { label: "No es el momento", color: "orange" };
  return                  { label: "Oferta dudosa",    color: "red"    };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function buildRecommendation(r: BuySignalResult & { priceCurrent: number }): string {
  const parts: string[] = [];

  if (r.priceScore !== null && r.priceMin90d !== null && r.priceAvg90d !== null) {
    if (r.priceScore >= 32) {
      parts.push(`El precio actual (${r.priceCurrent.toFixed(0)} €) está cerca del mínimo de los últimos 90 días (${r.priceMin90d.toFixed(0)} €).`);
    } else if (r.priceScore <= 10) {
      parts.push(`El precio está por encima de su media histórica (${r.priceAvg90d.toFixed(0)} €) — podría bajar.`);
    }
  }

  if (r.trendSlope !== null) {
    if (r.trendSlope > 0.4)       parts.push("El precio lleva días subiendo — si lo necesitas, no esperes.");
    else if (r.trendSlope < -0.4) parts.push("El precio está bajando — podrías esperar unos días más.");
  }

  if (r.isFakeDeal) {
    parts.push("⚠️ El descuento puede estar inflado: no encontramos ese precio anterior en nuestro historial.");
  } else if (r.dealScore >= 12) {
    parts.push("El descuento está verificado en nuestro historial de precios.");
  }

  if (parts.length === 0) {
    if (r.historyDays === 0) return "Acabamos de empezar a monitorizar este producto. Vuelve pronto para ver el análisis completo.";
    if (r.score >= 65) return "Es un buen momento para comprar.";
    return "Precio estable. Compara bien antes de decidir.";
  }
  return parts.join(" ");
}

export async function calculateBuySignal(
  productId: string,
  store: string
): Promise<BuySignalResult | null> {
  const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [history, offer, rep] = await Promise.all([
    prisma.priceHistory.findMany({
      where: { productId, store, recordedAt: { gte: since90 } },
      orderBy: { recordedAt: "asc" },
    }),
    prisma.offer.findUnique({ where: { productId_store: { productId, store } } }),
    prisma.storeReputation.findUnique({ where: { store } }),
  ]);

  if (!offer) return null;

  // Filtrar outliers: precios fuera del rango ×0.1 – ×3 del precio actual
  const cur = offer.priceCurrent;
  const cleanHistory = history.filter(h => h.price >= cur * 0.1 && h.price <= cur * 3.0);
  const historyDays  = cleanHistory.length;

  // ── StoreScore (0-20): tiendas conocidas tienen garantía mínima ─────────
  const TRUSTED = ["amazon", "pccomponente", "fnac", "corte"];
  const isTrusted = TRUSTED.some(s => store.toLowerCase().includes(s));
  const storeScore = isTrusted
    ? 17  // tiendas verificadas: fijo 17/20
    : rep
      ? clamp(Math.round(20 * (1 - rep.manipulationRate)), 0, 20)
      : 12;

  // ── DealScore (0-15): escala lineal según % descuento real ──────────────
  // 0% descuento → 4pts  |  10% → 8pts  |  20% → 12pts  |  ≥28% → 15pts
  let dealScore  = 4;   // sin descuento verificado
  let isFakeDeal = false;

  if (offer.priceOld && offer.priceOld > cur) {
    const pct      = (offer.priceOld - cur) / offer.priceOld;   // 0.0 – 0.28 (cap 1.40)
    const rawScore = clamp(Math.round(4 + (pct / 0.28) * 11), 4, 15);

    // Necesitamos ≥20 entradas de historial para fiarnos de que nunca vimos ese precio
    if (historyDays >= 20) {
      const hits = cleanHistory.filter(
        h => Math.abs(h.price - offer.priceOld!) < offer.priceOld! * 0.05
      );
      if (hits.length === 0) {
        isFakeDeal = true;
        dealScore  = clamp(Math.round(rawScore * 0.6), 3, 8);
      } else {
        dealScore = rawScore;
      }
    } else {
      // Historial corto → confiamos en el scraper (ya filtra ratios inflados)
      dealScore = rawScore;
    }
  }

  // ── PriceScore (0-40) y TrendScore (0-25): solo con historial real ───────
  let priceScore:  number | null = null;
  let trendScore:  number | null = null;
  let priceMin90d: number | null = null;
  let priceMax90d: number | null = null;
  let priceAvg90d: number | null = null;
  let trendSlope:  number | null = null;

  if (historyDays >= 3) {
    const prices = cleanHistory.map(h => h.price);
    priceMin90d  = Math.min(...prices);
    priceMax90d  = Math.max(...prices);
    priceAvg90d  = prices.reduce((s, p) => s + p, 0) / prices.length;
    const range  = priceMax90d - priceMin90d;
    const pct    = range > 0.5 ? (cur - priceMin90d) / range : 0.5;
    priceScore   = clamp(Math.round((1 - pct) * 40), 0, 40);
  }

  if (historyDays >= 7) {
    const recent = cleanHistory.slice(-14);
    const n      = recent.length;
    const xMean  = (n - 1) / 2;
    const yMean  = recent.reduce((s, h) => s + h.price, 0) / n;
    let num = 0, den = 0;
    recent.forEach((h, i) => { num += (i - xMean) * (h.price - yMean); den += (i - xMean) ** 2; });
    trendSlope = den !== 0 ? num / den : 0;

    if      (trendSlope >  0.5) trendScore = 25;
    else if (trendSlope >  0.1) trendScore = 18;
    else if (trendSlope >= -0.1) trendScore = 13;
    else if (trendSlope >= -0.5) trendScore = 7;
    else                         trendScore = 3;
  }

  // ── Score total normalizado ───────────────────────────────────────────────
  // Usamos los factores disponibles. Cuando faltan precio/tendencia, la puntuación
  // máxima alcanzable es menor (storeScore+dealScore = 35), así que normalizamos.
  const rawMax = 20 + 15 + (priceScore !== null ? 40 : 0) + (trendScore !== null ? 25 : 0);
  const rawSum = storeScore + dealScore + (priceScore ?? 0) + (trendScore ?? 0);
  const score  = rawMax > 0 ? clamp(Math.round((rawSum / rawMax) * 100), 0, 100) : 50;

  const { label, color } = getLabel(score);

  const result: BuySignalResult = {
    score, label, color,
    storeScore, dealScore, isFakeDeal,
    priceScore, trendScore,
    priceMin90d, priceMax90d, priceAvg90d, trendSlope,
    historyDays,
    recommendation: "",
  };
  result.recommendation = buildRecommendation({ ...result, priceCurrent: cur });

  // Guardar en BD
  await prisma.buySignal.upsert({
    where:  { productId_store: { productId, store } },
    create: { productId, store, ...toDb(result), calculatedAt: new Date() },
    update: { ...toDb(result), calculatedAt: new Date() },
  });

  return result;
}

/** Solo los campos que existen en el modelo Prisma */
function toDb(r: BuySignalResult) {
  return {
    score:       r.score,
    label:       r.label,
    priceScore:  r.priceScore  ?? 0,
    trendScore:  r.trendScore  ?? 0,
    storeScore:  r.storeScore,
    dealScore:   r.dealScore,
    priceMin90d: r.priceMin90d ?? 0,
    priceMax90d: r.priceMax90d ?? 0,
    priceAvg90d: r.priceAvg90d ?? 0,
    trendSlope:  r.trendSlope  ?? 0,
    isFakeDeal:  r.isFakeDeal,
  };
}

export async function getBuySignal(
  productId: string,
  store: string
): Promise<BuySignalResult | null> {
  const cached = await prisma.buySignal.findUnique({
    where: { productId_store: { productId, store } },
  });

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (cached && cached.calculatedAt > oneHourAgo) {
    // Contar historial real para historyDays (no guardado en BD)
    const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const count   = await prisma.priceHistory.count({
      where: { productId, store, recordedAt: { gte: since90 } },
    });

    const { label, color } = getLabel(cached.score);
    const hasHistory = cached.priceMin90d !== cached.priceMax90d || cached.priceMin90d > 0;

    const result: BuySignalResult = {
      score:       cached.score,
      label, color,
      storeScore:  cached.storeScore,
      dealScore:   cached.dealScore,
      isFakeDeal:  cached.isFakeDeal,
      priceScore:  hasHistory ? cached.priceScore : null,
      trendScore:  count >= 7  ? cached.trendScore : null,
      priceMin90d: hasHistory  ? cached.priceMin90d : null,
      priceMax90d: hasHistory  ? cached.priceMax90d : null,
      priceAvg90d: hasHistory  ? cached.priceAvg90d : null,
      trendSlope:  count >= 7  ? cached.trendSlope  : null,
      historyDays: count,
      recommendation: "",
    };

    const offer = await prisma.offer.findUnique({
      where: { productId_store: { productId, store } },
      select: { priceCurrent: true },
    });
    result.recommendation = buildRecommendation({ ...result, priceCurrent: offer?.priceCurrent ?? cached.priceMin90d });
    return result;
  }

  try {
    return await calculateBuySignal(productId, store);
  } catch (err) {
    console.error("[buy-signal] error recalculando, usando caché antiguo:", err);
    if (!cached) return null;
    const { label, color } = getLabel(cached.score);
    return {
      score: cached.score, label, color,
      storeScore: cached.storeScore, dealScore: cached.dealScore, isFakeDeal: cached.isFakeDeal,
      priceScore: null, trendScore: null,
      priceMin90d: null, priceMax90d: null, priceAvg90d: null, trendSlope: null,
      historyDays: 0, recommendation: "No se pudo calcular la señal en este momento.",
    };
  }
}
