/**
 * import-awin-feed.ts
 * Sincroniza precios, descuento y stock de las ofertas afiliadas a Awin
 * (típicamente El Corte Inglés y Fnac) descargando los datafeeds oficiales.
 *
 * Variables de entorno requeridas:
 *   - DATABASE_URL              → conexión a Postgres
 *   - AWIN_FEED_URL_ECI         → URL completa del feed de ECI (con apikey)
 *   - AWIN_FEED_URL_FNAC        → URL completa del feed de Fnac (opcional)
 *
 * Uso:
 *   npx tsx scripts/import-awin-feed.ts          # actualiza ECI y Fnac si están definidos
 *   npx tsx scripts/import-awin-feed.ts eci      # solo ECI
 *   npx tsx scripts/import-awin-feed.ts fnac     # solo Fnac
 *   npx tsx scripts/import-awin-feed.ts --dry-run
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parse } from "csv-parse";
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  console.log("⏭️  no DATABASE_URL");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DRY_RUN = process.argv.includes("--dry-run");
const STORE_FILTER = process.argv.slice(2).find((a) => !a.startsWith("--"))?.toLowerCase();

type FeedConfig = {
  /** Nombre canónico del store en BD (ej. "El Corte Inglés", "Fnac") */
  storeName: string;
  /** Patrón para `Offer.store` (case-insensitive) */
  storeMatcher: RegExp;
  /** URL del feed con apikey */
  url: string | undefined;
};

const FEEDS: FeedConfig[] = [
  {
    storeName: "El Corte Inglés",
    storeMatcher: /corte\s*ingl[eé]s|elcorteingles|\beci\b/i,
    url: process.env.AWIN_FEED_URL_ECI,
  },
  {
    storeName: "Fnac",
    storeMatcher: /\bfnac\b/i,
    url: process.env.AWIN_FEED_URL_FNAC,
  },
];

// ── Utilidades ──────────────────────────────────────────────────────────────

function parsePrice(s: string | undefined): number | null {
  if (!s) return null;
  // El feed Awin trae números con punto decimal y a veces vienen como strings vacíos
  const n = parseFloat(s.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function parseInStock(row: Record<string, string>): boolean {
  // Awin trae varios campos relacionados — los consultamos en orden de fiabilidad
  const inStock = row.in_stock?.trim();
  const isForSale = row.is_for_sale?.trim();
  const stockStatus = row.stock_status?.trim().toLowerCase();
  const stockQty = parseInt(row.stock_quantity ?? "0", 10);

  if (inStock === "0") return false;
  if (isForSale === "0") return false;
  if (stockStatus && /agotad|sin stock|no disponible|out\s*of\s*stock/i.test(stockStatus)) return false;
  if (stockQty < 0) return false;

  // Si in_stock es "1" o presente en cualquier forma positiva
  return inStock === "1" || stockStatus === "" || /disponib|in\s*stock|available/i.test(stockStatus ?? "");
}

function extractAwProductId(externalUrl: string): string | null {
  // Awin URL: https://www.awin1.com/pclick.php?p=44372459927&a=2854543&m=77630
  const m = externalUrl.match(/[?&]p=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// ── Importador por tienda ───────────────────────────────────────────────────

async function importStore(cfg: FeedConfig) {
  if (!cfg.url) {
    console.log(`⏭️  ${cfg.storeName}: no URL en env, saltando`);
    return;
  }

  console.log(`\n📡 ${cfg.storeName}: descargando feed...`);

  // 1. Cargar nuestras ofertas de esa tienda y mapearlas por aw_product_id
  const ourOffers = await prisma.offer.findMany({
    where: { store: { contains: cfg.storeName.split(" ")[0], mode: "insensitive" } },
    include: { product: { select: { id: true, name: true } } },
  });

  const offersByAwId = new Map<string, (typeof ourOffers)[number]>();
  let urlMissing = 0;
  for (const o of ourOffers) {
    if (!cfg.storeMatcher.test(o.store)) continue;
    const id = extractAwProductId(o.externalUrl);
    if (!id) { urlMissing++; continue; }
    offersByAwId.set(id, o);
  }
  console.log(`   📦 ${offersByAwId.size} ofertas en BD (${urlMissing} sin aw_product_id en URL)`);

  if (offersByAwId.size === 0) {
    console.log(`   ⚠️  No hay ofertas con URL de Awin para ${cfg.storeName}; nada que actualizar`);
    return;
  }

  // 2. Streaming del feed
  const res = await fetch(cfg.url);
  if (!res.ok) {
    console.error(`❌ ${cfg.storeName}: feed HTTP ${res.status}`);
    return;
  }
  if (!res.body) {
    console.error(`❌ ${cfg.storeName}: feed sin body`);
    return;
  }

  const stream = Readable.fromWeb(res.body as any)
    .pipe(createGunzip())
    .pipe(parse({
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      trim: true,
    }));

  let rowsRead = 0;
  let matched = 0;
  let updated = 0;
  let unchanged = 0;
  let stockChanged = 0;
  let priceChanged = 0;
  let errors = 0;

  for await (const rowRaw of stream) {
    rowsRead++;
    if (rowsRead % 50000 === 0) console.log(`   …${rowsRead} filas leídas, ${matched} matches`);

    const row = rowRaw as Record<string, string>;
    const awId = row.aw_product_id?.trim();
    if (!awId) continue;

    const offer = offersByAwId.get(awId);
    if (!offer) continue;
    matched++;

    try {
      // Precio actual: search_price > store_price > display_price
      const priceCurrent =
        parsePrice(row.search_price) ??
        parsePrice(row.store_price) ??
        parsePrice(row.display_price);

      if (priceCurrent === null) {
        // No tenemos precio fiable — saltamos sin cambiar
        continue;
      }

      // Precio antiguo: rrp_price > product_price_old (solo si > priceCurrent)
      let priceOld: number | null = parsePrice(row.rrp_price) ?? parsePrice(row.product_price_old);
      if (priceOld !== null && priceOld <= priceCurrent) priceOld = null;

      // Descuento %
      const savingsPct = parseInt(row.savings_percent ?? "0", 10);
      let discountPercent: number | null = Number.isFinite(savingsPct) && savingsPct > 0 ? savingsPct : null;
      if (!discountPercent && priceOld) {
        discountPercent = Math.round((1 - priceCurrent / priceOld) * 100);
      }
      // Sanidad: si no hay priceOld, no tiene sentido un %
      if (!priceOld) discountPercent = null;

      const inStock = parseInStock(row);

      // Compara con BD
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
        before.inStock === after.inStock;

      if (sameAll) {
        unchanged++;
        continue;
      }

      const priceMoved = before.priceCurrent !== after.priceCurrent;
      const stockMoved = before.inStock !== after.inStock;

      if (DRY_RUN) {
        console.log(
          `🔎 ${offer.product.name.slice(0, 60)} :: ${before.priceCurrent}€ → ${priceCurrent}€` +
          `${priceOld ? ` (antes ${priceOld}€, -${discountPercent}%)` : ""}` +
          `${stockMoved ? ` · stock ${before.inStock}→${inStock}` : ""}`
        );
      } else {
        // Si cambia el precio, log en priceHistory (precio anterior si no estaba ya)
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

        if (priceMoved) {
          await prisma.priceHistory.create({
            data: { productId: offer.productId, store: offer.store, price: priceCurrent },
          });
          priceChanged++;
        }
        if (stockMoved) stockChanged++;
      }

      updated++;
    } catch (e: unknown) {
      errors++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`   ❌ ${offer.product.name.slice(0, 50)}: ${msg}`);
    }
  }

  console.log(`\n📊 ${cfg.storeName}:`);
  console.log(`   filas leídas:       ${rowsRead}`);
  console.log(`   matches:            ${matched}`);
  console.log(`   ${DRY_RUN ? "habrían cambiado" : "actualizadas"}: ${updated}`);
  console.log(`   sin cambios:        ${unchanged}`);
  console.log(`   precio cambió:      ${priceChanged}`);
  console.log(`   stock cambió:       ${stockChanged}`);
  if (errors) console.log(`   errores:            ${errors}`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  for (const cfg of FEEDS) {
    if (STORE_FILTER) {
      const target = cfg.storeName.toLowerCase();
      if (!target.includes(STORE_FILTER) && !target.split(" ").join("").includes(STORE_FILTER)) continue;
    }
    await importStore(cfg);
  }
  console.log("\n✅ Sincronización terminada");
}

main().catch((e) => { console.error("❌ fatal:", e); process.exit(1); }).finally(() => prisma.$disconnect());
