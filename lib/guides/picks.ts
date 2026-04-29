import { prisma } from "@/lib/prisma";
import type { Category } from "@/app/generated/prisma/client";
import { GUIDES } from "@/lib/guides/config";

// ── Tipos ──────────────────────────────────────────────────────────────────
export type Pick = {
  hint: "best" | "value" | "cheap" | "premium";
  product: {
    id: string;
    slug: string;
    name: string;
    brand: string;
    image: string | null;
    rating: number | null;
    reviewCount: number | null;
    bestOffer: {
      store: string;
      priceCurrent: number;
      priceOld: number | null;
      discountPercent: number | null;
      externalUrl: string;
      inStock: boolean;
    };
  };
};

// Defaults ultra-permisivos para categorías sin guía específica
const DEFAULT_MIN = 20;
const DEFAULT_MAX = 8000;

/**
 * Devuelve los 4 ganadores de la categoría según scoring real:
 *  - best     → balance precio + rating + descuento + stock
 *  - value    → rating ≥ 4.0 con menor precio
 *  - cheap    → precio mínimo con stock
 *  - premium  → top 25% precio con rating > 4.3
 *
 * Filtra productos por debajo del precio mínimo razonable de la categoría
 * (definido en GuideConfig) para no recomendar mini-neveras como frigoríficos
 * ni accesorios baratos como producto principal.
 */
export async function getCategoryPicks(category: Category): Promise<Pick[]> {
  const guide = GUIDES.find((g) => g.category === category);
  const minPrice = guide?.minPrice ?? DEFAULT_MIN;
  const maxPrice = guide?.maxPrice ?? DEFAULT_MAX;

  const products = await prisma.product.findMany({
    where: {
      category,
      offers: {
        some: {
          priceCurrent: { gte: minPrice, lte: maxPrice },
          inStock: true,
        },
      },
    },
    include: {
      offers: {
        where: {
          priceCurrent: { gte: minPrice, lte: maxPrice },
          inStock: true,
        },
        orderBy: { priceCurrent: "asc" },
        take: 1,
      },
      reviews: { select: { rating: true } },
    },
  });

  if (products.length === 0) return [];

  // Calcular rating efectivo (mezcla rating del producto y media de reviews)
  const enriched = products
    .filter((p) => p.offers.length > 0)
    .map((p) => {
      const offer = p.offers[0];
      const reviewAvg =
        p.reviews.length > 0
          ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
          : null;
      const rating =
        reviewAvg ?? p.rating ?? 4.0; // Fallback razonable
      return { product: p, offer, rating };
    });

  if (enriched.length === 0) return [];

  // Normalizar precio (0..1)
  const prices = enriched.map((e) => e.offer.priceCurrent);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const priceRange = maxP - minP || 1;

  // Score "best": equilibrio precio-rating-descuento
  const scored = enriched.map((e) => {
    const priceNorm = (e.offer.priceCurrent - minP) / priceRange;       // 0=barato, 1=caro
    const ratingNorm = Math.min(1, Math.max(0, (e.rating - 3) / 2));    // 3.0=0, 5.0=1
    const discountBoost =
      e.offer.priceOld && e.offer.priceOld > e.offer.priceCurrent
        ? Math.min(0.15, ((e.offer.priceOld - e.offer.priceCurrent) / e.offer.priceOld))
        : 0;
    // Penaliza precio (0.35), recompensa rating (0.55), descuento extra (0.15)
    const score = ratingNorm * 0.55 - priceNorm * 0.35 + discountBoost;
    return { ...e, score, priceNorm };
  });

  // Picks
  const used = new Set<string>();
  const picks: Pick[] = [];

  // 1. BEST → mejor score global
  const best = [...scored].sort((a, b) => b.score - a.score)[0];
  if (best) {
    used.add(best.product.id);
    picks.push(serialize("best", best));
  }

  // 2. VALUE → rating >= 4.0 con precio bajo (priceNorm < 0.45) que no sea el best
  const valueCandidates = scored
    .filter((e) => !used.has(e.product.id) && e.rating >= 4.0 && e.priceNorm < 0.55)
    .sort((a, b) => a.offer.priceCurrent - b.offer.priceCurrent);
  const value = valueCandidates[0] ?? scored.filter((e) => !used.has(e.product.id))[0];
  if (value) {
    used.add(value.product.id);
    picks.push(serialize("value", value));
  }

  // 3. CHEAP → precio mínimo entre lo que queda
  const cheapCandidates = scored
    .filter((e) => !used.has(e.product.id))
    .sort((a, b) => a.offer.priceCurrent - b.offer.priceCurrent);
  if (cheapCandidates[0]) {
    used.add(cheapCandidates[0].product.id);
    picks.push(serialize("cheap", cheapCandidates[0]));
  }

  // 4. PREMIUM → top 25% precio con rating > 4.3
  const premiumCutoff = enriched.length >= 4 ? prices.sort((a, b) => b - a)[Math.floor(enriched.length * 0.25)] : minP;
  const premiumCandidates = scored
    .filter((e) => !used.has(e.product.id) && e.rating > 4.3 && e.offer.priceCurrent >= premiumCutoff)
    .sort((a, b) => b.rating - a.rating);
  const premium =
    premiumCandidates[0] ??
    scored
      .filter((e) => !used.has(e.product.id))
      .sort((a, b) => b.offer.priceCurrent - a.offer.priceCurrent)[0];
  if (premium) {
    used.add(premium.product.id);
    picks.push(serialize("premium", premium));
  }

  return picks;
}

function serialize(hint: Pick["hint"], e: { product: any; offer: any; rating: number }): Pick {
  return {
    hint,
    product: {
      id: e.product.id,
      slug: e.product.slug,
      name: e.product.name,
      brand: e.product.brand,
      image: e.product.image,
      rating: Math.round(e.rating * 10) / 10,
      reviewCount: e.product.reviews?.length ?? e.product.reviewCount ?? null,
      bestOffer: {
        store: e.offer.store,
        priceCurrent: e.offer.priceCurrent,
        priceOld: e.offer.priceOld,
        discountPercent: e.offer.discountPercent,
        externalUrl: e.offer.externalUrl,
        inStock: e.offer.inStock,
      },
    },
  };
}
