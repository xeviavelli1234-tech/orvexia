/**
 * fix-eci-tv-urls.ts
 * Repara URLs de ofertas ECI que no tienen aw_product_id (?p=...) en su URL
 * (URLs antiguas tipo tidd.ly o cread.php). Busca cada producto en el feed
 * de Awin por nombre, marca o modelo, recupera el aw_product_id y reescribe
 * la URL en BD con formato pclick.php?p=...&a=...&m=...
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parse } from "csv-parse";
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) { console.log("no DATABASE_URL"); process.exit(0); }
if (!process.env.AWIN_FEED_URL_ECI) { console.log("no AWIN_FEED_URL_ECI"); process.exit(0); }

const DRY_RUN = process.argv.includes("--dry-run");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Affiliate ID (extraído de URLs Awin existentes)
const AWIN_AFFID = "2854543";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")  // sin acentos
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Extrae tokens de modelos: alfanuméricos que mezclan letras y dígitos
// (ej. TQ55S93F, 24TQ510S, 3TS3106B). Excluye palabras puras como
// "LAVADORA" o "TELEVISOR" que provocarían falsos matches por la categoría.
function extractModelTokens(name: string): string[] {
  const candidates = name.match(/\b[A-Z0-9-]{4,}\b/gi) ?? [];
  return candidates
    .map((t) => t.toUpperCase())
    .filter((t) => /[A-Z]/.test(t) && /[0-9]/.test(t));   // exige letra Y dígito
}

async function main() {
  // 1. Cargar ofertas ECI sin ?p= en URL
  const offers = await prisma.offer.findMany({
    where: { store: { contains: "Corte Inglés", mode: "insensitive" } },
    include: { product: { select: { id: true, name: true, slug: true, brand: true } } },
  });

  const broken = offers.filter((o) => !o.externalUrl.match(/[?&]p=([^&]+)/));
  console.log(`🔧 ${broken.length} ofertas ECI sin aw_product_id en URL\n`);
  if (broken.length === 0) { await prisma.$disconnect(); return; }

  for (const o of broken) {
    console.log(`  · ${o.product.brand} · ${o.product.name.slice(0, 70)}`);
    console.log(`    URL actual: ${o.externalUrl.slice(0, 90)}`);
  }

  // 2. Construir índice por modelos
  type Candidate = { brand: string; name: string; tokens: Set<string> };
  const byOffer = new Map<string, Candidate>();
  for (const o of broken) {
    byOffer.set(o.id, {
      brand: o.product.brand.toLowerCase(),
      name: normalize(o.product.name),
      tokens: new Set(extractModelTokens(o.product.name)),
    });
  }

  // 3. Stream del feed buscando matches
  console.log(`\n📡 Descargando feed ECI...`);
  const res = await fetch(process.env.AWIN_FEED_URL_ECI!);
  if (!res.ok || !res.body) throw new Error(`feed HTTP ${res.status}`);

  const stream = Readable.fromWeb(res.body as any)
    .pipe(createGunzip())
    .pipe(parse({ columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true, trim: true }));

  type Match = { awId: string; merchantId: string; rowName: string; score: number };
  const bestMatchByOffer = new Map<string, Match>();

  let rowsRead = 0;
  for await (const rowRaw of stream) {
    rowsRead++;
    if (rowsRead % 50000 === 0) console.log(`   …${rowsRead} filas leídas`);

    const row = rowRaw as Record<string, string>;
    const awId = row.aw_product_id?.trim();
    if (!awId) continue;

    const rowName = normalize(row.product_name ?? "");
    const rowBrand = (row.brand_name ?? "").toLowerCase();
    const rowModel = (row.model_number ?? row.product_model ?? "").toUpperCase().trim();

    const merchantId = row.merchant_id?.trim() ?? "13075"; // ECI por defecto

    for (const [offerId, c] of byOffer) {
      // c.tokens ya está filtrado: solo alfanuméricos que mezclan letras y
      // dígitos (modelos reales). Exigimos que al menos uno aparezca en el
      // model_number del feed o en el rowName.
      if (c.tokens.size === 0) continue;

      const modelHit =
        (rowModel && c.tokens.has(rowModel)) ||
        [...c.tokens].some((t) => rowName.includes(normalize(t)));
      if (!modelHit) continue;

      let score = 0;
      if (rowModel && c.tokens.has(rowModel)) score += 100;
      if (rowBrand && rowBrand.includes(c.brand)) score += 5;
      for (const tok of c.tokens) {
        if (rowName.includes(normalize(tok))) score += 30;
      }

      // Word overlap como tie-breaker
      const ourWords = new Set(c.name.split(/\s+/).filter((w) => w.length >= 4));
      const rowWords = new Set(rowName.split(/\s+/).filter((w) => w.length >= 4));
      const shared = [...ourWords].filter((w) => rowWords.has(w)).length;
      score += shared;

      const prev = bestMatchByOffer.get(offerId);
      if (!prev || score > prev.score) {
        bestMatchByOffer.set(offerId, { awId, merchantId, rowName, score });
      }
    }
  }

  console.log(`\n📊 ${rowsRead} filas leídas, ${bestMatchByOffer.size} matches encontrados\n`);

  // 4. Aplicar
  let fixed = 0;
  let notFound = 0;

  for (const o of broken) {
    const m = bestMatchByOffer.get(o.id);
    if (!m) {
      console.log(`✗ NO MATCH: ${o.product.name.slice(0, 70)}`);
      notFound++;
      continue;
    }

    const newUrl = `https://www.awin1.com/pclick.php?p=${m.awId}&a=${AWIN_AFFID}&m=${m.merchantId}`;
    console.log(`✓ score ${m.score}  ${o.product.name.slice(0, 60)}`);
    console.log(`     ↳ feed: ${m.rowName.slice(0, 80)}`);
    console.log(`     ↳ URL nueva: ${newUrl}`);

    if (!DRY_RUN) {
      await prisma.offer.update({ where: { id: o.id }, data: { externalUrl: newUrl } });
    }
    fixed++;
  }

  console.log(`\n🎯 ${fixed} URLs ${DRY_RUN ? "habrían sido" : ""} actualizadas, ${notFound} sin match`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
