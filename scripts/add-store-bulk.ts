/**
 * add-store-bulk.ts
 * Adds N products per category from any AWIN feed (FNAC, El Corte Inglés, ...) to DB.
 *
 * Usage:
 *   npx tsx scripts/add-store-bulk.ts --store=Fnac --feed="C:/.../fnac.csv.gz" LAVAVAJILLAS --confirm
 *   npx tsx scripts/add-store-bulk.ts --store="El Corte Inglés" --feed="C:/.../eci.csv.gz" --all --confirm
 *   npx tsx scripts/add-store-bulk.ts --store=ECI --feed=... TELEVISORES --n=30
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

const CATEGORY_MAP: Record<string, { enum: string; nameMatches: RegExp; excludes?: RegExp }> = {
  TELEVISORES: { enum: "TELEVISORES", nameMatches: /\btv\b|televisor|televisi[oó]n\b/i, excludes: /soporte|mando|cable|antena|recambio|para\s+tv/i },
  LAVADORAS: { enum: "LAVADORAS", nameMatches: /lavadora/i, excludes: /accesorios|secadora|recambio|filtro|detergente|bolsa|tubo|para\s+lavadora/i },
  LAVAVAJILLAS: { enum: "LAVAVAJILLAS", nameMatches: /lavavajillas/i, excludes: /fregadero|accesorios|grifo|detergente|pastilla|sal\b|cesta|cesto|rueda|tubo|bomba|filtro|brazo|repuesto|asp[ae]s|para\s+lavavajillas/i },
  FRIGORIFICOS: { enum: "FRIGORIFICOS", nameMatches: /frigor[ií]fico|congelador|nevera|combi\b/i, excludes: /accesorios|bandeja|estante|recambio|filtro|para\s+frigor/i },
  SECADORAS: { enum: "SECADORAS", nameMatches: /secadora/i, excludes: /accesorios|filtro|recambio|pelo|mano|para\s+secadora/i },
  HORNOS: { enum: "HORNOS", nameMatches: /\bhorno/i, excludes: /accesorios|microondas|bandeja|guante|para\s+horno|mitón/i },
  MICROONDAS: { enum: "MICROONDAS", nameMatches: /\bmicroondas\b/i, excludes: /accesorios|plato|bandeja|filtro|repuesto|grill\s+para|palomitero|para\s+microondas|tapa|recipiente|olla|l[eé]kue/i },
  ASPIRADORAS: { enum: "ASPIRADORAS", nameMatches: /\baspirador(?:a|as|es)?\b|\brobot\s+aspirador/i, excludes: /bolsa|filtro|accesorios|recambio|cepillo|manguera|tubo|para\s+aspirador|kit\s+aspirador|repuesto|boquilla|dep[oó]sito|bater[ií]a\s+para/i },
  CAFETERAS: { enum: "CAFETERAS", nameMatches: /cafetera/i, excludes: /c[aá]psula|caf[eé]\s+molido|accesorios|filtro|recambio|para\s+cafetera|jarra\s+para/i },
  AIRES_ACONDICIONADOS: { enum: "AIRES_ACONDICIONADOS", nameMatches: /aire\s+acondicionado|climatizador|split(?!.*cargador)|ping[uü]ino|portát[íi]l\s+(?:fr[íi]o|aire)/i, excludes: /mando|accesor|para\s+aire|kit|filtro|recambio|tubo|ventilador|humidificador|deshumidificador|purificador/i },
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

type Row = {
  aw: string; name: string; brand: string; model: string; mc: string;
  price: number; priceOld: number | null; disc: number | null;
  aff: string; img: string; alt: string; desc: string; ean: string;
};

async function processCategory(
  catKey: string, feed: Row[], storeName: string, storeSlug: string, target: number, confirm: boolean
) {
  const cfg = CATEGORY_MAP[catKey];
  if (!cfg) return { cat: catKey, inserted: 0, skip: "no config" };

  const matching = feed.filter(r => cfg.nameMatches.test(r.name) && !(cfg.excludes && cfg.excludes.test(r.name)));
  const withDisc = matching.filter(r => r.disc != null).sort((a, b) => (b.disc! - a.disc!));
  const noDisc = matching.filter(r => r.disc == null);

  const existing = new Set((await prisma.product.findMany({
    where: { category: cfg.enum as any }, select: { slug: true },
  })).map(p => p.slug));

  const storeExisting = await prisma.product.count({
    where: {
      category: cfg.enum as any,
      offers: { some: { store: { equals: storeName, mode: "insensitive" } } },
    },
  });
  const remaining = Math.max(0, target - storeExisting);

  const pool = [...withDisc, ...noDisc];
  const picked: Row[] = [];
  for (const r of pool) {
    if (picked.length >= remaining) break;
    const slug = `${storeSlug}-${r.aw}-${slugify(r.name)}`;
    if (existing.has(slug)) continue;
    picked.push(r);
  }

  console.log(`\n[${catKey}] feed:${matching.length} · descuentos:${withDisc.length} · existentes ${storeName}:${storeExisting} · a insertar:${picked.length}`);
  for (const r of picked.slice(0, 5)) {
    const tag = r.disc != null ? `-${r.disc}% ${r.price}€` : `${r.price}€`;
    console.log(`  ${tag} | ${r.brand} | ${r.name.slice(0, 65)}`);
  }
  if (picked.length > 5) console.log(`  ... y ${picked.length - 5} más`);

  if (!confirm) return { cat: catKey, inserted: 0, skip: "dry-run" };

  for (const r of picked) {
    const slug = `${storeSlug}-${r.aw}-${slugify(r.name)}`;
    const images = [r.img, r.alt].filter(x => x && x.length > 0).map(x => x.replace(/^http:\/\//, "https://"));
    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        slug, name: r.name, category: cfg.enum as any,
        brand: r.brand, model: r.model || r.aw,
        image: images[0], images, description: r.desc || null,
      },
    });
    await prisma.offer.upsert({
      where: { productId_store: { productId: product.id, store: storeName } },
      update: { priceCurrent: r.price, priceOld: r.priceOld, discountPercent: r.disc, externalUrl: r.aff, inStock: true },
      create: { productId: product.id, store: storeName, priceCurrent: r.price, priceOld: r.priceOld, discountPercent: r.disc, externalUrl: r.aff, inStock: true },
    });
    await prisma.priceHistory.create({
      data: { productId: product.id, store: storeName, price: r.price },
    });
  }
  return { cat: catKey, inserted: picked.length };
}

async function main() {
  const storeArg = process.argv.find(a => a.startsWith("--store="))?.split("=")[1];
  const feedArg = process.argv.find(a => a.startsWith("--feed="))?.split("=")[1];
  if (!storeArg || !feedArg) {
    console.error("Usa --store=... --feed=<ruta.csv.gz>");
    process.exit(1);
  }
  const confirm = process.argv.includes("--confirm");
  const all = process.argv.includes("--all");
  const nArg = process.argv.find(a => a.startsWith("--n="));
  const target = nArg ? parseInt(nArg.split("=")[1], 10) : 20;

  // storeSlug: "El Corte Inglés" -> "eci", "Fnac" -> "fnac"
  const slugMap: Record<string, string> = { "El Corte Inglés": "eci", "El Corte Ingles": "eci", ECI: "eci", Fnac: "fnac" };
  const storeSlug = slugMap[storeArg] ?? slugify(storeArg);

  // positional category arg (only if not --all)
  const positional = process.argv.slice(2).filter(a => !a.startsWith("-"));
  const catArg = all ? null : (positional[0] || "").toUpperCase();

  console.log(`Store: "${storeArg}" · slug prefix: "${storeSlug}-"`);
  console.log(`Feed: ${feedArg}`);

  const raw = zlib.gunzipSync(fs.readFileSync(feedArg)).toString("utf8");
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

  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    const price = n(c[idx.price]);
    if (!price) continue;
    const oldRaw = n(c[idx.old]);
    const priceOld = oldRaw != null && oldRaw > price ? oldRaw : null;
    const disc = priceOld ? Math.round(((priceOld - price) / priceOld) * 100) : null;
    rows.push({
      aw: c[idx.aw], name: c[idx.name] || "", brand: c[idx.brand] || "Sin marca",
      model: c[idx.model] || "", mc: c[idx.mc] || "",
      price, priceOld, disc,
      aff: c[idx.aff], img: c[idx.img] || c[idx.mimg] || "", alt: c[idx.alt] || "",
      desc: c[idx.desc] || "", ean: c[idx.ean] || "",
    });
  }
  console.log(`Feed total: ${rows.length} rows`);

  const cats = all ? Object.keys(CATEGORY_MAP) : [catArg!];
  const summary: { cat: string; inserted: number; skip?: string }[] = [];
  for (const c of cats) {
    const res = await processCategory(c, rows, storeArg, storeSlug, target, confirm);
    summary.push(res);
  }

  console.log("\n═══ Resumen ═══");
  for (const s of summary) console.log(`  ${s.cat}: ${s.inserted}${s.skip ? ` (${s.skip})` : ""}`);
  console.log(`Total insertado: ${summary.reduce((a, b) => a + b.inserted, 0)}${confirm ? "" : " · DRY RUN"}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
