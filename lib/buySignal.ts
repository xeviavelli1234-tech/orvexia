import { prisma } from "@/lib/prisma";

export interface BuySignalResult {
  score: number;
  label: string;
  color: "green" | "blue" | "yellow" | "orange" | "red" | "gray";
  priceScore: number;
  trendScore: number;
  storeScore: number;
  dealScore: number;
  priceMin90d: number;
  priceMax90d: number;
  priceAvg90d: number;
  trendSlope: number;
  isFakeDeal: boolean;
  recommendation: string;
}

function getLabel(score: number): { label: string; color: BuySignalResult["color"] } {
  if (score >= 80) return { label: "Compra ahora", color: "green" };
  if (score >= 60) return { label: "Buen momento", color: "blue" };
  if (score >= 40) return { label: "Espera un poco", color: "yellow" };
  if (score >= 20) return { label: "No es el momento", color: "orange" };
  return { label: "Oferta dudosa", color: "red" };
}

function getRecommendation(result: {
  priceScore: number;
  trendScore: number;
  dealScore: number;
  isFakeDeal: boolean;
  trendSlope: number;
  priceMin90d: number;
  priceAvg90d: number;
  score: number;
}): string {
  const parts: string[] = [];

  if (result.priceScore >= 30) {
    parts.push("El precio actual está cerca del mínimo histórico.");
  } else if (result.priceScore <= 10) {
    parts.push("El precio está alto respecto a su histórico.");
  }

  if (result.trendSlope > 0.3) {
    parts.push("El precio lleva días subiendo — si lo necesitas, no esperes.");
  } else if (result.trendSlope < -0.3) {
    parts.push("El precio está bajando — podrías esperar unos días.");
  }

  if (result.isFakeDeal) {
    parts.push("⚠️ El descuento mostrado puede estar inflado: el precio anterior estuvo activo muy poco tiempo.");
  } else if (result.dealScore >= 12) {
    parts.push("El descuento es verificado — el precio anterior estuvo activo más de un mes.");
  }

  if (parts.length === 0) {
    if (result.score >= 60) return "Es un buen momento para comprar este producto.";
    return "Compara bien antes de decidir.";
  }

  return parts.join(" ");
}

export async function calculateBuySignal(
  productId: string,
  store: string
): Promise<BuySignalResult | null> {
  // 1. Historial de precios 90 días
  const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const history = await prisma.priceHistory.findMany({
    where: { productId, store, recordedAt: { gte: since90 } },
    orderBy: { recordedAt: "asc" },
  });

  // 2. Oferta actual
  const offer = await prisma.offer.findUnique({
    where: { productId_store: { productId, store } },
  });

  if (!offer) return null;

  // ── PriceScore (0–40) ───────────────────────────────────────────────────────────
  let priceMin90d = offer.priceCurrent;
  let priceMax90d = offer.priceCurrent;
  let priceAvg90d = offer.priceCurrent;

  if (history.length >= 3) {
    const prices = history.map((h) => h.price);
    priceMin90d = Math.min(...prices);
    priceMax90d = Math.max(...prices);
    priceAvg90d = prices.reduce((s, p) => s + p, 0) / prices.length;
  }

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const range = priceMax90d - priceMin90d;
  const percentile = range > 0
    ? (offer.priceCurrent - priceMin90d) / range
    : 0.5;
  let priceScore = Math.round((1 - percentile) * 40);

  // Si no hay historial suficiente, derive priceScore de priceOld/discount para evitar siempre 59/100
  if (history.length < 3) {
    const rawDiscount = offer.priceOld && offer.priceOld > offer.priceCurrent
      ? (offer.priceOld - offer.priceCurrent) / offer.priceOld
      : 0;

    // 20 base + el descuento ponderado; asegura dispersión 10–38
    priceScore = clamp(Math.round(20 + rawDiscount * 40), 10, 38);
    // Si no hay descuento, mantener un neutro suave
    if (rawDiscount === 0) priceScore = 18;
  }

  // ── TrendScore (0–25) ───────────────────────────────────────────────────────────
  let trendSlope = 0;
  let trendScore = 15; // neutro por defecto

  if (history.length >= 7) {
    const recent = history.slice(-14);
    const n = recent.length;
    const xMean = (n - 1) / 2;
    const yMean = recent.reduce((s, h) => s + h.price, 0) / n;
    let num = 0, den = 0;
    recent.forEach((h, i) => {
      num += (i - xMean) * (h.price - yMean);
      den += (i - xMean) ** 2;
    });
    trendSlope = den !== 0 ? num / den : 0; // €/día

    if (trendSlope > 0.5) trendScore = 25;       // subiendo → compra ya
    else if (trendSlope > 0.1) trendScore = 18;
    else if (trendSlope >= -0.1) trendScore = 15; // estable
    else if (trendSlope >= -0.5) trendScore = 8;
    else trendScore = 5;                           // bajando rápido → espera
  } else {
    // Sin historial suficiente, aproximar con descuento actual
    const rawDiscount = offer.priceOld && offer.priceOld > offer.priceCurrent
      ? (offer.priceOld - offer.priceCurrent) / offer.priceOld
      : 0;
    if (rawDiscount >= 0.35) trendScore = 20;
    else if (rawDiscount >= 0.2) trendScore = 17;
    else if (rawDiscount <= 0) trendScore = 12;
  }

  // ── StoreScore (0–20) ───────────────────────────────────────────────────────────
  let storeScore = 16; // base confiable
  const rep = await prisma.storeReputation.findUnique({ where: { store } });
  if (rep) {
    storeScore = Math.round(20 * (1 - rep.manipulationRate));
  }

  // ── DealScore (0–15) ───────────────────────────────────────────────────────────
  let dealScore = 8;
  let isFakeDeal = false;

  if (offer.priceOld && offer.discountPercent && offer.discountPercent > 0 && history.length >= 7) {
    // Solo verificamos si hay historial suficiente para determinar si el descuento es real
    const oldPriceEntries = history.filter(
      (h) => Math.abs(h.price - (offer.priceOld ?? 0)) < 1
    );
    const daysOldPrice = oldPriceEntries.length; // aprox 1 entry/día

    if (daysOldPrice < 7) {
      isFakeDeal = true;
      dealScore = 0;
      await prisma.storeReputation.upsert({
        where: { store },
        create: { store, manipulationRate: 0.1, fakeDealCount: 1, totalDeals: 1 },
        update: {
          fakeDealCount: { increment: 1 },
          totalDeals: { increment: 1 },
          manipulationRate: rep
            ? (rep.fakeDealCount + 1) / (rep.totalDeals + 1)
            : 0.1,
        },
      });
    } else if (daysOldPrice < 30) {
      dealScore = 8;
      await prisma.storeReputation.upsert({
        where: { store },
        create: { store, manipulationRate: 0, fakeDealCount: 0, totalDeals: 1 },
        update: { totalDeals: { increment: 1 } },
      });
    } else {
      dealScore = 15;
      await prisma.storeReputation.upsert({
        where: { store },
        create: { store, manipulationRate: 0, fakeDealCount: 0, totalDeals: 1 },
        update: { totalDeals: { increment: 1 } },
      });
    }
  }
  // Con poco historial, usa descuento para dar variabilidad y marcar posibles ofertas
  if (history.length < 7 && offer.priceOld && offer.priceOld > offer.priceCurrent) {
    const rawDiscount = (offer.priceOld - offer.priceCurrent) / offer.priceOld;
    dealScore = clamp(Math.round(rawDiscount * 15), 4, 15);
  }
  // Si no hay historial suficiente o no hay priceOld, dealScore queda en 8 (neutro)

  // ── Score final ────────────────────────────────────────────────────────────────
  const score = Math.min(100, priceScore + trendScore + storeScore + dealScore);
  const { label, color } = getLabel(score);

  const partial = { priceScore, trendScore, storeScore, dealScore, isFakeDeal, trendSlope, priceMin90d, priceAvg90d, score };
  const recommendation = getRecommendation(partial);

  const result: BuySignalResult = {
    score,
    label,
    color,
    priceScore,
    trendScore,
    storeScore,
    dealScore,
    priceMin90d,
    priceMax90d,
    priceAvg90d,
    trendSlope,
    isFakeDeal,
    recommendation,
  };

  // Guardar/actualizar en BD (solo campos del modelo, sin color/recommendation)
  const { color: _c, recommendation: _r, ...dbFields } = result;
  await prisma.buySignal.upsert({
    where: { productId_store: { productId, store } },
    create: { productId, store, ...dbFields, calculatedAt: new Date() },
    update: { ...dbFields, calculatedAt: new Date() },
  });

  return result;
}

export async function getBuySignal(
  productId: string,
  store: string
): Promise<BuySignalResult | null> {
  // Devuelve cacheado si es reciente (<1h), sino recalcula
  const cached = await prisma.buySignal.findUnique({
    where: { productId_store: { productId, store } },
  });

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  // Si el cache es reciente pero corresponde al valor neutro 59 (caso sin historial),
  // forzamos recálculo para permitir la nueva lógica basada en descuento.
  if (cached && cached.calculatedAt > oneHourAgo && cached.score !== 59) {
    const { label } = getLabel(cached.score);
    return {
      score: cached.score,
      label,
      color: getLabel(cached.score).color,
      priceScore: cached.priceScore,
      trendScore: cached.trendScore,
      storeScore: cached.storeScore,
      dealScore: cached.dealScore,
      priceMin90d: cached.priceMin90d,
      priceMax90d: cached.priceMax90d,
      priceAvg90d: cached.priceAvg90d,
      trendSlope: cached.trendSlope,
      isFakeDeal: cached.isFakeDeal,
      recommendation: getRecommendation({
        priceScore: cached.priceScore,
        trendScore: cached.trendScore,
        dealScore: cached.dealScore,
        isFakeDeal: cached.isFakeDeal,
        trendSlope: cached.trendSlope,
        priceMin90d: cached.priceMin90d,
        priceAvg90d: cached.priceAvg90d,
        score: cached.score,
      }),
    };
  }

  return calculateBuySignal(productId, store);
}
