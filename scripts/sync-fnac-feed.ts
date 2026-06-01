/**
 * sync-fnac-feed.ts
 * Sincroniza precios, stock e imágenes de productos Fnac desde el feed de Awin.
 *
 * Uso:
 *   npx tsx scripts/sync-fnac-feed.ts              ← descarga el feed desde Awin
 *   npx tsx scripts/sync-fnac-feed.ts --dry-run     ← muestra cambios sin guardar
 *   npx tsx scripts/sync-fnac-feed.ts --local       ← usa C:\Users\xavie\Downloads\datafeed_2854543.csv.gz
 *
 * Env: AWIN_FEED_URL en .env.local (opcional, tiene fallback)
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as https from "https";
import * as zlib from "zlib";
import * as fs from "fs";
import * as path from "path";
import { chromium } from "playwright";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
});

const DRY_RUN = process.argv.includes("--dry-run");
const USE_LOCAL = process.argv.includes("--local");
const WITH_SCRAPE_FALLBACK = !process.argv.includes("--no-scrape-fallback");
const SCRAPE_ONLY_WHEN_MISSING = !process.argv.includes("--scrape-all");
const LOCAL_FILE_DEFAULTS = [
  "C:\\Users\\xavie\\Downloads\\datafeed_2854543.csv.gz",
  "C:\\Users\\xavie\\Downloads\\datafeed_2854543 (1).csv.gz",
];
const LOCAL_FILE_ARG =
  process.argv.find((a) => a.startsWith("--local-file="))?.split("=").slice(1).join("=") ??
  (process.argv.includes("--local-file")
    ? process.argv[process.argv.indexOf("--local-file") + 1]
    : null);
const LOCAL_FILE =
  LOCAL_FILE_ARG ??
  LOCAL_FILE_DEFAULTS.find((p) => fs.existsSync(p)) ??
  LOCAL_FILE_DEFAULTS[0];

const AWIN_FEED_URL =
  process.env.AWIN_FEED_URL ??
  "https://productdata.awin.com/datafeed/download/apikey/430f220fd423780e222c2683298de01b/language/es/fid/92667,92668,92680,92681/rid/0/hasEnhancedFeeds/0/columns/aw_deep_link,product_name,aw_product_id,merchant_product_id,merchant_image_url,description,merchant_category,search_price,merchant_name,merchant_id,category_name,category_id,aw_image_url,currency,store_price,delivery_cost,merchant_deep_link,language,last_updated,display_price,data_feed_id,product_price_old,savings_percent,saving,rrp_price,base_price,base_price_amount,stock_status,in_stock,is_for_sale,web_offer,large_image,alternate_image_three,alternate_image_four,alternate_image,alternate_image_two,merchant_thumb_url,aw_thumb_url,number_available,brand_name,model_number/format/csv/delimiter/%2C/compression/gzip/adultcontent/1/";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface FeedRow {
  aw_deep_link: string;
  product_name: string;
  aw_product_id: string;
  merchant_product_id: string; // "3-9543851" (marketplace) o "1-10003855" (directo)
  merchant_image_url: string;
  description: string;
  merchant_category: string;
  search_price: string;        // precio numérico: "155.26"
  merchant_name: string;
  merchant_id: string;
  category_name: string;
  category_id: string;
  aw_image_url: string;
  currency: string;
  store_price: string;
  delivery_cost: string;
  merchant_deep_link: string;
  language: string;
  last_updated: string;
  display_price: string;       // "EUR155.26"
  data_feed_id: string;
  model_number: string;
  brand_name: string;

  // Legacy aliases (some feeds use these)
  was_price: string;
  saving_percent: string;

  // New feed columns
  product_price_old: string;
  savings_percent: string;
  saving: string;
  rrp_price: string;
  base_price: string;
  base_price_amount: string;
  stock_status: string;
  in_stock: string;
  is_for_sale: string;
  web_offer: string;
  number_available: string;

  large_image: string;
  alternate_image: string;
  alternate_image_two: string;
  alternate_image_three: string;
  alternate_image_four: string;
  aw_thumb_url: string;
  merchant_thumb_url: string;
}

interface ScrapedFnacData {
  priceCurrent: number | null;
  priceOld: number | null;
  inStock: boolean | null;
  images: string[];
}

// ── Parseo CSV (respeta comillas dobles y comas dentro de campos) ─────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      // campo entre comillas
      i++;
      let val = "";
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          val += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++;
          break;
        } else {
          val += line[i++];
        }
      }
      fields.push(val);
      if (line[i] === ",") i++;
    } else {
      // campo sin comillas
      const end = line.indexOf(",", i);
      if (end === -1) {
        fields.push(line.slice(i));
        break;
      }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return fields;
}

function rowFromCsv(headers: string[], values: string[]): FeedRow {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
  return obj as unknown as FeedRow;
}

// ── Utilidades ───────────────────────────────────────────────────────────────

function parsePrice(raw: string): number | null {
  // Acepta "155.26", "EUR155.26", "1.299,99", etc.
  const cleaned = raw.replace(/[^0-9.,]/g, "").trim();
  if (!cleaned) return null;
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;
  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    normalized = lastComma > lastDot
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    normalized = /,\d{1,2}$/.test(cleaned) ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (hasDot) {
    normalized = /\.\d{1,2}$/.test(cleaned) ? cleaned : cleaned.replace(/\./g, "");
  }
  const v = parseFloat(normalized);
  return isFinite(v) && v > 0 ? v : null;
}

function sanitizeOldPrice(currentPrice: number, oldPrice: number | null): number | null {
  if (!oldPrice) return null;
  if (oldPrice <= currentPrice) return null;
  if (oldPrice / currentPrice > 2.1) return null;
  return oldPrice;
}

function normalizeImageUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withProtocol = value.replace(/^ssl:/i, "https:");
  if (!/^https?:\/\//i.test(withProtocol)) return null;
  return withProtocol.replace(/\?.*$/, "");
}

function extractProductServeWrappedUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw);
    const wrapped = parsed.searchParams.get("url");
    if (!wrapped) return null;
    return normalizeImageUrl(decodeURIComponent(wrapped));
  } catch {
    return null;
  }
}

function dedupeImages(images: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const img of images) {
    if (!img) continue;
    const n = normalizeImageUrl(img);
    if (!n) continue;
    if (!/\.(jpg|jpeg|png|webp)$/i.test(n)) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= 20) break;
  }
  return out;
}

function extractImagesFromFeedRow(row: FeedRow): string[] {
  const productServeMain = extractProductServeWrappedUrl(row.aw_image_url ?? "");
  const productServeThumb = extractProductServeWrappedUrl(row.aw_thumb_url ?? "");
  return dedupeImages([
    row.large_image,
    row.merchant_image_url,
    row.alternate_image,
    row.alternate_image_two,
    row.alternate_image_three,
    row.alternate_image_four,
    row.merchant_thumb_url,
    productServeMain,
    productServeThumb,
    row.aw_image_url,
  ]);
}

function parseBooleanLike(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (/^(1|y|yes|true|in.?stock|available|disponible|on)$/i.test(v)) return true;
  if (/^(0|n|no|false|out.?of.?stock|unavailable|agotado|off)$/i.test(v)) return false;
  return null;
}

function extractFnacIdFromUrl(url: string): string | null {
  const m = url.match(/\/(mp|a)(\d+)(?:[/?]|$)/i);
  return m ? m[2] : null;
}

async function fetchMultichannelImagesFromFnacId(fnacNumericId: string): Promise<string[]> {
  const url = `https://multichannel.fnac.es/domicilio/?id=${fnacNumericId}&tienda=2`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "es-ES,es;q=0.9" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const raw = Array.from(
      html.matchAll(/https?:\/\/[^"'()\s]+fnac-static\.com\/[^"'()\s]+\.(?:jpg|jpeg|png|webp)/gi),
      (m) => m[0],
    );
    return dedupeImages(raw);
  } catch {
    return [];
  }
}

async function scrapeFnacProductPage(url: string): Promise<ScrapedFnacData> {
  const out: ScrapedFnacData = {
    priceCurrent: null,
    priceOld: null,
    inStock: null,
    images: [],
  };

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "es-ES",
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3500);
    const html = await page.content();

    const imageMatches = Array.from(
      html.matchAll(/https?:\/\/[^"'()\s]+fnac-static\.com\/[^"'()\s]+\.(?:jpg|jpeg|png|webp)/gi),
      (m) => m[0],
    );
    out.images = dedupeImages(imageMatches);

    // Price current
    const currentCandidates = [
      html.match(/"price"\s*:\s*"?(?<p>\d+[.,]\d{2})"?/i)?.groups?.p ?? "",
      html.match(/itemprop="price"[^>]*content="(?<p>\d+[.,]\d{2})"/i)?.groups?.p ?? "",
      html.match(/class="[^"]*(?:f-priceBox-price|price-current|current-price)[^"]*"[^>]*>\s*(?<p>[^<]{1,20})</i)?.groups?.p ?? "",
    ]
      .map(parsePrice)
      .filter((v): v is number => v !== null);
    if (currentCandidates.length > 0) out.priceCurrent = currentCandidates[0];

    // Old/strikethrough price
    const oldCandidates = [
      html.match(/"oldPrice"\s*:\s*"?(?<p>\d+[.,]\d{2})"?/i)?.groups?.p ?? "",
      html.match(/"strikethroughPrice"\s*:\s*"?(?<p>\d+[.,]\d{2})"?/i)?.groups?.p ?? "",
      html.match(/class="[^"]*(?:f-priceBox-oldPrice|old-price|price-old|strikethrough)[^"]*"[^>]*>\s*(?<p>[^<]{1,20})</i)?.groups?.p ?? "",
    ]
      .map(parsePrice)
      .filter((v): v is number => v !== null);
    if (oldCandidates.length > 0 && out.priceCurrent) {
      out.priceOld = sanitizeOldPrice(out.priceCurrent, oldCandidates[0]);
    }

    // Stock
    if (/instock|en stock|disponible/i.test(html)) out.inStock = true;
    if (/outofstock|agotado|indisponible|sin stock/i.test(html)) out.inStock = false;

    await page.close();
    await context.close();
  } catch {
    // keep partial defaults
  } finally {
    if (browser) await browser.close();
  }

  return out;
}

/** Extrae el ID de producto Fnac a partir del merchant_product_id del feed.
 *  "3-9543851" → "mp9543851"  (marketplace)
 *  "1-10003855" → "a10003855" (directo)
 */
function feedIdToFnacId(merchantProductId: string): string | null {
  const m = merchantProductId.match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  const prefix = m[1] === "3" ? "mp" : "a";
  return `${prefix}${m[2]}`;
}

/** Extrae el fnac ID de una URL, incluyendo URLs Awin con ued= codificado.
 *  "https://www.awin1.com/cread.php?...&ued=https%3A%2F%2Fwww.fnac.es%2Fmp9543851%2F..."
 *  → "mp9543851"
 */
function fnacIdFromUrl(url: string): string | null {
  // Caso 1: URL directa de Fnac
  let m = url.match(/fnac\.es\/(mp\d+|a\d+)[/?]/i);
  if (m) return m[1];

  // Caso 2: URL Awin con Fnac URL en parámetro ued (codificado)
  try {
    const parsed = new URL(url);
    const ued = parsed.searchParams.get("ued");
    if (ued) {
      const decoded = decodeURIComponent(ued);
      const m2 = decoded.match(/fnac\.es\/(mp\d+|a\d+)[/?]/i);
      if (m2) return m2[1];
    }
  } catch { /* skip */ }

  // Caso 3: buscar en la URL raw sin parsear (fnac.es%2Fmp9543851%2F)
  const m3 = url.match(/fnac\.es(?:%2F|\/)(mp\d+|a\d+)(?:%2F|\/)/i);
  return m3?.[1] ?? null;
}

// ── Descarga con seguimiento de redirects ────────────────────────────────────

function fetchWithRedirects(url: string, maxRedirects: number): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : (require("http") as typeof https);
    lib.get(url, { headers: { "Accept-Encoding": "gzip", "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) { reject(new Error("Demasiados redirects")); return; }
        const next = res.headers.location.startsWith("http")
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        fetchWithRedirects(next, maxRedirects - 1).then(resolve).catch(reject);
      } else if (res.statusCode === 200) {
        resolve(res);
      } else {
        reject(new Error(`HTTP ${res.statusCode} al descargar el feed desde ${url}`));
      }
    }).on("error", reject);
  });
}

// ── Lectura del feed ──────────────────────────────────────────────────────────

async function loadFeedRows(): Promise<FeedRow[]> {
  return new Promise((resolve, reject) => {
    const rows: FeedRow[] = [];
    let headers: string[] = [];
    let buffer = "";

    const processStream = (stream: NodeJS.ReadableStream) => {
      const gunzip = zlib.createGunzip();
      stream.pipe(gunzip);

      gunzip.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const values = parseCsvLine(line);
          if (headers.length === 0) {
            headers = values;
          } else {
            if (values.length >= headers.length - 3) {
              rows.push(rowFromCsv(headers, values));
            }
          }
        }
      });

      gunzip.on("end", () => {
        // Procesar lo que queda en el buffer
        if (buffer.trim()) {
          const values = parseCsvLine(buffer);
          if (headers.length > 0 && values.length >= headers.length - 3) {
            rows.push(rowFromCsv(headers, values));
          }
        }
        resolve(rows);
      });

      gunzip.on("error", reject);
      stream.on("error", reject);
    };

    if (USE_LOCAL) {
      console.log(`📂 Leyendo archivo local: ${LOCAL_FILE}\n`);
      const fileStream = fs.createReadStream(LOCAL_FILE);
      processStream(fileStream);
    } else {
      console.log(`🌐 Descargando feed de Awin...\n`);
      fetchWithRedirects(AWIN_FEED_URL, 5)
        .then((res) => processStream(res))
        .catch(reject);
    }
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🔄 Sincronizando feed de Fnac${DRY_RUN ? " (dry-run)" : ""}...\n`);
  console.log(`Fallback scraping directo: ${WITH_SCRAPE_FALLBACK ? "ON" : "OFF"}\n`);

  const rows = await loadFeedRows();
  console.log(`✅ Feed cargado: ${rows.length.toLocaleString()} productos\n`);

  // Construir lookups:
  //  feedByFnacId:      "mp9543851" → FeedRow  (match via cread.php ?ued= o URL directa)
  //  feedByAwProductId: "38388264710" → FeedRow  (match via pclick.php ?p=)
  //  feedByModel:       "32HG01V" → [FeedRow, ...]  (fallback)
  const feedByFnacId = new Map<string, FeedRow>();
  const feedByAwProductId = new Map<string, FeedRow>();
  const feedByModel = new Map<string, FeedRow[]>();

  for (const row of rows) {
    const fnacId = feedIdToFnacId(row.merchant_product_id);
    if (fnacId) feedByFnacId.set(fnacId.toLowerCase(), row);

    if (row.aw_product_id?.trim()) {
      feedByAwProductId.set(row.aw_product_id.trim(), row);
    }

    const model = row.model_number?.trim();
    if (model) {
      if (!feedByModel.has(model.toLowerCase())) feedByModel.set(model.toLowerCase(), []);
      feedByModel.get(model.toLowerCase())!.push(row);
    }
  }

  console.log(`📦 Índice: ${feedByFnacId.size} por FnacID | ${feedByAwProductId.size} por AwProductId | ${feedByModel.size} modelos\n`);

  // Obtener todas las ofertas Fnac de la BD
  const offers = await prisma.offer.findMany({
    where: { store: { contains: "fnac", mode: "insensitive" } },
    include: { product: { select: { id: true, name: true, model: true, image: true, images: true } } },
  });

  console.log(`📋 Ofertas Fnac en BD: ${offers.length}\n`);

  let updated = 0;
  let unchanged = 0;
  let notFound = 0;

  for (const offer of offers) {
    const label = `${offer.product.name.substring(0, 50)} [Fnac]`;

    // 1. Match por fnacId extraído de la URL (funciona con cread.php y URLs directas)
    const fnacIdFromExternalUrl = fnacIdFromUrl(offer.externalUrl);
    let feedRow: FeedRow | undefined = fnacIdFromExternalUrl
      ? feedByFnacId.get(fnacIdFromExternalUrl.toLowerCase())
      : undefined;

    // 2. Match por aw_product_id (funciona con pclick.php?p=XXXXXXX)
    if (!feedRow) {
      try {
        const parsed = new URL(offer.externalUrl);
        const awp = parsed.searchParams.get("p");
        if (awp) feedRow = feedByAwProductId.get(awp);
      } catch { /* skip */ }
    }

    // 3. Fallback: match por model_number
    if (!feedRow && offer.product.model) {
      const modelMatches = feedByModel.get(offer.product.model.toLowerCase());
      if (modelMatches && modelMatches.length === 1) feedRow = modelMatches[0];
    }

    if (!feedRow) {
      console.log(`  [?] No encontrado en feed: ${label}`);
      notFound++;
      continue;
    }

    const newPrice = parsePrice(feedRow.search_price);
    if (!newPrice) {
      console.log(`  [!] Precio inválido en feed para: ${label} → "${feedRow.search_price}"`);
      notFound++;
      continue;
    }

    // Imagen: extraer varias fuentes del feed y preservar galería existente.
    const incomingImages = extractImagesFromFeedRow(feedRow);
    const mergedImages = dedupeImages([
      ...incomingImages,
      ...(offer.product.images ?? []),
      offer.product.image,
    ]);
    const newImage = mergedImages[0] ?? null;

    // Enlace: usar cread.php con la URL limpia de Fnac (sin oref) para que
    // el matching funcione en futuras ejecuciones.
    const cleanFnacUrl = feedRow.merchant_deep_link?.trim().split("?")[0] ?? "";
    const newUrl = cleanFnacUrl && cleanFnacUrl.includes("fnac.es")
      ? `https://www.awin1.com/cread.php?awinmid=77630&awinaffid=2854543&platform=dl&ued=${encodeURIComponent(cleanFnacUrl)}`
      : (feedRow.aw_deep_link?.trim() || offer.externalUrl);

    // Stock: campo in_stock del feed o asumimos en stock si aparece en el feed
    const inStockCandidates: Array<boolean | null> = [
      parseBooleanLike(feedRow.in_stock ?? ""),
      parseBooleanLike(feedRow.stock_status ?? ""),
      parseBooleanLike(feedRow.is_for_sale ?? ""),
      parseBooleanLike(feedRow.web_offer ?? ""),
    ];
    const numberAvailable = parseInt(feedRow.number_available ?? "", 10);
    if (Number.isFinite(numberAvailable)) {
      inStockCandidates.push(numberAvailable > 0);
    }
    const stockResolved = inStockCandidates.find((v) => v !== null);
    const newInStock = stockResolved ?? offer.inStock;

    // Precio anterior y descuento (soporta columnas legacy + nuevas)
    const oldPriceCandidates = [
      parsePrice(feedRow.product_price_old ?? ""),
      parsePrice(feedRow.was_price ?? ""),
      parsePrice(feedRow.rrp_price ?? ""),
      parsePrice(feedRow.base_price_amount ?? ""),
      parsePrice(feedRow.base_price ?? ""),
    ].filter((v): v is number => v !== null);
    const wasPriceRaw =
      oldPriceCandidates.find((p) => p > newPrice && p / newPrice <= 2.1) ?? null;

    const savingPctRaw = parseInt(
      (feedRow.savings_percent ?? feedRow.saving_percent ?? "").trim(),
      10
    );
    const savingRaw = parsePrice(feedRow.saving ?? "");
    let newPriceOld: number | null = null;
    let newDiscountPercent = 0;
    if (wasPriceRaw && wasPriceRaw > newPrice && wasPriceRaw / newPrice <= 2.1) {
      newPriceOld = wasPriceRaw;
      newDiscountPercent = isFinite(savingPctRaw) && savingPctRaw > 0
        ? savingPctRaw
        : Math.round((1 - newPrice / wasPriceRaw) * 100);
    } else if (savingRaw && savingRaw > 0) {
      const inferredOld = newPrice + savingRaw;
      if (inferredOld > newPrice && inferredOld / newPrice <= 2.1) {
        newPriceOld = inferredOld;
        newDiscountPercent = isFinite(savingPctRaw) && savingPctRaw > 0
          ? savingPctRaw
          : Math.round((1 - newPrice / inferredOld) * 100);
      }
    } else if (offer.priceCurrent > newPrice && offer.priceCurrent / newPrice <= 2.1) {
      // Fallback: si el feed no trae was_price, usar el precio previo en BD como referencia real.
      newPriceOld = offer.priceCurrent;
      newDiscountPercent = Math.round((1 - newPrice / offer.priceCurrent) * 100);
    }

    // Fallback 2: scraping directo de ficha Fnac para completar datos faltantes.
    const shouldScrapeFallback =
      WITH_SCRAPE_FALLBACK &&
      (!SCRAPE_ONLY_WHEN_MISSING || (!newPriceOld || mergedImages.length < 2 || inStockCandidates.find((v) => v !== null) === undefined));

    if (shouldScrapeFallback) {
      const scraped = await scrapeFnacProductPage(cleanFnacUrl || feedRow.merchant_deep_link || "");

      // Only trust scraped current price if close to feed current price.
      if (scraped.priceCurrent && Math.abs(scraped.priceCurrent - newPrice) <= Math.max(2, newPrice * 0.03)) {
        if (!newPriceOld && scraped.priceOld) {
          newPriceOld = sanitizeOldPrice(scraped.priceCurrent, scraped.priceOld);
          if (newPriceOld) {
            newDiscountPercent = Math.round((1 - scraped.priceCurrent / newPriceOld) * 100);
          }
        }
      }

      if (scraped.inStock !== null && inStockCandidates.find((v) => v !== null) === undefined) {
        // We only override when feed has no explicit stock signal.
        const inferred = scraped.inStock;
        if (typeof inferred === "boolean") {
          inStockCandidates.push(inferred);
        }
      }

      if (scraped.images.length > 0) {
        mergedImages.splice(0, mergedImages.length, ...dedupeImages([...scraped.images, ...mergedImages]));
      } else if (mergedImages.length < 2) {
        // Additional fallback for Fnac marketplace pages.
        const fnacNumericId = extractFnacIdFromUrl(cleanFnacUrl || feedRow.merchant_deep_link || "");
        if (fnacNumericId) {
          const extra = await fetchMultichannelImagesFromFnacId(fnacNumericId);
          if (extra.length > 0) {
            mergedImages.splice(0, mergedImages.length, ...dedupeImages([...extra, ...mergedImages]));
          }
        }
      }
    }

    // Recompute image head after fallback
    const finalImage = mergedImages[0] ?? newImage;

    const priceChanged = Math.abs(newPrice - offer.priceCurrent) >= 0.01;
    const finalStock = (inStockCandidates.find((v) => v !== null) ?? newInStock) as boolean;
    const stockChanged = finalStock !== offer.inStock;
    const imageChanged = !!(finalImage ?? newImage) && (
      (finalImage ?? newImage) !== offer.product.image ||
      JSON.stringify(mergedImages) !== JSON.stringify(offer.product.images ?? [])
    );
    const urlChanged = newUrl !== offer.externalUrl;
    const priceOldChanged = newPriceOld !== (offer.priceOld ?? null);
    const discountChanged = newDiscountPercent !== (offer.discountPercent ?? 0);

    if (!priceChanged && !stockChanged && !imageChanged && !urlChanged && !priceOldChanged && !discountChanged) {
      console.log(`  [ok] Sin cambios — ${label} ${newPrice.toFixed(2)}€${newDiscountPercent > 0 ? ` (-${newDiscountPercent}%)` : ""}`);
      unchanged++;
      continue;
    }

    const changes: string[] = [];
    if (priceChanged) changes.push(`precio ${offer.priceCurrent.toFixed(2)}€ → ${newPrice.toFixed(2)}€`);
    if (stockChanged) changes.push(`stock ${offer.inStock} → ${finalStock}`);
    if (priceOldChanged) changes.push(`precioAntes ${offer.priceOld ?? "null"} → ${newPriceOld ?? "null"}`);
    if (discountChanged) changes.push(`descuento ${offer.discountPercent ?? 0}% → ${newDiscountPercent}%`);
    if (imageChanged) changes.push(`imagen actualizada`);
    if (urlChanged) changes.push(`url afiliado actualizada`);

    console.log(`  [✓] ${label}: ${changes.join(" | ")}`);

    if (!DRY_RUN) {
      await prisma.offer.update({
        where: { id: offer.id },
        data: {
          priceCurrent: newPrice,
          inStock: finalStock,
          priceOld: newPriceOld,
          discountPercent: newDiscountPercent,
          externalUrl: newUrl,
        },
      });

      if (imageChanged && (finalImage ?? newImage)) {
        await prisma.product.update({
          where: { id: offer.product.id },
          data: { image: finalImage ?? newImage, images: mergedImages },
        });
      }

      if (priceChanged) {
        await prisma.priceHistory.create({
          data: { productId: offer.productId, store: "Fnac", price: newPrice },
        });
      }
    }

    updated++;
  }

  console.log(`\n🎉 Resultado: ${updated} actualizados | ${unchanged} sin cambios | ${notFound} no encontrados en feed`);
  if (DRY_RUN) console.log("(dry-run: no se guardó nada)");
}

main().catch(console.error).finally(() => prisma.$disconnect());
