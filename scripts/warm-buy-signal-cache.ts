/**
 * warm-buy-signal-cache.ts
 * Recalcula las señales de compra directamente en BD, una a una con pausa,
 * sin saturar el pool de conexiones de Neon.
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function getLabel(score: number): { label: string } {
  if (score >= 80) return { label: "Compra ahora" };
  if (score >= 65) return { label: "Buen momento" };
  if (score >= 45) return { label: "Espera un poco" };
  if (score >= 25) return { label: "No es el momento" };
  return               { label: "Oferta dudosa" };
}

async function calcOne(productId: string, store: string) {
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
  const cleanHistory = history.filter(h => h.price >= cur * 0.1 && h.price <= cur * 3.0);
  const historyDays  = cleanHistory.length;

  // StoreScore
  const TRUSTED = ["amazon", "pccomponente", "fnac", "corte"];
  const isTrusted = TRUSTED.some(s => store.toLowerCase().includes(s));
  const storeScore = isTrusted
    ? 17
    : rep
      ? clamp(Math.round(20 * (1 - rep.manipulationRate)), 0, 20)
      : 12;

  // DealScore
  let dealScore  = 4;
  let isFakeDeal = false;

  if (offer.priceOld && offer.priceOld > cur) {
    const pct      = (offer.priceOld - cur) / offer.priceOld;
    const rawScore = clamp(Math.round(4 + (pct / 0.28) * 11), 4, 15);

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
      dealScore = rawScore;
    }
  }

  // PriceScore
  let priceScore: number = 0;
  let trendScore: number = 0;
  let priceMin90d = 0, priceMax90d = 0, priceAvg90d = 0, trendSlope = 0;

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
    recent.forEach((h, i) => {
      num += (i - xMean) * (h.price - yMean);
      den += (i - xMean) ** 2;
    });
    trendSlope = den !== 0 ? num / den : 0;

    if      (trendSlope >  0.5) trendScore = 25;
    else if (trendSlope >  0.1) trendScore = 18;
    else if (trendSlope >= -0.1) trendScore = 13;
    else if (trendSlope >= -0.5) trendScore = 7;
    else                         trendScore = 3;
  }

  const hasPriceData = historyDays >= 3;
  const hasTrendData = historyDays >= 7;
  const rawMax = 20 + 15 + (hasPriceData ? 40 : 0) + (hasTrendData ? 25 : 0);
  const rawSum = storeScore + dealScore + (hasPriceData ? priceScore : 0) + (hasTrendData ? trendScore : 0);
  const score  = rawMax > 0 ? clamp(Math.round((rawSum / rawMax) * 100), 0, 100) : 50;
  const { label } = getLabel(score);

  await prisma.buySignal.upsert({
    where:  { productId_store: { productId, store } },
    create: {
      productId, store, score, label: label,
      priceScore, trendScore, storeScore, dealScore,
      priceMin90d, priceMax90d, priceAvg90d, trendSlope,
      isFakeDeal, calculatedAt: new Date(),
    },
    update: {
      score, label: label,
      priceScore, trendScore, storeScore, dealScore,
      priceMin90d, priceMax90d, priceAvg90d, trendSlope,
      isFakeDeal, calculatedAt: new Date(),
    },
  });

  return { score, priceScore, trendScore, storeScore, dealScore, historyDays, isFakeDeal };
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const offers = await prisma.offer.findMany({
    select: { productId: true, store: true, priceCurrent: true },
  });

  console.log(`🔄 Recalculando ${offers.length} señales de compra...\n`);

  let ok = 0, failed = 0;

  for (const offer of offers) {
    try {
      const r = await calcOne(offer.productId, offer.store);
      if (r) {
        const bar = r.historyDays >= 7 ? "📊" : r.historyDays >= 3 ? "📈" : "📉";
        console.log(
          `${bar} ${offer.store.padEnd(20)} ${offer.priceCurrent.toFixed(2).padStart(8)} € ` +
          `→ score ${String(r.score).padStart(3)} ` +
          `| precio ${r.priceScore}/40 tendencia ${r.trendScore}/25 tienda ${r.storeScore}/20 deal ${r.dealScore}/15` +
          `| ${r.historyDays} días${r.isFakeDeal ? " ⚠️fake" : ""}`
        );
        ok++;
      }
    } catch (err) {
      console.error(`❌ Error en ${offer.store} ${offer.productId}:`, err);
      failed++;
    }
    // Pausa pequeña para no saturar el pool de Neon
    await sleep(80);
  }

  console.log(`\n✅ Recalculadas: ${ok} | ❌ Errores: ${failed}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
