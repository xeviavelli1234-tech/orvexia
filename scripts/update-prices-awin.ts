/**
 * update-prices-awin.ts
 * Updates prices, old prices, discount and stock for offers of an AWIN store
 * (El Corte Inglés by default) from the AWIN product feed CSV.gz.
 *
 * Why: stores like El Corte Inglés sit behind Akamai and block scraping,
 * so we use the official affiliate feed instead. More precise, zero blocks.
 *
 * Usage:
 *   Local feed:
 *     npx tsx scripts/update-prices-awin.ts --feed=./eci.csv.gz
 *     npx tsx scripts/update-prices-awin.ts --store="El Corte Inglés" --feed=./eci.csv.gz
 *     npx tsx scripts/update-prices-awin.ts --feed=./eci.csv.gz --dry-run
 *
 *   Remote feed (AWIN publisher API):
 *     AWIN_API_KEY=xxx AWIN_ECI_FEED_ID=12345 npx tsx scripts/update-prices-awin.ts
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as zlib from "zlib";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.argv.includes("--dry-run");
const STORE =
  process.argv.find((a) => a.startsWith("--store="))?.split("=")[1] ??
  "El Corte Inglés";
const FEED_ARG = process.argv.find((a) => a.startsWith("--feed="))?.split("=")[1];

// same safety rail as scrape-prices.ts: ignore absurd price jumps
const MAX_PRICE_JUMP_RATIO = 3.0;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function toNumber(s: string | undefined): number | null {
  if (!s) return null;
  const v = parseFloat(s.replace(",", ".").replace(/[^\d.]/g, ""));
  return isFinite(v) ? v : null;
}

// Slugs for ECI offers follow: `eci-<aw_product_id>-<slugified-name>`.
// This extractor is resilient: it tries the slug prefix first, then falls back
// to a numeric id anywhere in the slug.
function extractAwIdFromSlug(slug: string): string | null {
  const m = slug.match(/^[a-z]+-(\d{4,})-/);
  if (m) return m[1];
  const m2 = slug.match(/-(\d{5,})-/);
  return m2 ? m2[1] : null;
}

async function loadFeedBuffer(): Promise<Buffer | null> {
  if (FEED_ARG) {
    if (!fs.existsSync(FEED_ARG)) {
      throw new Error(`Feed file not found: ${FEED_ARG}`);
    }
    return fs.readFileSync(FEED_ARG);
  }

  const apiKey = process.env.AWIN_API_KEY;
  const feedId = process.env.AWIN_ECI_FEED_ID;
  if (!apiKey || !feedId) {
    console.log(
      "No feed source configured (no --feed arg, no AWIN_API_KEY + AWIN_ECI_FEED_ID). Skipping."
    );
    return null;
  }

  const columns = [
    "aw_product_id",
    "product_name",
    "search_price",
    "product_price_old",
    "aw_deep_link",
    "in_stock",
    "stock_quantity",
  ].join(",");
  const url = `https://productdata.awin.com/datafeed/download/apikey/${apiKey}/language/es/fid/${feedId}/columns/${columns}/format/csv/compression/gzip/`;
  console.log(`Downloading feed from AWIN (fid=${feedId})...`);
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`AWIN feed download failed: HTTP ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

type FeedRow = {
  awId: string;
  price: number;
  priceOld: number | null;
  disc: number | null;
  deepLink: string;
  inStock: boolean;
};

function parseFeed(buf: Buffer): Map<string, FeedRow> {
  const raw = zlib.gunzipSync(buf).toString("utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) throw new Error("Empty feed");

  const header = parseCsvLine(lines[0]);
  const col = (x: string) => header.indexOf(x);
  const idx = {
    aw: col("aw_product_id"),
    price: col("search_price"),
    old: col("product_price_old"),
    link: col("aw_deep_link"),
    inStock: col("in_stock"),
    stockQty: col("stock_quantity"),
  };
  if (idx.aw < 0 || idx.price < 0) {
    throw new Error("Feed header missing required columns (aw_product_id, search_price)");
  }

  const map = new Map<string, FeedRow>();
  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    const awId = c[idx.aw];
    const price = toNumber(c[idx.price]);
    if (!awId || !price) continue;

    const oldRaw = idx.old >= 0 ? toNumber(c[idx.old]) : null;
    const priceOld = oldRaw != null && oldRaw > price ? oldRaw : null;
    const disc = priceOld ? Math.round(((priceOld - price) / priceOld) * 100) : null;

    // AWIN's `in_stock` is usually "1"/"0"/"yes"/"no". If column missing, assume true.
    let inStock = true;
    if (idx.inStock >= 0) {
      const v = (c[idx.inStock] || "").trim().toLowerCase();
      inStock = v === "1" || v === "yes" || v === "y" || v === "true" || v === "";
    }
    if (idx.stockQty >= 0) {
      const qty = toNumber(c[idx.stockQty]);
      if (qty != null && qty <= 0) inStock = false;
    }

    map.set(awId, {
      awId,
      price,
      priceOld,
      disc,
      deepLink: idx.link >= 0 ? c[idx.link] || "" : "",
      inStock,
    });
  }

  return map;
}

function calculateDiscountPercent(price: number, priceOld: number | null): number {
  if (!priceOld || priceOld <= price) return 0;
  return Math.round(((priceOld - price) / priceOld) * 100);
}

async function main() {
  console.log(
    `AWIN price updater${DRY_RUN ? " (dry-run)" : ""} | store="${STORE}"`
  );

  const buf = await loadFeedBuffer();
  if (!buf) return;
  const feed = parseFeed(buf);
  console.log(`Feed rows: ${feed.size}\n`);

  const offers = await prisma.offer.findMany({
    where: { store: { equals: STORE, mode: "insensitive" } },
    include: { product: { select: { slug: true, name: true } } },
  });
  console.log(`Offers in DB for "${STORE}": ${offers.length}\n`);

  let updated = 0;
  let unchanged = 0;
  let missing = 0;
  let ambiguous = 0;

  for (const offer of offers) {
    const label = `${offer.product.name.substring(0, 45)} [${offer.store}]`;
    const awId = extractAwIdFromSlug(offer.product.slug);

    if (!awId) {
      console.log(`  [skip] ${label}: cannot extract aw_product_id from slug "${offer.product.slug}"`);
      ambiguous++;
      continue;
    }

    const row = feed.get(awId);

    if (!row) {
      // Product not in the feed anymore. Mark as out of stock but keep it visible.
      if (offer.inStock) {
        console.log(`  [gone] ${label}: not in feed -> inStock false`);
        if (!DRY_RUN) {
          await prisma.offer.update({
            where: { id: offer.id },
            data: { inStock: false },
          });
        }
        missing++;
      } else {
        unchanged++;
      }
      continue;
    }

    const isOutlierPrice =
      row.price > offer.priceCurrent * MAX_PRICE_JUMP_RATIO ||
      row.price < offer.priceCurrent / MAX_PRICE_JUMP_RATIO;

    if (isOutlierPrice) {
      console.log(
        `  [warn] Outlier price - ${label}: feed ${row.price.toFixed(2)} EUR ignored (current ${offer.priceCurrent.toFixed(2)} EUR)`
      );
      unchanged++;
      continue;
    }

    const newPrice = row.price;
    const newPriceOld = row.priceOld;
    const newDiscount = calculateDiscountPercent(newPrice, newPriceOld);

    const priceChanged = Math.abs(newPrice - offer.priceCurrent) >= 0.01;
    const priceOldChanged = (newPriceOld ?? null) !== (offer.priceOld ?? null);
    const discountChanged = newDiscount !== (offer.discountPercent ?? 0);
    const stockChanged = row.inStock !== offer.inStock;
    // Refresh the deep link only if the feed provides one; AWIN rotates tracking params.
    const deepLinkChanged = row.deepLink.length > 0 && row.deepLink !== offer.externalUrl;

    if (!priceChanged && !priceOldChanged && !discountChanged && !stockChanged && !deepLinkChanged) {
      unchanged++;
      continue;
    }

    const changes: string[] = [];
    if (priceChanged) changes.push(`price ${offer.priceCurrent.toFixed(2)} -> ${newPrice.toFixed(2)} EUR`);
    if (priceOldChanged) changes.push(`priceOld ${offer.priceOld?.toFixed(2) ?? "null"} -> ${newPriceOld?.toFixed(2) ?? "null"} EUR`);
    if (discountChanged) changes.push(`discount ${offer.discountPercent ?? 0} -> ${newDiscount} %`);
    if (stockChanged) changes.push(`stock ${offer.inStock ? "in" : "out"} -> ${row.inStock ? "in" : "out"}`);
    if (deepLinkChanged) changes.push("deepLink refreshed");

    console.log(`  [chg] ${label}: ${changes.join(" | ")}`);

    if (!DRY_RUN) {
      await prisma.offer.update({
        where: { id: offer.id },
        data: {
          priceCurrent: newPrice,
          priceOld: newPriceOld,
          discountPercent: newDiscount,
          inStock: row.inStock,
          ...(deepLinkChanged ? { externalUrl: row.deepLink } : {}),
        },
      });

      if (priceChanged) {
        await prisma.priceHistory.create({
          data: { productId: offer.productId, store: offer.store, price: newPrice },
        });
      }
    }

    updated++;
  }

  console.log(
    `\nDone: ${updated} updated | ${unchanged} unchanged | ${missing} gone | ${ambiguous} skipped`
  );
  if (DRY_RUN) console.log("Dry-run mode: no DB changes were saved");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
