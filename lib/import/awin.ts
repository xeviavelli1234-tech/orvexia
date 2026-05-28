/**
 * Importador de feeds Awin (Fnac, El Corte Inglés, LG…).
 *
 * Núcleo compartido entre el CLI (`scripts/import-awin-feed.ts`) y el cron
 * (`/api/cron/import-awin-feed`).
 *
 * Sincroniza precios, descuentos, stock e imágenes contra las ofertas que
 * ya tenemos en BD, identificándolas por `aw_product_id` extraído de la URL
 * de afiliado guardada en `Offer.externalUrl`.
 */
import { prisma } from "@/lib/prisma";
import { parse } from "csv-parse";
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { parsePricePositive } from "@/lib/format/parsePrice";

export interface FeedConfig {
  /** Nombre canónico del store en BD (ej. "El Corte Inglés", "Fnac"). */
  storeName: string;
  /** Patrón para `Offer.store` (case-insensitive). */
  storeMatcher: RegExp;
  /** URL del feed con apikey. */
  url: string | undefined;
}

export interface ImportOptions {
  /** Si es true, no escribe nada en BD. */
  dryRun?: boolean;
  /** Logger opcional. Por defecto silencioso. */
  log?: (msg: string) => void;
}

export interface ImportStats {
  store: string;
  skipped?: string;
  rowsRead: number;
  matched: number;
  updated: number;
  unchanged: number;
  priceChanged: number;
  stockChanged: number;
  imagesUpdated: number;
  /** Ofertas que llevaban >STALE_DAYS sin verse en el feed y se marcaron agotadas. */
  markedOutOfStock: number;
  errors: number;
}

const EMPTY_STATS = (store: string): ImportStats => ({
  store,
  rowsRead: 0, matched: 0, updated: 0, unchanged: 0,
  priceChanged: 0, stockChanged: 0, imagesUpdated: 0, markedOutOfStock: 0, errors: 0,
});

/** Días sin verse en el feed tras los que una oferta se marca agotada. */
const STALE_DAYS = 14;

// ── Utilidades de parseo ─────────────────────────────────────────────────────

const parsePrice = parsePricePositive;

export function parseInStock(row: Record<string, string>): boolean {
  const inStock = row.in_stock?.trim();
  const isForSale = row.is_for_sale?.trim();
  const stockStatus = row.stock_status?.trim().toLowerCase();
  const stockQty = parseInt(row.stock_quantity ?? "0", 10);

  if (inStock === "0") return false;
  if (isForSale === "0") return false;
  if (stockStatus && /agotad|sin stock|no disponible|out\s*of\s*stock/i.test(stockStatus)) return false;
  if (stockQty < 0) return false;

  return inStock === "1" || stockStatus === "" || /disponib|in\s*stock|available/i.test(stockStatus ?? "");
}

export function extractAwProductId(externalUrl: string): string | null {
  // Awin URL: https://www.awin1.com/pclick.php?p=44372459927&a=2854543&m=77630
  const m = externalUrl.match(/[?&]p=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export interface FeedRowComputed {
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  inStock: boolean;
}

/**
 * Calcula los valores derivados de una fila del feed (precio, precio anterior,
 * descuento, stock) sin tocar BD. Devuelve `null` si la fila no es procesable
 * (sin precio actual válido).
 *
 * Reglas críticas:
 * - Precio actual: search_price > store_price > display_price
 * - Precio antiguo: was_price > product_price_old > rrp_price (PVPR fabricante)
 * - Si el PVPR implica >25% descuento y no hay was_price del store, lo descartamos
 *   (suele ser PVP de lanzamiento ya obsoleto)
 * - Descuento: prioriza el del feed (savings_percent ECI / saving_percent FNAC),
 *   si no, lo calcula del ratio
 * - Si no hay priceOld, no hay descuento
 */
export function computeOfferUpdate(row: Record<string, string>): FeedRowComputed | null {
  const priceCurrent =
    parsePrice(row.search_price) ??
    parsePrice(row.store_price) ??
    parsePrice(row.display_price);

  if (priceCurrent === null) return null;

  const wasPrice = parsePrice(row.was_price);
  const oldFromStore = wasPrice ?? parsePrice(row.product_price_old);
  const rrpPrice = parsePrice(row.rrp_price);

  let priceOld: number | null = oldFromStore ?? rrpPrice;
  if (priceOld !== null && priceOld <= priceCurrent) priceOld = null;

  if (priceOld !== null && oldFromStore === null && rrpPrice !== null) {
    const implied = (priceOld - priceCurrent) / priceOld;
    if (implied > 0.25) priceOld = null;
  }

  // ECI usa savings_percent, Fnac usa saving_percent (sin 's')
  const savingsRaw = row.savings_percent ?? row.saving_percent ?? "0";
  const savingsPct = parseInt(savingsRaw, 10);
  let discountPercent: number | null = Number.isFinite(savingsPct) && savingsPct > 0 ? savingsPct : null;
  if (!discountPercent && priceOld) {
    discountPercent = Math.round((1 - priceCurrent / priceOld) * 100);
  }
  if (!priceOld) discountPercent = null;

  const inStock = parseInStock(row);

  return { priceCurrent, priceOld, discountPercent, inStock };
}

export function extractImages(row: Record<string, string>): string[] {
  const candidates = [
    row.merchant_image_url,
    row.large_image,
    row.aw_image_url,
    row.alternate_image,
    row.alternate_image_two,
    row.alternate_image_three,
    row.alternate_image_four,
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of candidates) {
    const v = raw?.trim();
    if (!v) continue;
    if (!/^https?:\/\//i.test(v)) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out.slice(0, 8);
}

function arraysEqualOrdered(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// ── Config de feeds disponibles según env ───────────────────────────────────

export function getFeeds(): FeedConfig[] {
  return [
    {
      storeName: "El Corte Inglés",
      storeMatcher: /corte\s*ingl[eé]s|elcorteingles|\beci\b/i,
      url: process.env.AWIN_FEED_URL_ECI,
    },
    {
      storeName: "Fnac",
      storeMatcher: /\bfnac\b/i,
      // Acepta AWIN_FEED_URL_FNAC explícito o AWIN_FEED_URL como fallback.
      url: process.env.AWIN_FEED_URL_FNAC ?? process.env.AWIN_FEED_URL,
    },
    {
      storeName: "LG",
      storeMatcher: /\blg\b/i,
      url: process.env.AWIN_FEED_URL_LG,
    },
  ];
}

/**
 * Resuelve una clave corta ("fnac", "eci", "lg") al `FeedConfig` correspondiente.
 * Devuelve null si no se encuentra.
 */
export function resolveFeed(key: string): FeedConfig | null {
  const norm = key.toLowerCase();
  for (const f of getFeeds()) {
    const target = f.storeName.toLowerCase();
    if (target.includes(norm) || target.split(" ").join("").includes(norm)) return f;
  }
  return null;
}

// ── Importador por tienda ───────────────────────────────────────────────────

export async function importStore(
  cfg: FeedConfig,
  opts: ImportOptions = {}
): Promise<ImportStats> {
  const log = opts.log ?? (() => {});
  const dryRun = opts.dryRun ?? false;
  const stats = EMPTY_STATS(cfg.storeName);

  if (!cfg.url) {
    stats.skipped = "no URL en env";
    log(`⏭️  ${cfg.storeName}: no URL en env, saltando`);
    return stats;
  }

  log(`\n📡 ${cfg.storeName}: descargando feed...`);

  // 1. Cargar nuestras ofertas de esa tienda y mapearlas por aw_product_id
  const ourOffers = await prisma.offer.findMany({
    where: { store: { contains: cfg.storeName.split(" ")[0], mode: "insensitive" } },
    include: { product: { select: { id: true, name: true, image: true, images: true } } },
  });

  const offersByAwId = new Map<string, (typeof ourOffers)[number]>();
  let urlMissing = 0;
  for (const o of ourOffers) {
    if (!cfg.storeMatcher.test(o.store)) continue;
    const id = extractAwProductId(o.externalUrl);
    if (!id) { urlMissing++; continue; }
    offersByAwId.set(id, o);
  }
  log(`   📦 ${offersByAwId.size} ofertas en BD (${urlMissing} sin aw_product_id en URL)`);

  if (offersByAwId.size === 0) {
    stats.skipped = "0 ofertas con URL de Awin";
    log(`   ⚠️  No hay ofertas con URL de Awin para ${cfg.storeName}; nada que actualizar`);
    return stats;
  }

  // 2. Streaming del feed
  const res = await fetch(cfg.url);
  if (!res.ok) {
    stats.skipped = `feed HTTP ${res.status}`;
    log(`❌ ${cfg.storeName}: feed HTTP ${res.status}`);
    return stats;
  }
  if (!res.body) {
    stats.skipped = "feed sin body";
    log(`❌ ${cfg.storeName}: feed sin body`);
    return stats;
  }

  // node:stream.Readable.fromWeb necesita un ReadableStream nativo.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = Readable.fromWeb(res.body as any)
    .pipe(createGunzip())
    .pipe(parse({
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      trim: true,
    }));

  // aw_product_ids vistos en este run del feed (de cualquier producto, no solo
  // los que hacen match con nuestras ofertas) → para detectar ofertas zombi.
  const seenAwIds = new Set<string>();

  for await (const rowRaw of stream) {
    stats.rowsRead++;
    if (stats.rowsRead % 50000 === 0) {
      log(`   …${stats.rowsRead} filas leídas, ${stats.matched} matches`);
    }

    const row = rowRaw as Record<string, string>;
    const awId = row.aw_product_id?.trim();
    if (!awId) continue;
    seenAwIds.add(awId);

    const offer = offersByAwId.get(awId);
    if (!offer) continue;
    stats.matched++;

    try {
      const computed = computeOfferUpdate(row);
      if (computed === null) continue;
      const { priceCurrent, priceOld, discountPercent, inStock } = computed;

      // Imágenes nuevas del feed (puede estar vacío si no las trae)
      const feedImages = extractImages(row);
      const currentImages = (offer.product.images ?? []) as string[];
      const mergedImages = feedImages.length > 0
        ? [...feedImages, ...currentImages.filter((u) => !feedImages.includes(u))].slice(0, 8)
        : currentImages;
      const imagesChanged =
        feedImages.length > 0 && !arraysEqualOrdered(currentImages, mergedImages);

      const before = {
        priceCurrent: offer.priceCurrent,
        priceOld: offer.priceOld,
        discountPercent: offer.discountPercent ?? null,
        inStock: offer.inStock,
      };
      const after = { priceCurrent, priceOld, discountPercent, inStock };

      const sameAll =
        before.priceCurrent === after.priceCurrent &&
        before.priceOld === after.priceOld &&
        (before.discountPercent ?? null) === (after.discountPercent ?? null) &&
        before.inStock === after.inStock &&
        !imagesChanged;

      if (sameAll) { stats.unchanged++; continue; }

      const priceMoved = before.priceCurrent !== after.priceCurrent;
      const stockMoved = before.inStock !== after.inStock;

      if (dryRun) {
        log(
          `🔎 ${offer.product.name.slice(0, 60)} :: ${before.priceCurrent}€ → ${priceCurrent}€` +
          `${priceOld ? ` (antes ${priceOld}€, -${discountPercent}%)` : ""}` +
          `${stockMoved ? ` · stock ${before.inStock}→${inStock}` : ""}` +
          `${imagesChanged ? ` · imgs ${currentImages.length}→${mergedImages.length}` : ""}`
        );
      } else {
        if (priceMoved) {
          const alreadyLogged = await prisma.priceHistory.findFirst({
            where: { productId: offer.productId, store: offer.store, price: before.priceCurrent },
          });
          if (!alreadyLogged) {
            await prisma.priceHistory.create({
              data: { productId: offer.productId, store: offer.store, price: before.priceCurrent },
            });
          }
        }

        await prisma.offer.update({
          where: { id: offer.id },
          data: { priceCurrent, priceOld, discountPercent, inStock },
        });

        if (imagesChanged) {
          await prisma.product.update({
            where: { id: offer.productId },
            data: {
              images: mergedImages,
              ...(offer.product.image ? {} : { image: mergedImages[0] }),
            },
          });
          stats.imagesUpdated++;
        }

        if (priceMoved) {
          await prisma.priceHistory.create({
            data: { productId: offer.productId, store: offer.store, price: priceCurrent },
          });
          stats.priceChanged++;
        }
        if (stockMoved) stats.stockChanged++;
      }

      stats.updated++;
    } catch (e: unknown) {
      stats.errors++;
      const msg = e instanceof Error ? e.message : String(e);
      log(`   ❌ ${offer.product.name.slice(0, 50)}: ${msg}`);
    }
  }

  // ── Barrido de ofertas zombi ────────────────────────────────────────────
  // Si una oferta lleva >STALE_DAYS sin verse en el feed y aún figura como
  // inStock=true, la marcamos agotada. Conservamos priceCurrent/priceOld
  // para historial; la UI debe atenuarlos cuando inStock es false.
  // Solo aplica si el feed nos llegó con un volumen razonable: un feed
  // truncado nos haría marcar zombies a todo el catálogo por error.
  const MIN_FEED_ROWS_FOR_SWEEP = 1000;
  if (stats.rowsRead >= MIN_FEED_ROWS_FOR_SWEEP) {
    const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
    const candidates: typeof ourOffers = [];
    for (const o of ourOffers) {
      if (!cfg.storeMatcher.test(o.store)) continue;
      const id = extractAwProductId(o.externalUrl);
      if (!id) continue;
      if (seenAwIds.has(id)) continue;
      if (!o.inStock) continue;
      if (o.updatedAt >= staleCutoff) continue;
      candidates.push(o);
    }

    if (candidates.length > 0) {
      if (dryRun) {
        log(`\n🧟 ${candidates.length} ofertas zombi (>${STALE_DAYS}d sin verse) — se marcarían agotadas:`);
        for (const c of candidates.slice(0, 10)) {
          log(`   - ${c.product.name.slice(0, 60)} (último visto ${c.updatedAt.toISOString().slice(0, 10)})`);
        }
        if (candidates.length > 10) log(`   …y ${candidates.length - 10} más`);
      } else {
        await prisma.offer.updateMany({
          where: { id: { in: candidates.map((c) => c.id) } },
          data: { inStock: false },
        });
      }
      stats.markedOutOfStock = candidates.length;
    }
  } else if (stats.rowsRead > 0) {
    log(`   ⚠️  feed con solo ${stats.rowsRead} filas (<${MIN_FEED_ROWS_FOR_SWEEP}): salto barrido de zombies por seguridad`);
  }

  log(`\n📊 ${cfg.storeName}:`);
  log(`   filas leídas:       ${stats.rowsRead}`);
  log(`   matches:            ${stats.matched}`);
  log(`   ${dryRun ? "habrían cambiado" : "actualizadas"}: ${stats.updated}`);
  log(`   sin cambios:        ${stats.unchanged}`);
  log(`   precio cambió:      ${stats.priceChanged}`);
  log(`   stock cambió:       ${stats.stockChanged}`);
  log(`   imágenes actualiz.: ${stats.imagesUpdated}`);
  if (stats.markedOutOfStock) log(`   zombies → agotadas: ${stats.markedOutOfStock}`);
  if (stats.errors) log(`   errores:            ${stats.errors}`);

  return stats;
}
