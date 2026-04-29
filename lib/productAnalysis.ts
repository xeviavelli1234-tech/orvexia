/**
 * Análisis enriquecido para la ficha de producto.
 * Calculado en server con datos de BD; el cliente solo renderiza.
 */
import { prisma } from "@/lib/prisma";
import type { Category } from "@/app/generated/prisma/client";

export type ProductAnalysis = {
  score: number;                       // 0-10
  verdict: { label: string; tone: "great" | "good" | "ok" | "warn" };
  oneLiner: string;                    // Frase resumen
  comparison: {
    priceVsAvg: number | null;         // % respecto a media (-30 = 30% más barato)
    ratingVsAvg: number | null;        // diferencia absoluta (+0.4)
    pricePercentile: number | null;    // 0-100 (0 = el más barato)
  };
  pros: string[];
  cons: string[];
  bestMoment: { isGood: boolean; reason: string } | null;
  highlights: { icon: string; label: string; value: string }[];
};

type ProductInput = {
  id: string;
  name: string;
  brand: string;
  category: Category;
  rating: number | null;
  reviewCount: number | null;
  offers: { priceCurrent: number; priceOld: number | null; discountPercent: number | null; inStock: boolean; store: string }[];
  priceHistory: { price: number; date: string }[];
  reviewsAvg: number | null;
  reviewsTotal: number;
};

type CategoryStats = {
  avgPrice: number | null;
  avgRating: number | null;
  pricesSorted: number[];   // para percentil
};

export async function getCategoryStats(category: Category): Promise<CategoryStats> {
  const offers = await prisma.offer.findMany({
    where: {
      product: { category },
      priceCurrent: { gt: 0 },
      inStock: true,
    },
    select: { priceCurrent: true, product: { select: { rating: true } } },
  });
  if (offers.length === 0) return { avgPrice: null, avgRating: null, pricesSorted: [] };

  const prices = offers.map((o) => o.priceCurrent).sort((a, b) => a - b);
  const avgPrice = prices.reduce((s, p) => s + p, 0) / prices.length;

  const ratings = offers.map((o) => o.product.rating).filter((r): r is number => r !== null && r > 0);
  const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null;

  return { avgPrice, avgRating, pricesSorted: prices };
}

function pricePercentile(price: number, sorted: number[]): number {
  if (sorted.length === 0) return 50;
  const below = sorted.filter((p) => p < price).length;
  return Math.round((below / sorted.length) * 100);
}

export function buildAnalysis(p: ProductInput, stats: CategoryStats): ProductAnalysis {
  // Preferimos la mejor oferta CON stock; si no hay ninguna en stock,
  // caemos al más barato como referencia.
  const offer = p.offers.find((o) => o.inStock) ?? p.offers[0];
  const price = offer?.priceCurrent ?? null;
  const rating = p.reviewsAvg ?? p.rating ?? null;
  const reviewCount = p.reviewsTotal || (p.reviewCount ?? 0);

  // ── Comparativa con la categoría ─────────────────────────────────────────
  const priceVsAvg = price !== null && stats.avgPrice
    ? Math.round(((price - stats.avgPrice) / stats.avgPrice) * 100)
    : null;
  const ratingVsAvg = rating !== null && stats.avgRating
    ? Math.round((rating - stats.avgRating) * 10) / 10
    : null;
  const pricePercentile_ = price !== null ? pricePercentile(price, stats.pricesSorted) : null;

  // ── Score 0-10 ───────────────────────────────────────────────────────────
  let score = 5.0;
  if (rating !== null) score += (rating - 3.5) * 1.4;                     // Rating: ±2.1
  if (priceVsAvg !== null) score -= (priceVsAvg / 100) * 1.5;              // Precio: -10% precio = +0.15
  if (offer?.discountPercent && offer.discountPercent >= 10) score += 0.4; // Descuento real
  if (offer?.inStock) score += 0.3;
  if (reviewCount >= 10) score += 0.3;
  else if (reviewCount === 0) score -= 0.3;
  score = Math.max(0, Math.min(10, score));
  const scoreRounded = Math.round(score * 10) / 10;

  // ── Veredicto ────────────────────────────────────────────────────────────
  let verdict: ProductAnalysis["verdict"];
  if (scoreRounded >= 8.5) verdict = { label: "Excelente compra", tone: "great" };
  else if (scoreRounded >= 7.0) verdict = { label: "Compra recomendada", tone: "good" };
  else if (scoreRounded >= 5.5) verdict = { label: "Compra correcta", tone: "ok" };
  else verdict = { label: "Hay opciones mejores", tone: "warn" };

  // ── One-liner ────────────────────────────────────────────────────────────
  let oneLiner = "";
  if (verdict.tone === "great") {
    oneLiner = `Sobresale en su rango de precio: rating de ${rating?.toFixed(1) ?? "—"}/5${priceVsAvg !== null && priceVsAvg < -5 ? ` y un ${Math.abs(priceVsAvg)}% por debajo de la media` : ""}.`;
  } else if (verdict.tone === "good") {
    oneLiner = `Buena opción para quien busca ${priceVsAvg !== null && priceVsAvg < 0 ? "ahorrar sin renunciar a calidad" : "calidad contrastada"}.`;
  } else if (verdict.tone === "ok") {
    oneLiner = `Cumple lo esperable. Si ajustas presupuesto y te encaja, es válida.`;
  } else {
    oneLiner = `Por sus datos actuales, hay alternativas con mejor balance precio-rating en su categoría.`;
  }

  // ── Pros / Contras desde datos reales ────────────────────────────────────
  const pros: string[] = [];
  const cons: string[] = [];

  if (rating !== null && rating >= 4.5) pros.push(`Valoración media de ${rating.toFixed(1)}/5 entre compradores reales`);
  else if (rating !== null && rating >= 4.0) pros.push(`Buena valoración (${rating.toFixed(1)}/5) en la comunidad`);
  else if (rating !== null && rating < 3.5) cons.push(`Rating por debajo de la media (${rating.toFixed(1)}/5)`);

  if (priceVsAvg !== null && priceVsAvg <= -15) pros.push(`Precio ${Math.abs(priceVsAvg)}% más bajo que la media de su categoría`);
  else if (priceVsAvg !== null && priceVsAvg <= -5) pros.push(`Algo más barato que la media (${Math.abs(priceVsAvg)}%) de productos similares`);
  else if (priceVsAvg !== null && priceVsAvg >= 25) cons.push(`Precio ${priceVsAvg}% por encima de la media de su categoría`);

  if (offer?.discountPercent && offer.discountPercent >= 20) pros.push(`Descuento real de ${offer.discountPercent}% sobre PVP recomendado`);
  else if (offer?.discountPercent && offer.discountPercent >= 10) pros.push(`Rebajado un ${offer.discountPercent}% del precio anterior`);

  if (offer?.inStock) pros.push(`Disponible para envío en ${offer.store}`);
  else cons.push(`Sin stock ahora mismo en ${offer?.store ?? "la tienda"}`);

  if (reviewCount >= 50) pros.push(`Más de ${reviewCount} reseñas analizadas`);
  else if (reviewCount === 0) cons.push("Aún sin reseñas verificadas");

  // Specs adicionales del nombre como pros
  if (/no\s*frost/i.test(p.name)) pros.push("Tecnología No Frost incluida");
  if (/inverter/i.test(p.name)) pros.push("Motor inverter (más silencioso y duradero)");
  if (/clase\s*A\+?\+?\+?/i.test(p.name)) pros.push("Eficiencia energética alta (clase A o superior)");
  if (/wifi|smart/i.test(p.name) && p.category !== "TELEVISORES") pros.push("Conectividad WiFi / control desde móvil");

  // Si no hay contras suficientes, añadir uno honesto
  if (cons.length === 0) cons.push("Stock y precio pueden cambiar en cualquier momento");
  if (cons.length === 1 && verdict.tone !== "great") cons.push("Verifica medidas y consumo antes de decidir");

  // ── ¿Buen momento para comprar? (basado en priceHistory) ────────────────
  let bestMoment: ProductAnalysis["bestMoment"] = null;
  if (price !== null && p.priceHistory.length >= 5) {
    const prices = p.priceHistory.map((h) => h.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const distFromMin = ((price - min) / min) * 100;
    if (distFromMin <= 0) {
      bestMoment = { isGood: true, reason: `Está en el mínimo histórico de los últimos 90 días. Difícil que mejore a corto plazo.` };
    } else if (distFromMin <= 5) {
      bestMoment = { isGood: true, reason: `A un ${distFromMin.toFixed(0)}% del mínimo de los últimos 90 días. Es de los mejores momentos para comprarlo.` };
    } else if (distFromMin <= 12) {
      bestMoment = { isGood: true, reason: `El precio está en zona baja, dentro de un margen razonable respecto al mínimo histórico.` };
    } else if (price >= max * 0.95) {
      bestMoment = { isGood: false, reason: `El precio está cerca del máximo de los últimos 90 días. Si no urge, espera a una bajada.` };
    } else {
      bestMoment = { isGood: false, reason: `Un ${distFromMin.toFixed(0)}% por encima del mínimo reciente. Vigila la evolución unos días.` };
    }
  }

  // ── Highlights (chips destacados arriba) ─────────────────────────────────
  const highlights: ProductAnalysis["highlights"] = [];
  if (priceVsAvg !== null && priceVsAvg <= -10) {
    highlights.push({ icon: "💰", label: "Precio", value: `${Math.abs(priceVsAvg)}% bajo la media` });
  } else if (priceVsAvg !== null && priceVsAvg >= 15) {
    highlights.push({ icon: "💸", label: "Precio", value: `${priceVsAvg}% sobre la media` });
  }
  if (rating !== null && rating >= 4.5) {
    highlights.push({ icon: "⭐", label: "Rating", value: `Top: ${rating.toFixed(1)}/5` });
  } else if (ratingVsAvg !== null && ratingVsAvg >= 0.3) {
    highlights.push({ icon: "⭐", label: "Rating", value: `+${ratingVsAvg} sobre la media` });
  }
  if (offer?.discountPercent && offer.discountPercent >= 15) {
    highlights.push({ icon: "🏷️", label: "Oferta", value: `-${offer.discountPercent}% real` });
  }
  if (pricePercentile_ !== null && pricePercentile_ <= 25) {
    highlights.push({ icon: "🪙", label: "Posición", value: `Entre los más baratos de su categoría` });
  } else if (pricePercentile_ !== null && pricePercentile_ >= 75) {
    highlights.push({ icon: "👑", label: "Posición", value: `Gama alta de su categoría` });
  }
  if (reviewCount >= 30) {
    highlights.push({ icon: "💬", label: "Reseñas", value: `${reviewCount} compradores opinan` });
  }

  return {
    score: scoreRounded,
    verdict,
    oneLiner,
    comparison: { priceVsAvg, ratingVsAvg, pricePercentile: pricePercentile_ },
    pros: pros.slice(0, 5),
    cons: cons.slice(0, 3),
    bestMoment,
    highlights: highlights.slice(0, 4),
  };
}
