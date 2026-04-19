import { prisma } from "@/lib/prisma";

export interface BuySignalResult {
  score: number;
  label: string;
  color: "green" | "blue" | "yellow" | "orange" | "red" | "gray";
  isEstimated: boolean;
  estimatedPrice: boolean;
  estimatedTrend: boolean;
  // Always real factors
  storeScore: number; // 0-20 based on store reputation
  dealScore: number; // 0-15 based on validated priceOld
  isFakeDeal: boolean;
  // Factors that may use history or estimation
  priceScore: number | null; // 0-40
  trendScore: number | null; // 0-25
  priceMin90d: number | null;
  priceMax90d: number | null;
  priceAvg90d: number | null;
  trendSlope: number | null;
  // Meta
  historyDays: number;
  recommendation: string;
}

function getLabel(score: number): { label: string; color: BuySignalResult["color"] } {
  if (score >= 80) return { label: "Compra ahora", color: "green" };
  if (score >= 65) return { label: "Buen momento", color: "blue" };
  if (score >= 45) return { label: "Espera un poco", color: "yellow" };
  if (score >= 25) return { label: "No es el momento", color: "orange" };
  return { label: "Oferta dudosa", color: "red" };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function scoreFromTrendSlope(slope: number): number {
  if (slope > 0.5) return 25;
  if (slope > 0.1) return 18;
  if (slope >= -0.1) return 13;
  if (slope >= -0.5) return 7;
  return 3;
}

function buildRecommendation(r: BuySignalResult & { priceCurrent: number }): string {
  const parts: string[] = [];

  if (r.priceScore !== null && r.priceMin90d !== null && r.priceAvg90d !== null) {
    if (r.priceScore >= 32) {
      parts.push(
        `El precio actual (${r.priceCurrent.toFixed(0)} EUR) esta cerca del minimo de los ultimos 90 dias (${r.priceMin90d.toFixed(0)} EUR).`
      );
    } else if (r.priceScore <= 10) {
      parts.push(`El precio esta por encima de su media historica (${r.priceAvg90d.toFixed(0)} EUR) y podria bajar.`);
    }
  }

  if (r.trendSlope !== null) {
    if (r.trendSlope > 0.4) parts.push("El precio lleva dias subiendo y podria rebotar pronto.");
    else if (r.trendSlope < -0.4) parts.push("El precio esta bajando y podria mejorar en unos dias.");
  }

  if (r.isFakeDeal) {
    parts.push("Atencion: el descuento podria estar inflado, no vimos ese precio anterior en el historial.");
  } else if (r.dealScore >= 12) {
    parts.push("El descuento esta bien respaldado por la informacion disponible.");
  }

  if (parts.length === 0) {
    if (r.score >= 65) return r.isEstimated ? "Estimacion orientativa: buen momento para comprar." : "Es un buen momento para comprar.";
    return r.isEstimated
      ? "Estimacion orientativa: precio estable, compara antes de decidir."
      : "Precio estable. Compara bien antes de decidir.";
  }

  const base = parts.join(" ");
  return r.isEstimated ? `Estimacion orientativa: ${base}` : base;
}

function estimatePriceWindow(currentPrice: number, discountPct: number, historyDays: number) {
  const bandPct = historyDays === 0 ? 0.12 : historyDays === 1 ? 0.1 : 0.08;
  const bandAbs = Math.max(currentPrice * bandPct, 8);
  const minBias = discountPct >= 0.1 ? 0.6 : 0.45;

  const min = Math.max(1, currentPrice - bandAbs * minBias);
  const max = currentPrice + bandAbs * (1 - minBias + 0.55);
  const avg = (min + max) / 2;
  const range = Math.max(0.5, max - min);
  const pct = (currentPrice - min) / range;
  const score = clamp(Math.round((1 - pct) * 40), 12, 30);

  return { min, max, avg, score };
}

export async function calculateBuySignal(productId: string, store: string): Promise<BuySignalResult | null> {
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

  const cur = offer.priceCurrent;
  const cleanHistory = history.filter((h) => h.price >= cur * 0.1 && h.price <= cur * 3.0);
  const historyDays = cleanHistory.length;

  const TRUSTED = ["amazon", "pccomponente", "fnac", "corte"];
  const isTrusted = TRUSTED.some((s) => store.toLowerCase().includes(s));
  const storeScore = isTrusted ? 17 : rep ? clamp(Math.round(20 * (1 - rep.manipulationRate)), 0, 20) : 12;

  let dealScore = 4;
  let isFakeDeal = false;
  const discountPct = offer.priceOld && offer.priceOld > cur ? (offer.priceOld - cur) / offer.priceOld : 0;

  if (offer.priceOld && offer.priceOld > cur) {
    const rawScore = clamp(Math.round(4 + (discountPct / 0.28) * 11), 4, 15);

    if (historyDays >= 20) {
      const hits = cleanHistory.filter((h) => Math.abs(h.price - offer.priceOld!) < offer.priceOld! * 0.05);
      if (hits.length === 0) {
        isFakeDeal = true;
        dealScore = clamp(Math.round(rawScore * 0.6), 3, 8);
      } else {
        dealScore = rawScore;
      }
    } else {
      dealScore = rawScore;
    }
  }

  let priceScore: number | null = null;
  let trendScore: number | null = null;
  let priceMin90d: number | null = null;
  let priceMax90d: number | null = null;
  let priceAvg90d: number | null = null;
  let trendSlope: number | null = null;

  let estimatedPrice = false;
  let estimatedTrend = false;

  if (historyDays >= 3) {
    const prices = cleanHistory.map((h) => h.price);
    priceMin90d = Math.min(...prices);
    priceMax90d = Math.max(...prices);
    priceAvg90d = prices.reduce((s, p) => s + p, 0) / prices.length;
    const range = priceMax90d - priceMin90d;
    const pct = range > 0.5 ? (cur - priceMin90d) / range : 0.5;
    priceScore = clamp(Math.round((1 - pct) * 40), 0, 40);
  } else {
    const est = estimatePriceWindow(cur, discountPct, historyDays);
    priceMin90d = est.min;
    priceMax90d = est.max;
    priceAvg90d = est.avg;
    priceScore = est.score;
    estimatedPrice = true;
  }

  if (historyDays >= 7) {
    const recent = cleanHistory.slice(-14);
    const n = recent.length;
    const xMean = (n - 1) / 2;
    const yMean = recent.reduce((s, h) => s + h.price, 0) / n;
    let num = 0;
    let den = 0;
    recent.forEach((h, i) => {
      num += (i - xMean) * (h.price - yMean);
      den += (i - xMean) ** 2;
    });
    trendSlope = den !== 0 ? num / den : 0;
    trendScore = scoreFromTrendSlope(trendSlope);
  } else if (historyDays >= 3) {
    const recent = cleanHistory.slice(-Math.min(8, cleanHistory.length));
    const n = recent.length;
    const xMean = (n - 1) / 2;
    const yMean = recent.reduce((s, h) => s + h.price, 0) / n;
    let num = 0;
    let den = 0;
    recent.forEach((h, i) => {
      num += (i - xMean) * (h.price - yMean);
      den += (i - xMean) ** 2;
    });
    const rawSlope = den !== 0 ? num / den : 0;
    trendSlope = rawSlope * 0.35;
    trendScore = scoreFromTrendSlope(trendSlope);
    estimatedTrend = true;
  } else {
    trendSlope = discountPct >= 0.12 ? 0.12 : 0;
    trendScore = scoreFromTrendSlope(trendSlope);
    estimatedTrend = true;
  }

  const rawMax = 20 + 15 + (priceScore !== null ? 40 : 0) + (trendScore !== null ? 25 : 0);
  const rawSum = storeScore + dealScore + (priceScore ?? 0) + (trendScore ?? 0);
  const score = rawMax > 0 ? clamp(Math.round((rawSum / rawMax) * 100), 0, 100) : 50;

  const { label, color } = getLabel(score);

  const result: BuySignalResult = {
    score,
    label,
    color,
    isEstimated: estimatedPrice || estimatedTrend,
    estimatedPrice,
    estimatedTrend,
    storeScore,
    dealScore,
    isFakeDeal,
    priceScore,
    trendScore,
    priceMin90d,
    priceMax90d,
    priceAvg90d,
    trendSlope,
    historyDays,
    recommendation: "",
  };

  result.recommendation = buildRecommendation({ ...result, priceCurrent: cur });

  await prisma.buySignal.upsert({
    where: { productId_store: { productId, store } },
    create: { productId, store, ...toDb(result), calculatedAt: new Date() },
    update: { ...toDb(result), calculatedAt: new Date() },
  });

  return result;
}

function toDb(r: BuySignalResult) {
  return {
    score: r.score,
    label: r.label,
    priceScore: r.priceScore ?? 0,
    trendScore: r.trendScore ?? 0,
    storeScore: r.storeScore,
    dealScore: r.dealScore,
    priceMin90d: r.priceMin90d ?? 0,
    priceMax90d: r.priceMax90d ?? 0,
    priceAvg90d: r.priceAvg90d ?? 0,
    trendSlope: r.trendSlope ?? 0,
    isFakeDeal: r.isFakeDeal,
  };
}

export async function getBuySignal(productId: string, store: string): Promise<BuySignalResult | null> {
  const cached = await prisma.buySignal.findUnique({
    where: { productId_store: { productId, store } },
  });

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (cached && cached.calculatedAt > oneHourAgo) {
    const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const count = await prisma.priceHistory.count({
      where: { productId, store, recordedAt: { gte: since90 } },
    });

    const { label, color } = getLabel(cached.score);
    const hasPriceData = cached.priceMin90d !== cached.priceMax90d || cached.priceMin90d > 0;
    const estimatedPrice = count < 3 && cached.priceScore > 0 && hasPriceData;
    const estimatedTrend = count < 7 && cached.trendScore > 0;

    const result: BuySignalResult = {
      score: cached.score,
      label,
      color,
      isEstimated: estimatedPrice || estimatedTrend,
      estimatedPrice,
      estimatedTrend,
      storeScore: cached.storeScore,
      dealScore: cached.dealScore,
      isFakeDeal: cached.isFakeDeal,
      priceScore: count >= 3 || estimatedPrice ? cached.priceScore : null,
      trendScore: count >= 7 || estimatedTrend ? cached.trendScore : null,
      priceMin90d: count >= 3 || estimatedPrice ? cached.priceMin90d : null,
      priceMax90d: count >= 3 || estimatedPrice ? cached.priceMax90d : null,
      priceAvg90d: count >= 3 || estimatedPrice ? cached.priceAvg90d : null,
      trendSlope: count >= 7 || estimatedTrend ? cached.trendSlope : null,
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
    console.error("[buy-signal] error recalculando, usando cache antiguo:", err);
    if (!cached) return null;
    const { label, color } = getLabel(cached.score);
    return {
      score: cached.score,
      label,
      color,
      isEstimated: false,
      estimatedPrice: false,
      estimatedTrend: false,
      storeScore: cached.storeScore,
      dealScore: cached.dealScore,
      isFakeDeal: cached.isFakeDeal,
      priceScore: null,
      trendScore: null,
      priceMin90d: null,
      priceMax90d: null,
      priceAvg90d: null,
      trendSlope: null,
      historyDays: 0,
      recommendation: "No se pudo calcular la senal en este momento.",
    };
  }
}
