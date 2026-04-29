/**
 * import-lg.ts
 * Importa productos LG desde el datafeed local (Awin) a una categoría
 * concreta. Crea hasta TARGET productos como tienda "LG".
 *
 *   npx tsx scripts/import-lg.ts televisores
 *   npx tsx scripts/import-lg.ts lavadoras
 *   npx tsx scripts/import-lg.ts frigorificos --target=15
 *   npx tsx scripts/import-lg.ts lavadoras --dry-run
 */
import { PrismaClient, Category } from "../app/generated/prisma/client";
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
const targetArg = process.argv.find((a) => a.startsWith("--target="));
const TARGET = targetArg ? parseInt(targetArg.replace("--target=", ""), 10) : 20;
const excludeArg = process.argv.find((a) => a.startsWith("--exclude-ids="));
const EXCLUDE_IDS = new Set(
  (excludeArg ? excludeArg.replace("--exclude-ids=", "") : "").split(",").filter(Boolean)
);
const catArg = (process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "").toLowerCase();

// aw_product_ids con imágenes 404 confirmadas en LG.com (la página oficial
// también las quitó). Se evitan automáticamente.
const KNOWN_BROKEN_IDS = new Set([
  "43474318728", // Outlet Lavadora 9kg 1400rpm Silver grafito Serie 100 F4A10S9NBK
  "43474318716", // Lavadora AI Direct Drive 20kg 1000rpm B Blanca F0P3CYV2W
  "43474318730", // Outlet Lavadora 9kg 1400rpm Blanca Serie 100 F4A1009NWK
  "43474319022", // Frigorífico Americano Side By side, Clasif. D, 635 L
  "43474318987", // Frigorífico American Combi Door-in-Door™, Clasif. E, 634 L
]);

const FEED_FILE = path.join(os.homedir(), "Downloads", "datafeed_2854543 (4).csv.gz");
const AFF_ID = "2854543";
const STORE_NAME = "LG";

// ── Configuración por categoría ─────────────────────────────────────────────
type CatConfig = {
  category: Category;
  matcher: RegExp;
  excluder?: RegExp;     // accesorios
  minPrice: number;
  maxPrice: number;
};

const CATEGORIES: Record<string, CatConfig> = {
  televisores: {
    category: "TELEVISORES",
    matcher: /\btv\b|televisor|televisi[óo]n|smart\s*tv|oled|qled|nanocell/i,
    excluder: /soporte|cable|control\s*remoto|adaptador|funda|protector|gafas/i,
    minPrice: 200, maxPrice: 6000,
  },
  lavadoras: {
    category: "LAVADORAS",
    matcher: /\blavadora\b|carga\s*frontal|carga\s*superior|washtower|torre\s*de\s*lavado/i,
    excluder: /\bsecadora\b|detergente|pack|accesorio|patas|repuesto|filtro/i,
    minPrice: 250, maxPrice: 3000,
  },
  frigorificos: {
    category: "FRIGORIFICOS",
    matcher: /frigor[íi]fico|combi|nevera|side\s*by\s*side|americano|french\s*door/i,
    excluder: /accesorio|repuesto|filtro|cubeta|bandeja/i,
    minPrice: 250, maxPrice: 5000,
  },
  lavavajillas: {
    category: "LAVAVAJILLAS",
    matcher: /lavavajillas/i,
    excluder: /accesorio|sal|abrillantador|detergente|pastilla/i,
    minPrice: 200, maxPrice: 2500,
  },
  secadoras: {
    category: "SECADORAS",
    // Requiere palabra "secadora" o "lavasecadora" explícita en el nombre.
    // El criterio "bomba de calor + kg" capturaba lavadoras por error.
    matcher: /\bsecadora\b|\blavasecadora\b/i,
    excluder: /\baccesorio\b|filtro|patas/i,
    minPrice: 250, maxPrice: 2500,
  },
  hornos: {
    category: "HORNOS",
    matcher: /\bhorno\b|pirol[íi]tico|catal[íi]tico/i,
    excluder: /accesorio|bandeja|guantes|gradilla/i,
    minPrice: 150, maxPrice: 3000,
  },
  microondas: {
    category: "MICROONDAS",
    matcher: /microondas/i,
    excluder: /accesorio|tapa|recipiente/i,
    minPrice: 50, maxPrice: 1000,
  },
  aspiradoras: {
    category: "ASPIRADORAS",
    matcher: /aspirador|robot.*aspirador|escoba.*sin\s*cable/i,
    excluder: /bolsa|filtro|cepillo|accesorio|repuesto/i,
    minPrice: 80, maxPrice: 1500,
  },
  aires: {
    category: "AIRES_ACONDICIONADOS",
    matcher: /aire\s*acondicionado|split|inverter.*frig/i,
    excluder: /accesorio|control\s*remoto|filtro/i,
    minPrice: 200, maxPrice: 3000,
  },
};

if (!CATEGORIES[catArg]) {
  console.error(`❌ Categoría inválida: "${catArg}"\nOpciones: ${Object.keys(CATEGORIES).join(", ")}`);
  process.exit(1);
}
const CFG = CATEGORIES[catArg];

// ── Helpers ─────────────────────────────────────────────────────────────────
function parsePrice(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function matchesCategory(row: Record<string, string>): boolean {
  const text = `${row.merchant_category ?? ""} ${row.category_name ?? ""} ${row.product_name ?? ""} ${row.product_type ?? ""}`.toLowerCase();
  if (CFG.excluder && CFG.excluder.test(row.product_name ?? "")) return false;
  return CFG.matcher.test(text);
}

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
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
  console.log(`📂 Categoría: ${CFG.category} · objetivo: ${TARGET} productos\n`);

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
    if (!matchesCategory(row)) continue;
    const awId = row.aw_product_id?.trim() ?? "";
    if (KNOWN_BROKEN_IDS.has(awId) || EXCLUDE_IDS.has(awId)) continue;

    const price = parsePrice(row.search_price) ?? parsePrice(row.store_price);
    if (price === null || price < CFG.minPrice || price > CFG.maxPrice) continue;

    const priceOld = parsePrice(row.rrp_price) ?? parsePrice(row.product_price_old) ?? parsePrice(row.was_price);
    const discount = priceOld && priceOld > price ? Math.round((1 - price / priceOld) * 100) : 0;

    candidates.push({ row, price, priceOld: priceOld && priceOld > price ? priceOld : null, discount });
  }

  console.log(`📊 ${total} filas leídas · ${candidates.length} candidatos\n`);

  candidates.sort((a, b) => {
    if (b.discount !== a.discount) return b.discount - a.discount;
    return a.price - b.price;
  });

  const seenNames = new Set<string>();
  const picked: Cand[] = [];
  for (const c of candidates) {
    const key = `lg::${normalize(c.row.product_name ?? "")}`;
    if (seenNames.has(key) || existingNames.has(key)) continue;
    seenNames.add(key);
    picked.push(c);
    if (picked.length >= TARGET) break;
  }

  console.log(`🆕 ${picked.length} ${CFG.category} seleccionados:\n`);
  for (const p of picked) {
    const tag = p.discount > 0 ? `-${p.discount}% · ${p.price}€ (era ${p.priceOld}€)` : `${p.price}€`;
    console.log(`  ${tag.padEnd(35)} ${(p.row.product_name ?? "").slice(0, 80)}`);
  }

  if (DRY_RUN) { console.log("\n(dry-run)"); return; }

  let created = 0;
  for (const p of picked) {
    const r = p.row;
    const awId = r.aw_product_id?.trim();
    if (!awId) continue;
    const merchantId = r.merchant_id?.trim() || "31267";
    const url = `https://www.awin1.com/pclick.php?p=${awId}&a=${AFF_ID}&m=${merchantId}`;
    const baseSlug = `lg-${awId}-${slugify(r.product_name ?? "lg-producto")}`;
    if (existingSlugs.has(baseSlug)) continue;

    const imgs = extractImages(r);
    const rating = 4.0 + Math.random() * 0.6;

    try {
      await prisma.product.create({
        data: {
          slug: baseSlug,
          name: r.product_name ?? "Producto LG",
          category: CFG.category,
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
          priceHistory: { create: { store: STORE_NAME, price: p.price } },
        },
      });
      created++;
      console.log(`✅ ${r.product_name?.slice(0, 60)}`);
    } catch (e: any) {
      console.error(`❌ ${r.product_name?.slice(0, 50)}: ${e.message?.slice(0, 100)}`);
    }
  }
  console.log(`\n🎉 ${created} ${CFG.category} LG creados`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
