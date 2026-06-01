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
  /**
   * Claves de emparejamiento entre NUESTRA oferta (a partir de su externalUrl)
   * y las filas del feed. Por defecto se empareja solo por aw_product_id (el
   * `?p=` de la URL de afiliado). Fnac añade el ID de ficha (mp…/a…) porque sus
   * enlaces suelen ser `cread.php?ued=<url fnac>` SIN `?p=`, así que nunca
   * harían match solo por aw_product_id. Las claves van namespaced ("aw:" /
   * "fnac:") para que un id no colisione con otro espacio.
   */
  offerKeys?: (externalUrl: string) => string[];
  rowKeys?: (row: Record<string, string>) => string[];
  /**
   * Claves extra derivadas del PRODUCTO (no de su URL). Plan B para Fnac: la URL
   * suele ser `pclick.php?p=<aw_product_id>` sin la ficha, y el aw_product_id rota
   * con el tiempo dejando la oferta huérfana del feed. El merchant_product_id
   * "N-N" sí vive en `model`/`slug` de los productos importados del feed y da una
   * clave `fnac:` estable que rescata el emparejamiento.
   */
  productKeys?: (product: { model?: string | null; slug?: string | null }) => string[];
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
  // number_available: unidades disponibles (feed enriquecido). En el feed de
  // producción suele no venir; cuando viene, >0 es señal positiva de stock.
  const numAvail = parseInt(row.number_available ?? "", 10);

  // Señales negativas explícitas: mandan sobre cualquier señal positiva.
  if (inStock === "0") return false;
  if (isForSale === "0") return false;
  if (stockStatus && /agotad|sin stock|no disponible|out\s*of\s*stock/i.test(stockStatus)) return false;
  if (stockQty < 0) return false;

  // Señales positivas. Sin ninguna señal explícita asumimos agotado (defensivo,
  // para no mostrar precios stale como si estuvieran a la venta).
  return (
    inStock === "1" ||
    (Number.isFinite(numAvail) && numAvail > 0) ||
    stockStatus === "" ||
    /disponib|in\s*stock|available/i.test(stockStatus ?? "")
  );
}

export function extractAwProductId(externalUrl: string): string | null {
  // Awin URL: https://www.awin1.com/pclick.php?p=44372459927&a=2854543&m=77630
  const m = externalUrl.match(/[?&]p=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// ── Emparejamiento oferta ↔ fila del feed ────────────────────────────────────
// El feed se mapea contra nuestras ofertas por una o varias "claves". Cada clave
// va prefijada por su espacio ("aw:" / "fnac:") para que un aw_product_id no se
// confunda nunca con un id de ficha Fnac.

/** Clave por aw_product_id (todas las tiendas). Vacío si la URL no trae `?p=`. */
export function awKeysFromUrl(externalUrl: string): string[] {
  const id = extractAwProductId(externalUrl);
  return id ? [`aw:${id}`] : [];
}
export function awKeysFromRow(row: Record<string, string>): string[] {
  const id = row.aw_product_id?.trim();
  return id ? [`aw:${id}`] : [];
}

/**
 * Convierte el `merchant_product_id` del feed Fnac en el ID de ficha:
 *   "3-9543851"  → "mp9543851"  (marketplace, prefijo 3)
 *   "1-10003855" → "a10003855"  (venta directa Fnac, prefijo 1)
 * Cualquier otro prefijo se trata como venta directa ("a…").
 */
export function feedIdToFnacId(merchantProductId: string | undefined): string | null {
  const m = (merchantProductId ?? "").trim().match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  return `${m[1] === "3" ? "mp" : "a"}${m[2]}`;
}

/**
 * Extrae el ID de ficha Fnac (mp…/a…) de la URL de afiliado guardada en la
 * oferta, incluyendo los enlaces Awin `cread.php?…&ued=<url fnac codificada>`,
 * que son los que más usamos y que NO llevan `?p=`.
 */
export function fnacIdFromUrl(url: string): string | null {
  // 1) URL directa de Fnac: …fnac.es/mp9543851/… o /a10003855?…
  const direct = url.match(/fnac\.es\/(mp\d+|a\d+)(?:[/?#]|$)/i);
  if (direct) return direct[1].toLowerCase();

  // 2) Enlace Awin con la URL de Fnac en el parámetro `ued` (codificado)
  try {
    const ued = new URL(url).searchParams.get("ued");
    if (ued) {
      const m = decodeURIComponent(ued).match(/fnac\.es\/(mp\d+|a\d+)(?:[/?#]|$)/i);
      if (m) return m[1].toLowerCase();
    }
  } catch { /* URL no parseable: seguimos al caso 3 */ }

  // 3) Búsqueda en crudo por si `ued` viene sin parsear (fnac.es%2Fmp…%2F)
  const raw = url.match(/fnac\.es(?:%2F|\/)(mp\d+|a\d+)(?:%2F|\/|%3F|\?|$)/i);
  return raw ? raw[1].toLowerCase() : null;
}

/** Claves Fnac: aw_product_id (si lo hay) + ID de ficha Fnac. */
export function fnacKeysFromUrl(externalUrl: string): string[] {
  const keys = awKeysFromUrl(externalUrl);
  const fid = fnacIdFromUrl(externalUrl);
  if (fid) keys.push(`fnac:${fid}`);
  return keys;
}
export function fnacKeysFromRow(row: Record<string, string>): string[] {
  const keys = awKeysFromRow(row);
  const fid = feedIdToFnacId(row.merchant_product_id);
  if (fid) keys.push(`fnac:${fid}`);
  return keys;
}

/**
 * Deriva la clave de ficha Fnac (`fnac:mp…`/`fnac:a…`) desde el `model`/`slug`
 * del producto. Los productos importados del feed guardan ahí el
 * merchant_product_id "N-N" (p.ej. model `1-11990234`, o slug
 * `…-1-11990234-…`). Es el plan B cuando la URL de afiliado es
 * `pclick.php?p=<aw_product_id>` SIN la ficha: el aw_product_id rota y la oferta
 * se queda congelada; la ficha es estable y la reengancha al feed.
 *
 * El segundo grupo exige ≥6 dígitos (los artículos Fnac son largos) para no
 * confundir tokens como `75-75` (de «LG 75" 75QNED…») o `26-14` (de un modelo
 * con «14 servicios») con una ficha real.
 */
export function fnacKeysFromProduct(product: {
  model?: string | null;
  slug?: string | null;
}): string[] {
  for (const src of [product.model, product.slug]) {
    const m = (src ?? "").match(/(?:^|[^\d])([1-9]\d?)-(\d{6,})(?:[^\d]|$)/);
    if (m) {
      const fid = feedIdToFnacId(`${m[1]}-${m[2]}`);
      if (fid) return [`fnac:${fid}`];
    }
  }
  return [];
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
 * - Moneda: solo EUR. Si `currency` declara otra divisa, la fila se descarta.
 * - Precio actual: search_price > store_price > display_price ("EUR155.26")
 * - Precio antiguo: was_price > product_price_old > rrp_price (PVPR fabricante)
 * - Si el PVPR implica >25% descuento y no hay was_price del store, lo descartamos
 *   (suele ser PVP de lanzamiento ya obsoleto)
 * - Descuento: SIEMPRE se deriva de priceCurrent vs priceOld para que el badge
 *   cuadre con el precio tachado. El saving_percent (FNAC) / savings_percent
 *   (ECI) del feed se ignora: suele calcularse contra otra base (PVPR) e
 *   inflaba el descuento mostrado (p.ej. -33% sobre un tachado que solo da -23%)
 * - Si no hay priceOld, no hay descuento
 */
export function computeOfferUpdate(row: Record<string, string>): FeedRowComputed | null {
  // Solo ingerimos precios en euros. Si el feed declara otra divisa (algún
  // vendedor de marketplace podría hacerlo) descartamos la fila para no guardar
  // un importe en USD/GBP como si fuera €. Sin columna `currency` asumimos EUR.
  const currency = row.currency?.trim().toUpperCase();
  if (currency && currency !== "EUR") return null;

  const priceCurrent =
    parsePrice(row.search_price) ??
    parsePrice(row.store_price) ??
    // display_price llega como "EUR155.26": quitamos el código de moneda.
    parsePrice((row.display_price ?? "").replace(/[a-z]/gi, ""));

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

  // El descuento se deriva SIEMPRE del par priceCurrent/priceOld para que el
  // badge "-X%" cuadre con el precio tachado que mostramos. El saving_percent
  // (FNAC) / savings_percent (ECI) del feed se ignora a propósito: Fnac lo
  // calcula a menudo contra otra base (el PVPR del fabricante) y producía
  // badges inflados incoherentes con el tachado. Sin priceOld no hay descuento.
  let discountPercent: number | null = null;
  if (priceOld) {
    const computed = Math.round((1 - priceCurrent / priceOld) * 100);
    discountPercent = computed > 0 ? computed : null;
  }

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
      // Fnac empareja por ID de ficha (mp…/a…) además de aw_product_id, porque
      // sus enlaces son cread.php?ued=<url fnac> sin `?p=`. Y como plan B, la
      // ficha del model/slug del producto, para rescatar ofertas cuyo
      // aw_product_id ha rotado fuera del feed.
      offerKeys: fnacKeysFromUrl,
      rowKeys: fnacKeysFromRow,
      productKeys: fnacKeysFromProduct,
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

  // 1. Cargar nuestras ofertas de esa tienda e indexarlas por sus claves de match
  const ourOffers = await prisma.offer.findMany({
    where: { store: { contains: cfg.storeName.split(" ")[0], mode: "insensitive" } },
    include: { product: { select: { id: true, name: true, image: true, images: true, model: true, slug: true } } },
  });

  const offerKeysFn = cfg.offerKeys ?? awKeysFromUrl;
  const rowKeysFn = cfg.rowKeys ?? awKeysFromRow;
  // Claves de una oferta = las de su URL + las derivadas del producto (plan B Fnac).
  const keysForOffer = (o: (typeof ourOffers)[number]): string[] => [
    ...offerKeysFn(o.externalUrl),
    ...(cfg.productKeys?.(o.product) ?? []),
  ];

  // Una misma oferta puede indexarse por varias claves (p.ej. aw_product_id e
  // ID de ficha Fnac). offersByKey: clave → oferta; indexedOfferIds: para contar
  // ofertas distintas emparejables sin recontar claves.
  const offersByKey = new Map<string, (typeof ourOffers)[number]>();
  const indexedOfferIds = new Set<string>();
  let urlMissing = 0;
  for (const o of ourOffers) {
    if (!cfg.storeMatcher.test(o.store)) continue;
    const keys = keysForOffer(o);
    if (keys.length === 0) { urlMissing++; continue; }
    indexedOfferIds.add(o.id);
    for (const k of keys) if (!offersByKey.has(k)) offersByKey.set(k, o);
  }
  log(`   📦 ${indexedOfferIds.size} ofertas emparejables en BD (${urlMissing} sin clave de match)`);

  if (offersByKey.size === 0) {
    stats.skipped = "0 ofertas con clave de match";
    log(`   ⚠️  No hay ofertas emparejables para ${cfg.storeName}; nada que actualizar`);
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

  // Claves vistas en este run del feed (de cualquier producto, no solo los que
  // hacen match con nuestras ofertas) → para detectar ofertas zombi.
  const seenKeys = new Set<string>();

  for await (const rowRaw of stream) {
    stats.rowsRead++;
    if (stats.rowsRead % 50000 === 0) {
      log(`   …${stats.rowsRead} filas leídas, ${stats.matched} matches`);
    }

    const row = rowRaw as Record<string, string>;
    const keys = rowKeysFn(row);
    if (keys.length === 0) continue;
    for (const k of keys) seenKeys.add(k);

    let offer: (typeof ourOffers)[number] | undefined;
    for (const k of keys) {
      const found = offersByKey.get(k);
      if (found) { offer = found; break; }
    }
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
      const keys = keysForOffer(o);
      if (keys.length === 0) continue;
      if (keys.some((k) => seenKeys.has(k))) continue;
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
