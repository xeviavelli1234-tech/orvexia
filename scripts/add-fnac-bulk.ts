/**
 * add-fnac-bulk.ts
 * Adds N products of a given category from the FNAC AWIN feed to the DB.
 * Prefers real discounts if feed has them; otherwise adds at current price.
 *
 * Usage:
 *   npx tsx scripts/add-fnac-bulk.ts LAVAVAJILLAS                 # dry-run, 20
 *   npx tsx scripts/add-fnac-bulk.ts LAVAVAJILLAS --confirm       # write
 *   npx tsx scripts/add-fnac-bulk.ts LAVAVAJILLAS --confirm --n=30
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

// feedMatches → merchant_category regex. nameMatches → product_name regex (more precise).
// excludes applies to name (to filter out unrelated products in same category).
const CATEGORY_MAP: Record<string, { enum: string; feedMatches: RegExp; nameMatches: RegExp; excludes?: RegExp }> = {
  TELEVISORES: { enum: "TELEVISORES", feedMatches: /televisor|tv |tele/i, nameMatches: /\btv\b|televisor/i },
  LAVADORAS: { enum: "LAVADORAS", feedMatches: /lavadora/i, nameMatches: /lavadora/i, excludes: /accesorios|secadora/i },
  LAVAVAJILLAS: { enum: "LAVAVAJILLAS", feedMatches: /lavavajillas/i, nameMatches: /lavavajillas/i, excludes: /fregadero|accesorios|grifo|detergente|pastilla|sal\b|cesta|cesto|rueda|tubo|bomba|filtro|brazo|repuesto|asp[ae]s/i },
  FRIGORIFICOS: { enum: "FRIGORIFICOS", feedMatches: /frigor[ií]fico|congelador/i, nameMatches: /frigor[ií]fico|congelador/i, excludes: /accesorios/i },
  SECADORAS: { enum: "SECADORAS", feedMatches: /secadora/i, nameMatches: /secadora/i, excludes: /accesorios/i },
  HORNOS: { enum: "HORNOS", feedMatches: /horno/i, nameMatches: /horno/i, excludes: /accesorios|microondas|bandeja/i },
  MICROONDAS: { enum: "MICROONDAS", feedMatches: /cocci[oó]n|cocina|microondas|hogar/i, nameMatches: /^microondas\b|\bmicroondas\s+(?:[a-z]+\s+)?(?:[A-Z0-9-]+)/i, excludes: /accesorios|plato|bandeja|filtro|repuesto|grill\s+para|palomitero|para\s+microondas|tapa|recipiente|olla|l[eé]kue/i },
  ASPIRADORAS: { enum: "ASPIRADORAS", feedMatches: /aspirador|aspiraci[oó]n|suelo|hogar/i, nameMatches: /\baspirador(?:a|as|es)?\b/i, excludes: /bolsa|filtro|accesorios|recambio|cepillo|manguera|tubo|para\s+aspirador|kit\s+aspirador|repuesto|boquilla|depósito|bateria\s+para/i },
  CAFETERAS: { enum: "CAFETERAS", feedMatches: /cafeter|caf[eé]|expresso/i, nameMatches: /cafetera/i, excludes: /c[aá]psula|caf[eé] molido|accesorios/i },
  AIRES_ACONDICIONADOS: { enum: "AIRES_ACONDICIONADOS", feedMatches: /aire|climatiz|ventilaci[oó]n|hogar|cocci/i, nameMatches: /aire\s+acondicionado|climatizador|split(?!.*cargador)|ping[uü]ino|pac\s+\w+|portát[íi]l\s+(?:fr[íi]o|aire)/i, excludes: /mando|accesor|para\s+aire|kit|filtro|recambio|tubo|ventilador|humidificador|deshumidificador|purificador|peque[nñ]o\s+electrodom/i },
};

function parseCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) { if (c === '"') { if (line[i+1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c; }
    else { if (c === '"') inQ = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c; }
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

async function main() {
  const catArg = (process.argv[2] || "").toUpperCase();
  const cfg = CATEGORY_MAP[catArg];
  if (!cfg) {
    console.error(`Categoría inválida. Usa una de: ${Object.keys(CATEGORY_MAP).join(", ")}`);
    process.exit(1);
  }
  const confirm = process.argv.includes("--confirm");
  const nArg = process.argv.find(a => a.startsWith("--n="));
  const target = nArg ? parseInt(nArg.split("=")[1], 10) : 20;

  const raw = zlib.gunzipSync(fs.readFileSync(FEED_PATH)).toString("utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const h = parseCsvLine(lines[0]);
  const col = (x: string) => h.indexOf(x);
  const idx = {
    aw: col("aw_product_id"), name: col("product_name"), brand: col("brand_name"),
    model: col("product_model"), mc: col("merchant_category"), price: col("search_price"),
    old: col("product_price_old"), aff: col("aw_deep_link"), img: col("large_image"),
    mimg: col("merchant_image_url"), alt: col("alternate_image"),
    desc: col("product_short_description"), ean: col("ean"),
  };

  type Row = {
    aw: string; name: string; brand: string; model: string; mc: string;
    price: number; priceOld: number | null; disc: number | null;
    aff: string; img: string; alt: string; desc: string; ean: string;
  };
  const all: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    const mc = c[idx.mc] || "";
    const name = c[idx.name] || "";
    if (!cfg.feedMatches.test(mc)) continue;
    if (!cfg.nameMatches.test(name)) continue;
    if (cfg.excludes && cfg.excludes.test(name)) continue;
    const price = n(c[idx.price]);
    if (!price) continue;
    const oldRaw = n(c[idx.old]);
    const priceOld = oldRaw != null && oldRaw > price ? oldRaw : null;
    const disc = priceOld ? Math.round(((priceOld - price) / priceOld) * 100) : null;
    all.push({
      aw: c[idx.aw], name: c[idx.name], brand: c[idx.brand] || "Sin marca",
      model: c[idx.model] || "", mc, price, priceOld, disc,
      aff: c[idx.aff], img: c[idx.img] || c[idx.mimg], alt: c[idx.alt],
      desc: c[idx.desc] || "", ean: c[idx.ean],
    });
  }

  const withDisc = all.filter(r => r.disc != null).sort((a, b) => (b.disc! - a.disc!));
  const noDisc = all.filter(r => r.disc == null);
  console.log(`Feed ${catArg}: ${all.length} items · con descuento real: ${withDisc.length}`);

  const existing = new Set((await prisma.product.findMany({
    where: { category: cfg.enum as any }, select: { slug: true },
  })).map(p => p.slug));

  const fnacExisting = await prisma.product.count({
    where: {
      category: cfg.enum as any,
      offers: { some: { store: { equals: "Fnac", mode: "insensitive" } } },
    },
  });
  const remaining = Math.max(0, target - fnacExisting);
  console.log(`En DB ya hay ${fnacExisting} FNAC ${catArg} · target total ${target} · a insertar: ${remaining}`);

  const pool = [...withDisc, ...noDisc];
  const picked: Row[] = [];
  for (const r of pool) {
    if (picked.length >= remaining) break;
    const slug = `fnac-${r.aw}-${slugify(r.name)}`;
    if (existing.has(slug)) continue;
    picked.push(r);
  }

  console.log(`\nSeleccionadas ${picked.length}/${target} (con descuento: ${picked.filter(p => p.disc != null).length}):`);
  for (const r of picked) {
    const tag = r.disc != null ? `-${r.disc}% ${r.price}€ (was ${r.priceOld}€)` : `${r.price}€`;
    console.log(`  ${tag} | ${r.brand} | ${r.name.slice(0, 70)}`);
  }

  if (!confirm) { console.log(`\nDRY RUN — pasa --confirm para insertar.`); return; }

  for (const r of picked) {
    const slug = `fnac-${r.aw}-${slugify(r.name)}`;
    const images = [r.img, r.alt]
      .filter(x => x && x.length > 0)
      .map(x => x.replace(/^http:\/\//, "https://"));
    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        slug, name: r.name, category: cfg.enum as any,
        brand: r.brand, model: r.model || r.aw,
        image: images[0], images,
        description: r.desc || null,
      },
    });
    await prisma.offer.upsert({
      where: { productId_store: { productId: product.id, store: "Fnac" } },
      update: {
        priceCurrent: r.price, priceOld: r.priceOld,
        discountPercent: r.disc, externalUrl: r.aff, inStock: true,
      },
      create: {
        productId: product.id, store: "Fnac",
        priceCurrent: r.price, priceOld: r.priceOld,
        discountPercent: r.disc, externalUrl: r.aff, inStock: true,
      },
    });
    await prisma.priceHistory.create({
      data: { productId: product.id, store: "Fnac", price: r.price },
    });
  }
  console.log(`\n✅ Insertadas ${picked.length} ${catArg} FNAC.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
