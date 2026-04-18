/**
 * scrape-prices.ts
 * Actualiza precios, precio antiguo real y stock de todas las ofertas en la BD.
 * Soporta: Amazon, PcComponentes, Fnac, El Corte Inglés.
 *
 * Uso:
 *   npx tsx scripts/scrape-prices.ts           ← todas las ofertas
 *   npx tsx scripts/scrape-prices.ts amazon    ← solo Amazon
 *   npx tsx scripts/scrape-prices.ts --dry-run ← muestra cambios sin guardar
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DRY_RUN    = process.argv.includes("--dry-run");
const STORE_FILTER = process.argv.slice(2).find(a => !a.startsWith("--"))?.toLowerCase();

// Máximo ratio priceOld/priceCurrent para considerarlo un descuento real
// (> 1.40 = Amazon PVPR inflado, no es una rebaja real)
const MAX_DISCOUNT_RATIO = 1.40;

// ── Cabeceras realistas ───────────────────────────────────────────────────────
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

async function resolveRedirect(url: string): Promise<string> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", headers: HEADERS, signal: AbortSignal.timeout(8000) });
    return res.url || url;
  } catch {
    return url;
  }
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ScrapedData {
  price:    number | null;
  priceOld: number | null;  // precio tachado real de la tienda (null si no existe)
  inStock:  boolean;
}

// ── Helper: parsear un string de precio ──────────────────────────────────────
function parsePrice(raw: string): number | null {
  let normalized: string;
  // JSON decimal format ("483.00", "379.99") — dot is the decimal separator
  if (/^\d+\.\d{1,2}$/.test(raw.trim())) {
    normalized = raw.trim();
  } else {
    // European HTML format ("4.099,00" or "4.099") — dot is thousands separator
    normalized = raw.replace(/\./g, "").replace(",", ".");
  }
  const v = parseFloat(normalized);
  return !isNaN(v) && v > 0 && v < 100_000 ? v : null;
}

/**
 * Valida y limpia el priceOld:
 * - Debe ser mayor que priceCurrent
 * - Ratio ≤ MAX_DISCOUNT_RATIO para que sea creíble
 * - Si no cumple → null
 */
function sanitizePriceOld(priceCurrent: number, priceOld: number | null): number | null {
  if (!priceOld || priceOld <= priceCurrent) return null;
  const ratio = priceOld / priceCurrent;
  return ratio <= MAX_DISCOUNT_RATIO ? priceOld : null;
}

// ── Amazon ────────────────────────────────────────────────────────────────────

async function scrapeAmazon(url: string): Promise<ScrapedData> {
  const finalUrl = url.includes("amzn.to") ? await resolveRedirect(url) : url;
  const res  = await fetch(finalUrl, { headers: HEADERS, signal: AbortSignal.timeout(12000) });
  const html = await res.text();

  // Bloqueo / CAPTCHA
  const isBlocked =
    /robot check|captcha|automated access|api-services-support@amazon|enter the characters you see/i.test(html) ||
    (html.length < 5000 && !html.includes("productTitle") && !html.includes("a-price"));
  if (isBlocked) throw new Error("Amazon bloqueó la petición (CAPTCHA / robot check)");

  // ── Precio actual ────────────────────────────────────────────────────────
  const pricePatterns = [
    /"priceAmount"\s*:\s*([\d]+\.[\d]{2})/,
    /"price"\s*:\s*"([\d]+\.[\d]{2})"/,
    /id="priceblock_dealprice"[^>]*>\s*[\d.,]+\s*([\d.,]+)\s*€/,
    /id="priceblock_ourprice"[^>]*>\s*([\d.,]+)\s*€/,
    /class="a-price-whole"[^>]*>([\d.]+)<.*?class="a-price-fraction"[^>]*>([\d]+)/,
    /"buyingPrice"\s*:\s*([\d.]+)/,
    /corePriceDisplay[\s\S]{0,300}"displayPrice"\s*:\s*"([\d,.]+)\s*€"/,
  ];

  let price: number | null = null;
  for (const pattern of pricePatterns) {
    const m = html.match(pattern);
    if (m) {
      const raw = m[2] ? `${m[1]}.${m[2]}` : m[1];
      const v = parsePrice(raw);
      if (v) { price = v; break; }
    }
  }

  // ── Precio tachado (priceOld real de Amazon) ─────────────────────────────
  // Amazon expone el "was price" en varias formas: JSON embebido y HTML tachado.
  const oldPricePatterns = [
    // JSON estructurado (más fiable)
    /"basisPrice"\s*:\s*\{[^}]*"amount"\s*:\s*([\d.]+)/,
    /"wasPrice"\s*:\s*\{[^}]*"amount"\s*:\s*([\d.]+)/,
    /"listPrice"\s*:\s*\{[^}]*"amount"\s*:\s*([\d.]+)/,
    /"strikethroughPrice"\s*:\s*\{[^}]*"amount"\s*:\s*([\d.]+)/,
    // JSON simple
    /"basisPrice"\s*:\s*"([\d,.]+)\s*€"/,
    /"wasPrice"\s*:\s*"([\d,.]+)\s*€"/,
    // HTML tachado
    /data-a-strike="true"[^>]*>[\s\S]{0,100}>([\d.,]+)\s*€/,
    /class="[^"]*a-text-price[^"]*"[^>]*data-a-strike="true"[\s\S]{0,200}>([\d.,]+)\s*€/,
    /id="priceblock_saleprice_label"[\s\S]{0,400}>([\d.,]+)\s*€/,
    // corePriceDisplay basis
    /corePriceDisplay[\s\S]{0,1000}"basisPrice"[\s\S]{0,200}"displayPrice"\s*:\s*"([\d,.]+)\s*€"/,
  ];

  let priceOldRaw: number | null = null;
  for (const pattern of oldPricePatterns) {
    const m = html.match(pattern);
    if (m) {
      const v = parsePrice(m[1]);
      if (v) { priceOldRaw = v; break; }
    }
  }

  // ── Stock ────────────────────────────────────────────────────────────────
  const outOfStockSignals = [
    /id="outOfStock"/i,
    /"availability"\s*:\s*"OutOfStock"/i,
    /actualmente no disponible/i,
    /temporalmente sin stock/i,
    /Este producto no está disponible/i,
  ];
  const inStockSignals = [
    /añadir al carrito/i,
    /añadir a la cesta/i,
    /add to cart/i,
    /"availability"\s*:\s*"InStock"/i,
    /id="add-to-cart-button"/i,
    /id="buy-now-button"/i,
  ];

  const hasOutOfStock = outOfStockSignals.some(p => p.test(html));
  const hasInStock    = inStockSignals.some(p => p.test(html));
  const inStock = hasOutOfStock && !hasInStock ? false : true;

  const priceOld = price ? sanitizePriceOld(price, priceOldRaw) : null;
  return { price, priceOld, inStock };
}

// ── PcComponentes ─────────────────────────────────────────────────────────────

async function scrapePcComponentes(url: string): Promise<ScrapedData> {
  const res  = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12000) });
  const html = await res.text();

  const pricePatterns = [
    /"price"\s*:\s*"?([\d]+\.[\d]{2})"?/,
    /data-product-price="([\d.,]+)"/,
    /"priceValue"\s*:\s*([\d.]+)/,
    /itemprop="price"[^>]*content="([\d.]+)"/,
  ];

  let price: number | null = null;
  for (const p of pricePatterns) {
    const m = html.match(p);
    if (m) { const v = parsePrice(m[1]); if (v) { price = v; break; } }
  }

  // Precio tachado PcC: data-product-old-price o <del class="price-old">
  const oldPatterns = [
    /data-product-old-price="([\d.,]+)"/,
    /<del[^>]*class="[^"]*price-old[^"]*"[^>]*>([\d.,]+)/,
    /"oldPrice"\s*:\s*"?([\d.]+)"?/,
  ];

  let priceOldRaw: number | null = null;
  for (const p of oldPatterns) {
    const m = html.match(p);
    if (m) { const v = parsePrice(m[1]); if (v) { priceOldRaw = v; break; } }
  }

  // JSON-LD (schema.org) is most reliable — check it first
  const ldAvailPcc = html.match(/"availability"\s*:\s*"([^"]{3,80})"/)?.[1] ?? "";
  const inStock = ldAvailPcc
    ? /instock/i.test(ldAvailPcc)
    : /Añadir al carrito/i.test(html) && !/"(?:stock|availability)"\s*:\s*"(?:OutOfStock|sin stock|agotado)/i.test(html);

  const priceOld = price ? sanitizePriceOld(price, priceOldRaw) : null;
  return { price, priceOld, inStock };
}

// ── Fnac ──────────────────────────────────────────────────────────────────────

async function scrapeFnac(url: string): Promise<ScrapedData> {
  const res  = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12000) });
  const html = await res.text();

  const pricePatterns = [
    /itemprop="price"[^>]*content="([\d.]+)"/,
    /"price"\s*:\s*"?([\d]+\.[\d]{2})"?/,
    /class="[^"]*f-priceBox-price[^"]*"[^>]*>([\d.,]+)/,
  ];

  let price: number | null = null;
  for (const p of pricePatterns) {
    const m = html.match(p);
    if (m) { const v = parsePrice(m[1]); if (v) { price = v; break; } }
  }

  const oldPatterns = [
    /class="[^"]*f-priceBox-oldPrice[^"]*"[^>]*>([\d.,]+)/,
    /"oldPrice"\s*:\s*"?([\d.]+)"?/,
  ];

  let priceOldRaw: number | null = null;
  for (const p of oldPatterns) {
    const m = html.match(p);
    if (m) { const v = parsePrice(m[1]); if (v) { priceOldRaw = v; break; } }
  }

  const ldAvailFnac = html.match(/"availability"\s*:\s*"([^"]{3,80})"/)?.[1] ?? "";
  const inStock = ldAvailFnac
    ? /instock/i.test(ldAvailFnac)
    : /añadir al carrito|comprar ahora/i.test(html) && !/class="[^"]*(?:out-of-stock|sin-stock|agotado)[^"]*"/i.test(html);

  const priceOld = price ? sanitizePriceOld(price, priceOldRaw) : null;
  return { price, priceOld, inStock };
}

// ── El Corte Inglés ───────────────────────────────────────────────────────────

async function scrapeElCorteIngles(url: string): Promise<ScrapedData> {
  const res  = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12000) });
  const html = await res.text();

  const pricePatterns = [
    /"price"\s*:\s*"?([\d]+\.[\d]{2})"?/,
    /itemprop="price"[^>]*content="([\d.]+)"/,
    /"sellingPrice"\s*:\s*([\d.]+)/,
  ];

  let price: number | null = null;
  for (const p of pricePatterns) {
    const m = html.match(p);
    if (m) { const v = parsePrice(m[1]); if (v) { price = v; break; } }
  }

  const oldPatterns = [
    /"originalPrice"\s*:\s*([\d.]+)/,
    /"listPrice"\s*:\s*([\d.]+)/,
    /class="[^"]*original-price[^"]*"[^>]*>([\d.,]+)/,
  ];

  let priceOldRaw: number | null = null;
  for (const p of oldPatterns) {
    const m = html.match(p);
    if (m) { const v = parsePrice(m[1]); if (v) { priceOldRaw = v; break; } }
  }

  const ldAvailEci = html.match(/"availability"\s*:\s*"([^"]{3,80})"/)?.[1] ?? "";
  const inStock = ldAvailEci
    ? /instock/i.test(ldAvailEci)
    : /añadir al carrito|comprar/i.test(html) && !/class="[^"]*(?:out-of-stock|sin-stock|agotado)[^"]*"/i.test(html);

  const priceOld = price ? sanitizePriceOld(price, priceOldRaw) : null;
  return { price, priceOld, inStock };
}

// ── Router ────────────────────────────────────────────────────────────────────

async function scrapeOffer(store: string, url: string): Promise<ScrapedData> {
  const s = store.toLowerCase();
  if (s.includes("amazon"))           return scrapeAmazon(url);
  if (s.includes("pccomponente"))     return scrapePcComponentes(url);
  if (s.includes("fnac"))             return scrapeFnac(url);
  if (s.includes("corte") || s.includes("eci")) return scrapeElCorteIngles(url);
  return scrapeAmazon(url); // fallback
}

// ── Main ──────────────────────────────────────────────────────────────────────

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

      const newPrice    = data.price ?? offer.priceCurrent;
      const priceChanged = data.price !== null && Math.abs(data.price - offer.priceCurrent) >= 0.01;
      const stockChanged = data.inStock !== offer.inStock;

      // priceOld: usar el scrapeado si lo encontramos; si no, conservar el existente
      // pero siempre re-validar con sanitizePriceOld por si acaso
      const newPriceOld = data.priceOld !== null
        ? data.priceOld                                         // scraped fresh → usar
        : sanitizePriceOld(newPrice, offer.priceOld ?? null);   // re-validar el existente

      const priceOldChanged = newPriceOld !== (offer.priceOld ?? null);

      // Recalcular discountPercent siempre desde los precios limpios
      const newDiscountPercent = newPriceOld
        ? Math.round((1 - newPrice / newPriceOld) * 100)
        : 0;
      const discountChanged = newDiscountPercent !== (offer.discountPercent ?? 0);

      if (!priceChanged && !stockChanged && !priceOldChanged && !discountChanged) {
        console.log(`  ✅ Sin cambios  — ${label}`);
        unchanged++;
        await sleep(800 + Math.random() * 400);
        continue;
      }

      const changes: string[] = [];
      if (priceChanged)    changes.push(`precio ${offer.priceCurrent.toFixed(2)} → ${newPrice.toFixed(2)} €`);
      if (stockChanged)    changes.push(`stock ${offer.inStock ? "✅" : "❌"} → ${data.inStock ? "✅" : "❌"}`);
      if (priceOldChanged) changes.push(`priceOld ${offer.priceOld?.toFixed(2) ?? "null"} → ${newPriceOld?.toFixed(2) ?? "null"} €`);
      if (discountChanged) changes.push(`descuento ${offer.discountPercent ?? 0} → ${newDiscountPercent} %`);
      console.log(`  📈 Cambio       — ${label}: ${changes.join(" | ")}`);

      if (!DRY_RUN) {
        await prisma.offer.update({
          where: { id: offer.id },
          data: {
            priceCurrent:    newPrice,
            inStock:         data.inStock,
            priceOld:        newPriceOld,
            discountPercent: newDiscountPercent,
          },
        });

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

    await sleep(1200 + Math.random() * 1300);
  }

  console.log(`\n🎉 Completado: ${updated} actualizados · ${unchanged} sin cambios · ${failed} errores`);
  if (DRY_RUN) console.log("ℹ️  Modo dry-run: ningún cambio fue guardado en la BD");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
