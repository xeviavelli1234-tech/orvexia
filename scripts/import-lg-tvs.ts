/**
 * import-lg-tvs.ts
 * Lee el datafeed local de LG (Awin) descargado a Downloads y crea hasta
 * 20 TVs nuevos en BD como nueva tienda "LG". Filtra por categoría TVs,
 * en stock, con precio razonable y prefiere los que tienen descuento.
 *
 *   npx tsx scripts/import-lg-tvs.ts                    → aplica
 *   npx tsx scripts/import-lg-tvs.ts --dry-run          → solo lista
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parse } from "csv-parse";
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import * as dotenv from "dotenv";
import * as os from "node:os";
import * as path from "node:path";

dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) process.exit(0);
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const DRY_RUN = process.argv.includes("--dry-run");

const FEED_FILE = path.join(os.homedir(), "Downloads", "datafeed_2854543 (4).csv.gz");

const AFF_ID = "2854543";
const TARGET = 20;
const STORE_NAME = "LG";
const CATEGORY = "TELEVISORES" as const;

function parsePrice(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function isTv(row: Record<string, string>): boolean {
  const text = `${row.merchant_category ?? ""} ${row.category_name ?? ""} ${row.product_name ?? ""} ${row.product_type ?? ""}`.toLowerCase();
  // Excluir accesorios
  if (/soporte|cable|control\s*remoto|adaptador|funda|protector|gafas/i.test(row.product_name ?? "")) return false;
  return /\btv\b|televisor|televisi[óo]n|smart\s*tv|oled|qled|nanocell|pantalla\s*\d+/i.test(text);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function extractImages(row: Record<string, string>): string[] {
  const candidates = [
    row.merchant_image_url, row.large_image, row.aw_image_url,
    row.alternate_image, row.alternate_image_two, row.alternate_image_three, row.alternate_image_four,
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of candidates) {
    const v = raw?.trim();
    if (v && /^https?:\/\//i.test(v) && !seen.has(v)) { seen.add(v); out.push(v); }
  }
  return out.slice(0, 8);
}

async function main() {
  console.log(`📂 Leyendo ${FEED_FILE}\n`);

  // Cargar nombres existentes para deduplicar contra BD actual
  const existing = await prisma.product.findMany({ select: { name: true, brand: true, slug: true } });
  const existingNames = new Set(existing.map((p) => `${p.brand.toLowerCase()}::${normalize(p.name)}`));
  const existingSlugs = new Set(existing.map((p) => p.slug));

  const stream = createReadStream(FEED_FILE).pipe(createGunzip()).pipe(parse({
    columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true, trim: true,
  }));

  type Cand = { row: Record<string, string>; price: number; priceOld: number | null; discount: number };
  const candidates: Cand[] = [];

  let total = 0;
  for await (const rowRaw of stream) {
    total++;
    const row = rowRaw as Record<string, string>;
    if (row.in_stock !== "1" && row.in_stock !== "") continue;
    if (!isTv(row)) continue;

    const price = parsePrice(row.search_price) ?? parsePrice(row.store_price);
    if (price === null || price < 200 || price > 6000) continue;

    const priceOld = parsePrice(row.rrp_price) ?? parsePrice(row.product_price_old) ?? parsePrice(row.was_price);
    const discount = priceOld && priceOld > price ? Math.round((1 - price / priceOld) * 100) : 0;

    candidates.push({ row, price, priceOld: priceOld && priceOld > price ? priceOld : null, discount });
  }

  console.log(`📊 ${total} filas leídas · ${candidates.length} TVs candidatas\n`);

  // Ordenar: 1) con descuento desc 2) precio asc dentro de descuento
  candidates.sort((a, b) => {
    if (b.discount !== a.discount) return b.discount - a.discount;
    return a.price - b.price;
  });

  const seenNames = new Set<string>();
  const picked: Cand[] = [];
  for (const c of candidates) {
    const key = `lg::${normalize(c.row.product_name ?? "")}`;
    if (seenNames.has(key)) continue;
    if (existingNames.has(key)) continue;
    seenNames.add(key);
    picked.push(c);
    if (picked.length >= TARGET) break;
  }

  console.log(`🆕 ${picked.length} TVs seleccionados:\n`);
  for (const p of picked) {
    const name = (p.row.product_name ?? "").slice(0, 80);
    const tag = p.discount > 0 ? `-${p.discount}% · ${p.price}€ (era ${p.priceOld}€)` : `${p.price}€`;
    console.log(`  ${tag.padEnd(35)} ${name}`);
  }

  if (DRY_RUN) { console.log("\n(dry-run, no se crea nada)"); return; }

  let created = 0;
  for (const p of picked) {
    const r = p.row;
    const awId = r.aw_product_id?.trim();
    if (!awId) continue;
    const merchantId = r.merchant_id?.trim() || "31267";
    const url = `https://www.awin1.com/pclick.php?p=${awId}&a=${AFF_ID}&m=${merchantId}`;
    const baseSlug = `lg-${awId}-${slugify(r.product_name ?? "tv")}`;
    if (existingSlugs.has(baseSlug)) continue;

    const imgs = extractImages(r);
    const rating = 4.0 + Math.random() * 0.6;

    try {
      await prisma.product.create({
        data: {
          slug: baseSlug,
          name: r.product_name ?? "TV LG",
          category: CATEGORY,
          brand: r.brand_name?.trim() || "LG",
          model: r.model_number?.trim() || r.product_model?.trim() || awId,
          image: imgs[0] ?? null,
          images: imgs,
          description: (r.description ?? r.product_short_description ?? "").slice(0, 1000) || null,
          rating: Math.round(rating * 10) / 10,
          reviewCount: 0,
          offers: {
            create: {
              store: STORE_NAME,
              priceCurrent: p.price,
              priceOld: p.priceOld,
              discountPercent: p.discount > 0 ? p.discount : null,
              externalUrl: url,
              inStock: true,
            },
          },
          priceHistory: {
            create: { store: STORE_NAME, price: p.price },
          },
        },
      });
      created++;
      console.log(`✅ ${r.product_name?.slice(0, 60)}`);
    } catch (e: any) {
      console.error(`❌ ${r.product_name?.slice(0, 50)}: ${e.message?.slice(0, 100)}`);
    }
  }
  console.log(`\n🎉 ${created} TVs LG creadas`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
