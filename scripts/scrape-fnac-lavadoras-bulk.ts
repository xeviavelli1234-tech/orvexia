/**
 * scrape-fnac-lavadoras-bulk.ts
 *
 * Reads FNAC AWIN feed, takes every lavadora (MARKETPLACE_HOGAR),
 * scrapes fnac.es directly to find real discounts (priceOld > price),
 * and adds up to 20 of them to DB with full product data.
 *
 * Usage:
 *   npx tsx scripts/scrape-fnac-lavadoras-bulk.ts            # dry-run
 *   npx tsx scripts/scrape-fnac-lavadoras-bulk.ts --confirm  # write
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

const FEED_PATH = "C:/Users/xavie/Downloads/datafeed_2854543 (2).csv.gz";
const TARGET = 20;
const MAX_ATTEMPTS = 120;
const BATCH = 4;
const DELAY_MS = 900;
const CONFIRM = process.argv.includes("--confirm");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HEADERS: Record<string, string> = {
  "User-Agent": UA,
  "Accept-Language": "es-ES,es;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function parseCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') { if (line[i+1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur); return out;
}

function n(s: string): number | null {
  if (!s) return null;
  const v = parseFloat(s.replace(",", ".").replace(/[^\d.]/g, ""));
  return isFinite(v) ? v : null;
}

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

interface FeedRow {
  aw: string; name: string; brand: string; model: string; mc: string;
  price: number; priceOldFeed: number | null;
  affUrl: string; merchantUrl: string; largeImg: string; altImg: string;
  description: string; ean: string; mpn: string;
}

function loadLavadoras(): FeedRow[] {
  const raw = zlib.gunzipSync(fs.readFileSync(FEED_PATH)).toString("utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const h = parseCsvLine(lines[0]);
  const col = (x: string) => h.indexOf(x);
  const idx = {
    aw: col("aw_product_id"), name: col("product_name"), brand: col("brand_name"),
    model: col("product_model"), mc: col("merchant_category"), price: col("search_price"),
    old: col("product_price_old"), aff: col("aw_deep_link"), mer: col("merchant_deep_link"),
    img: col("large_image"), mimg: col("merchant_image_url"), alt: col("alternate_image"),
    desc: col("product_short_description"), ean: col("ean"), mpn: col("mpn"),
  };
  const out: FeedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    const mc = (c[idx.mc] || "").toLowerCase();
    if (!mc.includes("lavadora") || mc.includes("accesorios")) continue;
    const price = n(c[idx.price]);
    if (!price) continue;
    out.push({
      aw: c[idx.aw], name: c[idx.name], brand: c[idx.brand] || "Sin marca",
      model: c[idx.model] || "", mc: c[idx.mc], price, priceOldFeed: n(c[idx.old]),
      affUrl: c[idx.aff], merchantUrl: c[idx.mer],
      largeImg: c[idx.img] || c[idx.mimg], altImg: c[idx.alt],
      description: c[idx.desc] || "", ean: c[idx.ean], mpn: c[idx.mpn],
    });
  }
  return out;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS, redirect: "follow", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function parseFirstNumber(s: string): number | null {
  const m = s.match(/([\d]+(?:[.,]\d{1,2})?)/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(",", "."));
  return isFinite(v) ? v : null;
}

interface Scraped { price: number | null; priceOld: number | null; inStock: boolean; }

async function scrapeFnacPage(url: string): Promise<Scraped> {
  const html = await fetchHtml(url);
  const priceM = html.match(/itemprop="price"[^>]*content="([\d.]+)"/)
    || html.match(/"price"\s*:\s*"?([\d]+\.[\d]{2})"?/);
  const price = priceM ? parseFirstNumber(priceM[1]) : null;

  const oldM =
    html.match(/class="[^"]*f-priceBox-oldPrice[^"]*"[^>]*>([\d.,\s€]+)/) ||
    html.match(/"oldPrice"\s*:\s*"?([\d.]+)"?/) ||
    html.match(/class="[^"]*(?:old-price|strike|pvp)[^"]*"[^>]*>\s*([\d.,]+)/i);
  let priceOld = oldM ? parseFirstNumber(oldM[1]) : null;
  if (price && priceOld && priceOld <= price) priceOld = null;
  if (price && priceOld && priceOld > price * 4) priceOld = null; // garbage

  const avail = html.match(/"availability"\s*:\s*"([^"]+)"/)?.[1] ?? "";
  const inStock = avail ? /instock/i.test(avail) : /anadir al carrito|añadir al carrito/i.test(html);

  return { price, priceOld, inStock };
}

async function main() {
  const all = loadLavadoras();
  console.log(`Feed: ${all.length} lavadoras MARKETPLACE_HOGAR`);
  // shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  const existingSlugs = new Set(
    (await prisma.product.findMany({ where: { category: "LAVADORAS" }, select: { slug: true } })).map(p => p.slug)
  );

  const found: (FeedRow & { realPrice: number; realOld: number; disc: number; inStock: boolean })[] = [];
  let attempts = 0;

  for (let i = 0; i < all.length && found.length < TARGET && attempts < MAX_ATTEMPTS; i += BATCH) {
    const slice = all.slice(i, i + BATCH);
    const results = await Promise.allSettled(slice.map(async r => ({ r, s: await scrapeFnacPage(r.merchantUrl) })));
    for (const res of results) {
      attempts++;
      if (res.status !== "fulfilled") continue;
      const { r, s } = res.value;
      if (!s.price || !s.priceOld || s.priceOld <= s.price) continue;
      const disc = Math.round(((s.priceOld - s.price) / s.priceOld) * 100);
      if (disc < 5) continue;
      const slug = `fnac-${r.aw}-${slugify(r.name)}`;
      if (existingSlugs.has(slug)) continue;
      found.push({ ...r, realPrice: s.price, realOld: s.priceOld, disc, inStock: s.inStock });
      console.log(`✓ [${found.length}/${TARGET}] -${disc}% | ${s.price}€ (was ${s.priceOld}€) | ${r.brand} ${r.name.slice(0, 60)}`);
      if (found.length >= TARGET) break;
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\nEscaneadas ${attempts} URLs · ${found.length} encontradas con descuento real.`);

  if (!CONFIRM) {
    console.log(`\nDRY RUN — pasa --confirm para insertar en DB.`);
    return;
  }

  for (const f of found) {
    const slug = `fnac-${f.aw}-${slugify(f.name)}`;
    const images = [f.largeImg, f.altImg].filter(x => x && x.length > 0);
    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        slug, name: f.name, category: "LAVADORAS",
        brand: f.brand, model: f.model || f.aw,
        image: images[0], images,
        description: f.description || null,
      },
    });
    await prisma.offer.upsert({
      where: { productId_store: { productId: product.id, store: "Fnac" } },
      update: {
        priceCurrent: f.realPrice, priceOld: f.realOld,
        discountPercent: f.disc, externalUrl: f.affUrl, inStock: f.inStock,
      },
      create: {
        productId: product.id, store: "Fnac",
        priceCurrent: f.realPrice, priceOld: f.realOld,
        discountPercent: f.disc, externalUrl: f.affUrl, inStock: f.inStock,
      },
    });
    await prisma.priceHistory.create({
      data: { productId: product.id, store: "Fnac", price: f.realPrice },
    });
  }
  console.log(`\n✅ Insertadas ${found.length} lavadoras FNAC con descuento real.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
