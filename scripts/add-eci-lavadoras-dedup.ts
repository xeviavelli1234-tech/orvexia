/**
 * Añade N lavadoras nuevas de El Corte Inglés deduplicando por modelo.
 * El feed AWIN repite el mismo producto con distintos aw_product_id (varios
 * grados de reacondicionado), así que add-store-bulk inserta duplicados.
 *
 * Uso:
 *   npx tsx scripts/add-eci-lavadoras-dedup.ts --feed=... --n=5            # dry-run
 *   npx tsx scripts/add-eci-lavadoras-dedup.ts --feed=... --n=5 --confirm  # aplica
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as zlib from "zlib";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const STORE = "El Corte Inglés";
const STORE_SLUG = "eci";

const NAME_RX = /lavadora/i;
const EXCLUDE_RX = /accesorios|secadora|recambio|filtro|detergente|bolsa|tubo|para\s+lavadora/i;

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

// Extrae el código de modelo más probable: token alfanumérico con letras y dígitos, longitud >= 5.
function extractModel(name: string): string | null {
  const tokens = name.split(/[\s\-_/.,()]+/);
  let best: string | null = null;
  for (const t of tokens) {
    if (t.length < 5) continue;
    if (!/[a-zA-Z]/.test(t) || !/\d/.test(t)) continue;
    // Prefiere el más largo
    if (!best || t.length > best.length) best = t.toUpperCase();
  }
  return best;
}

type Row = {
  aw: string; name: string; brand: string; model: string;
  price: number; priceOld: number | null; disc: number | null;
  aff: string; img: string; alt: string; desc: string;
};

async function main() {
  const feedArg = process.argv.find(a => a.startsWith("--feed="))?.split("=")[1];
  const nArg = process.argv.find(a => a.startsWith("--n="));
  const target = nArg ? parseInt(nArg.split("=")[1], 10) : 5;
  const confirm = process.argv.includes("--confirm");
  if (!feedArg) { console.error("Usa --feed=<ruta.csv.gz>"); process.exit(1); }

  console.log(`Feed: ${feedArg}\nObjetivo: ${target} nuevas lavadoras únicas (por modelo)\n`);

  const raw = zlib.gunzipSync(fs.readFileSync(feedArg)).toString("utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const h = parseCsvLine(lines[0]);
  const col = (x: string) => h.indexOf(x);
  const idx = {
    aw: col("aw_product_id"), name: col("product_name"), brand: col("brand_name"),
    model: col("product_model"), price: col("search_price"),
    old: col("product_price_old"), aff: col("aw_deep_link"), img: col("large_image"),
    mimg: col("merchant_image_url"), alt: col("alternate_image"),
    desc: col("product_short_description"),
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
      model: c[idx.model] || "", price, priceOld, disc,
      aff: c[idx.aff], img: c[idx.img] || c[idx.mimg] || "", alt: c[idx.alt] || "",
      desc: c[idx.desc] || "",
    });
  }

  // 1) filtro categoría
  const lavadoras = rows.filter(r => NAME_RX.test(r.name) && !EXCLUDE_RX.test(r.name));
  console.log(`Feed lavadoras: ${lavadoras.length}`);

  // 2) modelos ya existentes en BD
  const existing = await prisma.product.findMany({
    where: {
      category: "LAVADORAS",
      offers: { some: { store: { equals: STORE, mode: "insensitive" } } },
    },
    select: { name: true, model: true },
  });
  const existingModels = new Set<string>();
  for (const p of existing) {
    const m = extractModel(p.name + " " + (p.model ?? ""));
    if (m) existingModels.add(m);
  }
  console.log(`Modelos ECI ya en BD: ${existingModels.size}`);

  // 3) dedup por modelo en el feed (mantener mayor descuento)
  const byModel = new Map<string, Row>();
  let noModel = 0;
  for (const r of lavadoras) {
    const m = extractModel(r.name + " " + r.model);
    if (!m) { noModel++; continue; }
    if (existingModels.has(m)) continue;
    const prev = byModel.get(m);
    if (!prev || (r.disc ?? 0) > (prev.disc ?? 0)) byModel.set(m, r);
  }
  console.log(`Modelos únicos no presentes: ${byModel.size} (descartados sin modelo: ${noModel})`);

  // 4) ordenar por descuento desc y tomar N
  const candidates = Array.from(byModel.values())
    .sort((a, b) => (b.disc ?? 0) - (a.disc ?? 0))
    .slice(0, target);

  console.log(`\nA insertar: ${candidates.length}`);
  for (const r of candidates) {
    const tag = r.disc != null ? `-${r.disc}% ${r.price}€` : `${r.price}€`;
    console.log(`  ${tag} | ${r.brand} | ${r.name.slice(0, 80)}`);
  }

  if (!confirm) { console.log("\n(dry-run, usa --confirm para aplicar)"); return; }

  for (const r of candidates) {
    const slug = `${STORE_SLUG}-${r.aw}-${slugify(r.name)}`;
    const images = [r.img, r.alt].filter(Boolean).map(x => x.replace(/^http:\/\//, "https://"));
    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        slug, name: r.name, category: "LAVADORAS",
        brand: r.brand, model: r.model || r.aw,
        image: images[0], images, description: r.desc || null,
      },
    });
    await prisma.offer.upsert({
      where: { productId_store: { productId: product.id, store: STORE } },
      update: { priceCurrent: r.price, priceOld: r.priceOld, discountPercent: r.disc, externalUrl: r.aff, inStock: true },
      create: { productId: product.id, store: STORE, priceCurrent: r.price, priceOld: r.priceOld, discountPercent: r.disc, externalUrl: r.aff, inStock: true },
    });
    await prisma.priceHistory.create({ data: { productId: product.id, store: STORE, price: r.price } });
    console.log(`✅ insertado: ${slug.slice(0, 80)}`);
  }
  console.log(`\n🎯 ${candidates.length} insertados`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
