/**
 * seed-price-history.ts
 * Genera historial de precios sintético pero realista SOLO para ofertas sin
 * historial. Cualquier oferta con al menos 1 registro real se deja intacta.
 * - 90 días de datos (~1 punto cada 1-2 días)
 * - Patrones variados: bajando, subiendo, estable, con pico, con valle
 * - Si ya hay ≥1 registro para esa oferta, no toca nada (para no sobreescribir datos reales)
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// Semilla determinista basada en productId+store
function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b); h ^= h >>> 16;
    return (h >>> 0) / 0xffffffff;
  };
}

type Pattern =
  | "stable"        // precio estable con pequeño ruido
  | "falling"       // bajando hacia el precio actual (era más caro)
  | "rising"        // subiendo (era más barato, ahora sube)
  | "valley"        // tenía un pico alto, bajó a mínimo, ahora rebotó un poco
  | "peak"          // estaba bajo, subió, volvió a bajar al actual
  | "volatile"      // oscila mucho sin tendencia clara

const PATTERNS: Pattern[] = ["stable", "falling", "rising", "valley", "peak", "volatile"];

function generateHistory(
  cur: number,
  priceOld: number | null,
  days: number,
  rand: () => number
): Array<{ price: number; daysAgo: number }> {
  // Elegir patrón basado en si hay priceOld y su ratio
  let pattern: Pattern;
  const hasDiscount = priceOld !== null && priceOld > cur && priceOld / cur <= 1.40;

  if (hasDiscount) {
    // Si tiene descuento real → mostrar que antes era más caro y bajó
    pattern = rand() > 0.4 ? "falling" : "valley";
  } else {
    // Distribuir patrones aleatoriamente
    const idx = Math.floor(rand() * PATTERNS.length);
    pattern = PATTERNS[idx];
  }

  const points: Array<{ price: number; daysAgo: number }> = [];

  // Generar ~45 puntos en 90 días (cada ~2 días, con algo de variación)
  let dayPointer = days;
  while (dayPointer > 0) {
    const skip = 1 + Math.floor(rand() * 3); // 1-3 días entre registros
    dayPointer -= skip;
    if (dayPointer < 0) break;

    const t = (days - dayPointer) / days; // 0 = inicio, 1 = ahora
    let price = computePrice(cur, priceOld, pattern, t, rand);

    // Ruido pequeño (±1.5%)
    const noise = (rand() - 0.5) * 0.03 * price;
    price = Math.round((price + noise) * 100) / 100;

    // Asegurar que no sea negativo ni absurdo
    price = Math.max(cur * 0.5, Math.min(cur * 2.0, price));

    points.push({ price, daysAgo: dayPointer });
  }

  // Añadir punto de hoy con el precio actual exacto
  points.push({ price: cur, daysAgo: 0 });

  // Si hay priceOld verificado, insertar un punto hace ~60-75 días con ese precio
  if (hasDiscount && priceOld) {
    const daysAgo = 60 + Math.floor(rand() * 15);
    // Eliminar cualquier punto cercano para no crear confusión
    points.push({ price: priceOld, daysAgo });
  }

  return points;
}

function computePrice(
  cur: number,
  priceOld: number | null,
  pattern: Pattern,
  t: number, // 0=inicio 1=final
  rand: () => number
): number {
  const old = priceOld && priceOld / cur <= 1.40 ? priceOld : cur * (1.05 + rand() * 0.15);

  switch (pattern) {
    case "stable":
      // Oscila ±4% alrededor del precio actual
      return cur * (0.97 + rand() * 0.06);

    case "falling":
      // Empieza cerca de priceOld, baja linealmente hasta cur
      return old + (cur - old) * t;

    case "rising":
      // Empieza ~10-20% más barato, sube hasta cur
      return cur * 0.82 + (cur - cur * 0.82) * t;

    case "valley": {
      // Empieza alto → baja a mínimo (t≈0.5) → sube un poco al cur
      const minPrice = cur * (0.88 + rand() * 0.06); // mínimo histórico real
      if (t < 0.5) {
        // Bajando desde old hasta minPrice
        return old + (minPrice - old) * (t / 0.5);
      } else {
        // Subiendo desde minPrice hasta cur
        return minPrice + (cur - minPrice) * ((t - 0.5) / 0.5);
      }
    }

    case "peak": {
      // Empieza en cur → sube (pico) → vuelve a cur
      const peak = cur * (1.08 + rand() * 0.12);
      if (t < 0.4) return cur + (peak - cur) * (t / 0.4);
      if (t < 0.6) return peak;
      return peak + (cur - peak) * ((t - 0.6) / 0.4);
    }

    case "volatile":
      // Oscila entre -12% y +12% con cambios bruscos
      return cur * (0.89 + rand() * 0.22);

    default:
      return cur;
  }
}

async function main() {
  const offers = await prisma.offer.findMany({
    select: { productId: true, store: true, priceCurrent: true, priceOld: true },
  });

  console.log(`📦 ${offers.length} ofertas encontradas\n`);

  let seeded = 0;
  let skipped = 0;

  for (const offer of offers) {
    const { productId, store, priceCurrent, priceOld } = offer;

    // Comprobar historial existente. Si ya hay aunque sea un único registro
    // real, no lo tocamos — preservamos los datos reales aunque sean pocos.
    const existing = await prisma.priceHistory.count({
      where: { productId, store },
    });

    if (existing > 0) {
      skipped++;
      continue;
    }

    const rand = seededRandom(productId + store);
    const points = generateHistory(priceCurrent, priceOld, 90, rand);

    // Crear registros en BD
    const records = points.map(({ price, daysAgo }) => {
      const recordedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      // Añadir horas aleatorias para que no todos sean exactamente a medianoche
      recordedAt.setHours(6 + Math.floor(rand() * 14));
      recordedAt.setMinutes(Math.floor(rand() * 60));
      return { productId, store, price, recordedAt };
    });

    await prisma.priceHistory.createMany({ data: records });

    const prices = points.map(p => p.price);
    const min = Math.min(...prices).toFixed(2);
    const max = Math.max(...prices).toFixed(2);
    console.log(
      `✅ ${store.padEnd(20)} | ${priceCurrent.toFixed(2).padStart(8)} € actual | ` +
      `rango ${min}€ – ${max}€ | ${records.length} puntos`
    );
    seeded++;
  }

  console.log(`\n🎉 Historial generado: ${seeded} ofertas | ${skipped} ya tenían datos suficientes`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
