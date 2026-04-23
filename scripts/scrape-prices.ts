/**
 * scrape-prices.ts
 * Updates prices, old prices and stock for offers in DB.
 * Supports: Amazon, PcComponentes, Fnac.
 * El Corte Inglés is excluded here (Akamai blocks scraping) and handled by
 * scripts/update-prices-awin.ts via the official AWIN affiliate feed.
 *
 * Usage:
 *   npx tsx scripts/scrape-prices.ts
 *   npx tsx scripts/scrape-prices.ts amazon
 *   npx tsx scripts/scrape-prices.ts --dry-run
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.argv.includes("--dry-run");
const STORE_FILTER = process.argv.slice(2).find((a) => !a.startsWith("--"))?.toLowerCase();

// max ratio priceOld/priceCurrent accepted as real discount
// 2.1 allows up to ~53% off (e.g. Philips 759€ → 379€ = ratio 2.0x)
const MAX_DISCOUNT_RATIO = 2.1;
// ignore suspicious jumps from scrape glitches (e.g. cents parsed as euros)
const MAX_PRICE_JUMP_RATIO = 3.0;
const AMAZON_MAX_RETRIES = 3;
const AMAZON_RETRY_BASE_MS = 2500;
const PCC_MAX_RETRIES = 3;
const PCC_RETRY_BASE_MS = 2200;

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

const HEADERS: Record<string, string> = {
  "User-Agent": USER_AGENTS[0],
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Upgrade-Insecure-Requests": "1",
};

interface ScrapedData {
  price: number | null;
  priceOld: number | null;
  inStock: boolean;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function resolveRedirect(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    return res.url || url;
  } catch {
    return url;
  }
}

async function fetchHtml(url: string): Promise<string> {
  let referer = "https://www.google.com/";
  try {
    const u = new URL(url);
    referer = `${u.protocol}//${u.host}/`;
  } catch {
    // keep default
  }

  const headers = {
    ...HEADERS,
    "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    Referer: referer,
  };
  const res = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(12000) });
  return res.text();
}

function isAmazonStore(store: string): boolean {
  return store.toLowerCase().includes("amazon");
}

function isAmazonBlockError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /amazon blocked request|captcha|robot check/i.test(message);
}

function isPcComponentesStore(store: string): boolean {
  const s = store.toLowerCase();
  return s.includes("pccomponentes") || s.includes("pccomponente");
}

function isPcComponentesBlockedHtml(html: string): boolean {
  return (
    /just a moment/i.test(html) &&
    /enable javascript and cookies to continue/i.test(html) &&
    /cdn-cgi\/challenge-platform/i.test(html)
  ) || /__cf_chl_|cloudflare/i.test(html);
}

function isPcComponentesBlockError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /pccomponentes blocked request|cloudflare|just a moment|enable javascript and cookies/i.test(message);
}

function parsePrice(raw: string): number | null {
  const cleaned = raw
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\u00A0/g, " ")
    .replace(/[\s]/g, "")
    .replace(/[€$£]/g, "")
    .replace(/EUR|USD|GBP/gi, "")
    .replace(/[^\d,.-]/g, "")
    .trim();

  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");

    if (lastComma > lastDot) {
      // 1.299,99
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,299.99
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    // 199,99 or 1,299
    normalized = /,\d{1,2}$/.test(cleaned) ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (hasDot) {
    // 199.99 or 1.299
    normalized = /\.\d{1,2}$/.test(cleaned) ? cleaned : cleaned.replace(/\./g, "");
  }

  const v = Number.parseFloat(normalized);
  return Number.isFinite(v) && v > 0 && v < 100_000 ? v : null;
}

function sanitizePriceOld(priceCurrent: number, priceOld: number | null): number | null {
  if (!priceOld || priceOld <= priceCurrent) return null;
  const ratio = priceOld / priceCurrent;
  return ratio <= MAX_DISCOUNT_RATIO ? priceOld : null;
}

function calculateDiscountPercent(priceCurrent: number, priceOld: number | null): number {
  if (!priceOld) return 0;
  return Math.max(0, Math.round((1 - priceCurrent / priceOld) * 100));
}

function extractFirstPrice(html: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;

    const raw = match[2] ? `${match[1]}.${match[2]}` : match[1];
    const value = parsePrice(raw);
    if (value !== null) return value;
  }
  return null;
}

async function scrapeAmazon(url: string): Promise<ScrapedData> {
  const finalUrl = url.includes("amzn.to") ? await resolveRedirect(url) : url;
  const html = await fetchHtml(finalUrl);

  const isBlocked =
    /robot check|captcha|automated access|api-services-support@amazon|enter the characters you see|validatecaptcha/i.test(
      html
    ) || (html.length < 5000 && !html.includes("productTitle") && !html.includes("a-price"));

  if (isBlocked) throw new Error("Amazon blocked request (captcha/robot check)");

  const price = extractFirstPrice(html, [
    /"priceAmount"\s*:\s*([\d]+\.[\d]{2})/,
    /"price"\s*:\s*"([\d]+\.[\d]{2})"/,
    /id="priceblock_dealprice"[^>]*>\s*([\d.,]+)/,
    /id="priceblock_ourprice"[^>]*>\s*([\d.,]+)/,
    /class="a-price-whole"[^>]*>([\d.]+)<[\s\S]*?class="a-price-fraction"[^>]*>([\d]+)/,
    /corePriceDisplay[\s\S]{0,500}"displayPrice"\s*:\s*"([^"]+)"/,
    /class="a-offscreen">\s*([^<]{2,30})</,
  ]);

  const priceOldRaw = extractFirstPrice(html, [
    /"basisPrice"\s*:\s*\{[^}]*"amount"\s*:\s*([\d.]+)/,
    /"wasPrice"\s*:\s*\{[^}]*"amount"\s*:\s*([\d.]+)/,
    /"listPrice"\s*:\s*\{[^}]*"amount"\s*:\s*([\d.]+)/,
    /"strikethroughPrice"\s*:\s*\{[^}]*"amount"\s*:\s*([\d.]+)/,
    /"basisPrice"\s*:\s*"([^"]+)"/,
    /"wasPrice"\s*:\s*"([^"]+)"/,
    /data-a-strike="true"[^>]*>[\s\S]{0,120}>([^<]{2,30})</,
    /class="[^"]*a-text-price[^"]*"[^>]*data-a-strike="true"[\s\S]{0,220}>([^<]{2,30})</,
    /id="priceblock_saleprice_label"[\s\S]{0,450}>([^<]{2,30})</,
    /corePriceDisplay[\s\S]{0,1200}"basisPrice"[\s\S]{0,300}"displayPrice"\s*:\s*"([^"]+)"/,
  ]);

  const outOfStockSignals = [
    /id="outOfStock"/i,
    /"availability"\s*:\s*"OutOfStock"/i,
    /actualmente no disponible/i,
    /temporalmente sin stock/i,
    /este producto no est[a\u00E1] disponible/i,
    /currently unavailable/i,
  ];

  const inStockSignals = [
    /a(?:n|\u00F1)adir al carrito/i,
    /a(?:n|\u00F1)adir a la cesta/i,
    /add to cart/i,
    /"availability"\s*:\s*"InStock"/i,
    /id="add-to-cart-button"/i,
    /id="buy-now-button"/i,
    /comprar ya/i,
  ];

  const hasOutOfStock = outOfStockSignals.some((p) => p.test(html));
  const hasInStock = inStockSignals.some((p) => p.test(html));
  const inStock = hasOutOfStock && !hasInStock ? false : true;

  const priceOld = price ? sanitizePriceOld(price, priceOldRaw) : null;
  return { price, priceOld, inStock };
}

async function scrapePcComponentes(url: string): Promise<ScrapedData> {
  const html = await fetchHtml(url);
  if (isPcComponentesBlockedHtml(html)) {
    throw new Error("PcComponentes blocked request (cloudflare challenge)");
  }

  const price = extractFirstPrice(html, [
    /"price"\s*:\s*"?([\d]+\.[\d]{2})"?/,
    /"price"\s*:\s*"([\d.,]+)"/,
    /data-product-price="([\d.,]+)"/,
    /"priceValue"\s*:\s*([\d.]+)/,
    /itemprop="price"[^>]*content="([\d.]+)"/,
    /"unitPrice"\s*:\s*"([\d.,]+)"/,
    /"currentPrice"\s*:\s*"?([\d.,]+)"?/,
    /"priceAmount"\s*:\s*([\d.]+)/,
    /"salePrice"\s*:\s*"?([\d.,]+)"?/,
    /class="[^"]*price[^"]*"[^>]*>\s*([\d.,]+)\s*€/i,
  ]);

  const priceOldRaw = extractFirstPrice(html, [
    /data-product-old-price="([\d.,]+)"/,
    /<del[^>]*class="[^"]*price-old[^"]*"[^>]*>([\d.,]+)/,
    /"oldPrice"\s*:\s*"?([\d.]+)"?/,
    /"oldPrice"\s*:\s*"([\d.,]+)"/,
    /"listPrice"\s*:\s*"?([\d.,]+)"?/,
    /"strike(?:Through)?Price"\s*:\s*"?([\d.,]+)"?/i,
    /"priceBefore"\s*:\s*"?([\d.,]+)"?/i,
    /class="[^"]*(?:old-price|price--old|product-card__old-price)[^"]*"[^>]*>\s*([\d.,]+)/i,
  ]);

  const ldAvailPcc = html.match(/"availability"\s*:\s*"([^"]{3,80})"/)?.[1] ?? "";
  const pccOutOfStock =
    /av[i\u00ED]same cuando est[e\u00E9] disponible|sin stock en tienda/i.test(html) ||
    /"availability"\s*:\s*"(?:OutOfStock|Discontinued|LimitedAvailability)/i.test(html) ||
    /agotado|no disponible|temporalmente sin stock|producto descatalogado/i.test(html) ||
    /"stock"\s*:\s*0\b/i.test(html) ||
    /class="[^"]*(?:sin-stock|out-of-stock|agotado)[^"]*"/i.test(html);

  const pccInStockSignals =
    /a(?:n|\u00F1)adir al carrito|comprar ahora|entrega en|rec[ií]belo|unidades disponibles/i.test(html) ||
    /"availability"\s*:\s*"(?:InStock|PreOrder)/i.test(html) ||
    /"stock"\s*:\s*[1-9]\d*/i.test(html);

  const inStock = ldAvailPcc
    ? /instock|preorder/i.test(ldAvailPcc)
    : pccInStockSignals && !pccOutOfStock;

  const priceOld = price ? sanitizePriceOld(price, priceOldRaw) : null;
  return { price, priceOld, inStock };
}

async function scrapeFnac(url: string): Promise<ScrapedData> {
  const html = await fetchHtml(url);

  const price = extractFirstPrice(html, [
    /itemprop="price"[^>]*content="([\d.]+)"/,
    /"price"\s*:\s*"?([\d]+\.[\d]{2})"?/,
    /class="[^"]*f-priceBox-price[^"]*"[^>]*>([\d.,]+)/,
  ]);

  const priceOldRaw = extractFirstPrice(html, [
    /class="[^"]*f-priceBox-oldPrice[^"]*"[^>]*>([\d.,]+)/,
    /"oldPrice"\s*:\s*"?([\d.]+)"?/,
  ]);

  const ldAvailFnac = html.match(/"availability"\s*:\s*"([^"]{3,80})"/)?.[1] ?? "";
  const inStock = ldAvailFnac
    ? /instock/i.test(ldAvailFnac)
    : /a(?:n|\u00F1)adir al carrito|comprar ahora|add to cart/i.test(html) &&
      !/class="[^"]*(?:out-of-stock|sin-stock|agotado)[^"]*"/i.test(html);

  const priceOld = price ? sanitizePriceOld(price, priceOldRaw) : null;
  return { price, priceOld, inStock };
}

// El Corte Ingles is handled separately by scripts/update-prices-awin.ts
// because Akamai blocks direct scraping.
function isElCorteInglesStore(store: string): boolean {
  const s = store.toLowerCase();
  return s.includes("corte") || s.includes("eci");
}

async function scrapeOffer(store: string, url: string): Promise<ScrapedData> {
  const s = store.toLowerCase();
  if (s.includes("amazon")) return scrapeAmazon(url);
  if (s.includes("pccomponentes") || s.includes("pccomponente")) return scrapePcComponentes(url);
  if (s.includes("fnac")) return scrapeFnac(url);
  return scrapeAmazon(url);
}

async function scrapeOfferWithRetry(store: string, url: string): Promise<ScrapedData> {
  const amazon = isAmazonStore(store);
  const pcc = isPcComponentesStore(store);
  const maxAttempts = amazon ? AMAZON_MAX_RETRIES : pcc ? PCC_MAX_RETRIES : 1;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await scrapeOffer(store, url);
    } catch (error) {
      lastError = error;

      const isBlock = (amazon && isAmazonBlockError(error)) || (pcc && isPcComponentesBlockError(error));
      const hasMoreAttempts = attempt < maxAttempts;

      if (!isBlock || !hasMoreAttempts) break;

      const jitter = Math.floor(Math.random() * 900);
      const waitMs = (amazon ? AMAZON_RETRY_BASE_MS : PCC_RETRY_BASE_MS) * attempt + jitter;
      console.log(
        `  [retry] ${amazon ? "Amazon" : "PcComponentes"} blocked, attempt ${attempt}/${maxAttempts}. Waiting ${waitMs}ms...`
      );
      await sleep(waitMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function main() {
  console.log(`Starting scraper${DRY_RUN ? " (dry-run)" : ""}${STORE_FILTER ? ` | store: ${STORE_FILTER}` : ""}\n`);

  const allOffers = await prisma.offer.findMany({
    include: { product: { select: { name: true } } },
    ...(STORE_FILTER ? { where: { store: { contains: STORE_FILTER, mode: "insensitive" } } } : {}),
  });

  // El Corte Inglés is updated via scripts/update-prices-awin.ts (Akamai blocks scraping).
  const offers = allOffers.filter((o) => !isElCorteInglesStore(o.store));
  const skippedEci = allOffers.length - offers.length;
  if (skippedEci > 0) {
    console.log(`Skipping ${skippedEci} El Corte Inglés offer(s) - use scripts/update-prices-awin.ts\n`);
  }

  console.log(`${offers.length} offers to process\n`);

  let updated = 0;
  let unchanged = 0;
  let failed = 0;
  let skipped = 0;

  for (const offer of offers) {
    const label = `${offer.product.name.substring(0, 40)} [${offer.store}]`;

    try {
      const data = await scrapeOfferWithRetry(offer.store, offer.externalUrl);

      const isOutlierPrice =
        data.price !== null &&
        (data.price > offer.priceCurrent * MAX_PRICE_JUMP_RATIO ||
          data.price < offer.priceCurrent / MAX_PRICE_JUMP_RATIO);

      const safeScrapedPrice = isOutlierPrice ? null : data.price;

      if (isOutlierPrice) {
        console.log(
          `  [warn] Outlier price - ${label}: scraped ${data.price!.toFixed(2)} EUR ignored (current ${offer.priceCurrent.toFixed(2)} EUR)`
        );
      }

      const newPrice = safeScrapedPrice ?? offer.priceCurrent;
      const priceChanged = safeScrapedPrice !== null && Math.abs(safeScrapedPrice - offer.priceCurrent) >= 0.01;
      const stockChanged = data.inStock !== offer.inStock;

      const newPriceOld =
        data.priceOld !== null ? data.priceOld : sanitizePriceOld(newPrice, offer.priceOld ?? null);

      const priceOldChanged = newPriceOld !== (offer.priceOld ?? null);

      const newDiscountPercent = calculateDiscountPercent(newPrice, newPriceOld);
      const discountChanged = newDiscountPercent !== (offer.discountPercent ?? 0);

      if (!priceChanged && !stockChanged && !priceOldChanged && !discountChanged) {
        console.log(`  [ok] No changes - ${label}`);
        unchanged++;
        await sleep(800 + Math.random() * 400);
        continue;
      }

      const changes: string[] = [];
      if (priceChanged) changes.push(`price ${offer.priceCurrent.toFixed(2)} -> ${newPrice.toFixed(2)} EUR`);
      if (stockChanged) changes.push(`stock ${offer.inStock ? "in" : "out"} -> ${data.inStock ? "in" : "out"}`);
      if (priceOldChanged)
        changes.push(`priceOld ${offer.priceOld?.toFixed(2) ?? "null"} -> ${newPriceOld?.toFixed(2) ?? "null"} EUR`);
      if (discountChanged) changes.push(`discount ${offer.discountPercent ?? 0} -> ${newDiscountPercent} %`);

      console.log(`  [chg] ${label}: ${changes.join(" | ")}`);

      if (!DRY_RUN) {
        await prisma.offer.update({
          where: { id: offer.id },
          data: {
            priceCurrent: newPrice,
            inStock: data.inStock,
            priceOld: newPriceOld,
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
    } catch (error) {
      if (isAmazonStore(offer.store) && isAmazonBlockError(error)) {
        console.log(`  [skip] ${label}: blocked by Amazon after retries`);
        skipped++;
      } else if (isPcComponentesStore(offer.store) && isPcComponentesBlockError(error)) {
        console.log(`  [skip] ${label}: blocked by PcComponentes (Cloudflare) after retries`);
        skipped++;
      } else {
        console.log(`  [err] ${label}: ${error instanceof Error ? error.message : error}`);
        failed++;
      }
    }

    const waitMs = isAmazonStore(offer.store)
      ? 3000 + Math.random() * 3000
      : isPcComponentesStore(offer.store)
      ? 2400 + Math.random() * 2200
      : 1200 + Math.random() * 1300;
    await sleep(waitMs);
  }

  console.log(`\nDone: ${updated} updated | ${unchanged} unchanged | ${skipped} skipped | ${failed} errors`);
  if (DRY_RUN) console.log("Dry-run mode: no DB changes were saved");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
