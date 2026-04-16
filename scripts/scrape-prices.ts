/**
 * scrape-prices.ts
 * Actualiza precios y stock de todas las ofertas en la BD.
 * Soporta: Amazon, PcComponentes, MediaMarkt, El Corte Inglés.
 *
 * Uso:
 *   npx tsx scripts/scrape-prices.ts           ← todas las ofertas
 *   npx tsx scripts/scrape-prices.ts amazon    ← solo Amazon
 *   npx tsx scripts/scrape-prices.ts --dry-run ← muestra cambios sin guardar
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.argv.includes("--dry-run");
const STORE_FILTER = process.argv.slice(2).find(a => !a.startsWith("--"))?.toLowerCase();

// ── Cabeceras realistas para evitar bloqueos ─────────────────────────────────
const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "es-ES,es;q=0.9",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Resuelve una URL corta (amzn.to, etc.) a la URL final */
async function resolveRedirect(url: string): Promise<string> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", headers: HEADERS, signal: AbortSignal.timeout(8000) });
    return res.url || url;
  } catch {
    return url;
  }
}

// ── Parsers por tienda ────────────────────────────────────────────────────────

interface ScrapedData {
  price: number | null;
  inStock: boolean;
}

async function scrapeAmazon(url: string): Promise<ScrapedData> {
  // Resolver redirect (amzn.to → amazon.es/dp/XXXX)
  const finalUrl = url.includes("amzn.to") ? await resolveRedirect(url) : url;

  const res = await fetch(finalUrl, { headers: HEADERS, signal: AbortSignal.timeout(12000) });
  const html = await res.text();

  // ── Detección de bloqueo / CAPTCHA ──────────────────────────────────────
  const isBlocked =
    /robot check|captcha|automated access|api-services-support@amazon|enter the characters you see/i.test(html) ||
    (html.length < 5000 && !html.includes("productTitle") && !html.includes("a-price"));

  if (isBlocked) {
    throw new Error("Amazon bloqueó la petición (CAPTCHA / robot check)");
  }

  // ── Precio ──────────────────────────────────────────────────────────────
  const pricePatterns = [
    /"priceAmount"\s*:\s*([\d]+\.[\d]{2})/,
    /"price"\s*:\s*"([\d]+\.[\d]{2})"/,
    /id="priceblock_dealprice"[^>]*>\s*[\d.,]+\s*([\d.,]+)\s*€/,
    /id="priceblock_ourprice"[^>]*>\s*([\d.,]+)\s*€/,
    /class="a-price-whole"[^>]*>([\d.]+)<.*?class="a-price-fraction"[^>]*>([\d]+)/,
    /"buyingPrice"\s*:\s*([\d.]+)/,
    /corePriceDisplay[\s\S]*?"displayPrice"\s*:\s*"([\d,.]+)\s*€"/,
  ];

  let price: number | null = null;
  for (const pattern of pricePatterns) {
    const match = html.match(pattern);
    if (match) {
      const raw = match[2]
        ? `${match[1]}.${match[2]}`
        : match[1].replace(/\./g, "").replace(",", ".");
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
        price = parsed;
        break;
      }
    }
  }

  // ── Stock ────────────────────────────────────────────────────────────────
  // Señales negativas (sin stock)
  const outOfStockSignals = [
    /id="outOfStock"/i,
    /class="[^"]*a-color-price[^"]*"[^>]*>[\s\S]{0,60}No disponible/i,
    /"availability"\s*:\s*"OutOfStock"/i,
    /actualmente no disponible/i,
    /temporalmente sin stock/i,
    /Este producto no está disponible/i,
    /no se puede entregar/i,
  ];

  // Señales positivas (en stock)
  const inStockSignals = [
    /añadir al carrito/i,
    /add to cart/i,
    /"availability"\s*:\s*"InStock"/i,
    /id="add-to-cart-button"/i,
    /En stock/i,
    /Disponible/i,
  ];

  const hasOutOfStock = outOfStockSignals.some((p) => p.test(html));
  const hasInStock    = inStockSignals.some((p) => p.test(html));

  // Si hay señal negativa → sin stock
  // Si hay señal positiva (y no negativa) → en stock
  // Si no hay ninguna señal (página rara pero no bloqueada) → conservador: sin stock
  let inStock: boolean;
  if (hasOutOfStock) {
    inStock = false;
  } else if (hasInStock) {
    inStock = true;
  } else {
    // No encontramos señales claras — si tampoco tenemos precio, asumimos sin stock
    inStock = price !== null;
  }

  return { price, inStock };
}

async function scrapePcComponentes(url: string): Promise<ScrapedData> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12000) });
  const html = await res.text();

  // PcC expone precios en JSON-LD y en atributos data-
  const patterns = [
    /"price"\s*:\s*"?([\d]+\.[\d]{2})"?/,
    /data-product-price="([\d.,]+)"/,
    /"priceValue"\s*:\s*([\d.]+)/,
    /itemprop="price"[^>]*content="([\d.]+)"/,
  ];

  let price: number | null = null;
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      const v = parseFloat(m[1].replace(",", "."));
      if (!isNaN(v) && v > 0) { price = v; break; }
    }
  }

  const inStock = !/sin stock|agotado|no disponible/i.test(html)
    && (/"availability"\s*:\s*"InStock"/i.test(html) || /Añadir al carrito/i.test(html));

  return { price, inStock };
}

async function scrapeMediaMarkt(url: string): Promise<ScrapedData> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12000) });
  const html = await res.text();

  const patterns = [
    /"price"\s*:\s*([\d]+\.[\d]{2})/,
    /itemprop="price"[^>]*content="([\d.]+)"/,
    /"finalPrice"\s*:\s*([\d.]+)/,
  ];

  let price: number | null = null;
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      const v = parseFloat(m[1]);
      if (!isNaN(v) && v > 0) { price = v; break; }
    }
  }

  const inStock = !/agotado|sin stock|no disponible/i.test(html);
  return { price, inStock };
}

async function scrapeElCorteIngles(url: string): Promise<ScrapedData> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12000) });
  const html = await res.text();

  const patterns = [
    /"price"\s*:\s*"?([\d]+\.[\d]{2})"?/,
    /itemprop="price"[^>]*content="([\d.]+)"/,
    /"sellingPrice"\s*:\s*([\d.]+)/,
  ];

  let price: number | null = null;
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      const v = parseFloat(m[1]);
      if (!isNaN(v) && v > 0) { price = v; break; }
    }
  }

  const inStock = /añadir al carrito|comprar/i.test(html)
    && !/agotado|sin existencias/i.test(html);
  return { price, inStock };
}

async function scrapeOffer(store: string, url: string): Promise<ScrapedData> {
  const s = store.toLowerCase();
  if (s.includes("amazon"))          return scrapeAmazon(url);
  if (s.includes("pccomponente"))    return scrapePcComponentes(url);
  if (s.includes("mediamarkt"))      return scrapeMediaMarkt(url);
  if (s.includes("corte inglés") || s.includes("eci")) return scrapeElCorteIngles(url);
  // Fallback genérico — JSON-LD
  return scrapeAmazon(url);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🔍 Iniciando scraper${DRY_RUN ? " (dry-run)" : ""}${STORE_FILTER ? ` · tienda: ${STORE_FILTER}` : ""}\n`);

  const offers = await prisma.offer.findMany({
    include: { product: { select: { name: true } } },
    ...(STORE_FILTER ? { where: { store: { contains: STORE_FILTER, mode: "insensitive" } } } : {}),
  });

  console.log(`📦 ${offers.length} ofertas a procesar\n`);

  let updated = 0, unchanged = 0, failed = 0;

  for (const offer of offers) {
    const label = `${offer.product.name.substring(0, 40)} [${offer.store}]`;
    try {
      const data = await scrapeOffer(offer.store, offer.externalUrl);

      const priceChanged = data.price !== null && data.price !== offer.priceCurrent;
      const stockChanged = data.inStock !== offer.inStock;

      if (!priceChanged && !stockChanged) {
        console.log(`  ✅ Sin cambios  — ${label}`);
        unchanged++;
        await sleep(800 + Math.random() * 400);
        continue;
      }

      const newPrice = data.price ?? offer.priceCurrent;
      const changes: string[] = [];
      if (priceChanged) changes.push(`precio ${offer.priceCurrent.toFixed(2)} € → ${newPrice.toFixed(2)} €`);
      if (stockChanged) changes.push(`stock ${offer.inStock ? "✅" : "❌"} → ${data.inStock ? "✅" : "❌"}`);
      console.log(`  📈 Cambio       — ${label}: ${changes.join(" | ")}`);

      if (!DRY_RUN) {
        // Actualizar oferta
        await prisma.offer.update({
          where: { id: offer.id },
          data: {
            priceCurrent: newPrice,
            inStock: data.inStock,
          },
        });

        // Registrar en PriceHistory si el precio cambió
        if (priceChanged) {
          await prisma.priceHistory.create({
            data: { productId: offer.productId, store: offer.store, price: newPrice },
          });
        }
      }

      updated++;
    } catch (e) {
      console.log(`  ❌ Error        — ${label}: ${e instanceof Error ? e.message : e}`);
      failed++;
    }

    // Pausa aleatoria para no ser detectados como bot (1.2 – 2.5 s)
    await sleep(1200 + Math.random() * 1300);
  }

  console.log(`\n🎉 Completado: ${updated} actualizados · ${unchanged} sin cambios · ${failed} errores`);
  if (DRY_RUN) console.log("ℹ️  Modo dry-run: ningún cambio fue guardado en la BD");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
