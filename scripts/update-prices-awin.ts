/**
 * update-prices-awin.ts
 * Sincroniza precios, stock, deeplinks y datos de producto desde un feed AWIN.
 *
 * Pipeline:
 *   1. Streaming parse del .csv.gz con csv-parse (soporta multilínea y escapes correctamente).
 *   2. Validación de cada fila con zod (precio numérico, aw_id no vacío, etc.).
 *   3. Si más del MAX_INVALID_RATIO de filas son inválidas → abortar (feed corrupto).
 *   4. Construcción del plan de cambios sobre las offers existentes en BD.
 *   5. Escritura en transacciones chunked (atomicidad por lote).
 *
 * Matching: aw_product_id codificado en el slug por add-store-bulk.ts
 *   slug = `${storeSlug}-${aw_product_id}-${slug(name)}`
 *
 * Uso:
 *   npx tsx scripts/update-prices-awin.ts --store="El Corte Inglés" --feed=./eci.csv.gz --dry-run
 *   npx tsx scripts/update-prices-awin.ts --store=Fnac --feed=./fnac.csv.gz --refresh-products
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import { parse } from "csv-parse";
import { z } from "zod";
import * as dotenv from "dotenv";
import * as zlib from "zlib";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

// guardas alineadas con scrape-prices.ts
const MAX_DISCOUNT_RATIO = 2.1;
const MAX_PRICE_JUMP_RATIO = 3.0;
// si más de este % de filas del feed son inválidas → abortar sin tocar BD
const MAX_INVALID_RATIO = 0.05;
// tamaño de lote por transacción Prisma (offers.update + priceHistory.create cuentan como 2 ops)
const TX_BATCH_SIZE = 50;

// ─── parsers ──────────────────────────────────────────────────────────────────

/** "229.0 EUR" / "EUR229.0" / "1.299,99 €" / "11.99" → number | null */
function parsePrice(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/EUR|USD|GBP|€|\$|£/gi, "").trim();
  if (!cleaned) return null;
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;
  if (hasComma && hasDot) {
    normalized = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    normalized = /,\d{1,2}$/.test(cleaned) ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (hasDot) {
    normalized = /\.\d{1,2}$/.test(cleaned) ? cleaned : cleaned.replace(/\./g, "");
  }
  const v = Number.parseFloat(normalized);
  return Number.isFinite(v) && v > 0 && v < 100_000 ? v : null;
}

function parseIntegerSafe(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const v = Number.parseInt(String(raw).replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(v) ? v : null;
}

function parseFloatSafe(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const v = Number.parseFloat(String(raw).replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(v) && v >= 0 ? v : null;
}

// ─── schemas ──────────────────────────────────────────────────────────────────

const PriceField = z.string().transform((s, ctx) => {
  const v = parsePrice(s);
  if (v === null) { ctx.addIssue({ code: "custom", message: `precio inválido: "${s}"` }); return z.NEVER; }
  return v;
});

const FeedRowSchema = z.object({
  aw_product_id: z.string().trim().min(1, "aw_product_id vacío"),
  merchant_product_id: z.string().trim().optional().default(""),
  search_price: PriceField,
  product_price_old: z.string().trim().optional().default("").transform(parsePrice),
  savings_percent: z.string().optional().default("").transform(parseIntegerSafe),
  in_stock: z.string().optional().default("1").transform(s => parseIntegerSafe(s) !== 0),
  aw_deep_link: z.string().trim().optional().default(""),
  merchant_deep_link: z.string().trim().optional().default(""),
  merchant_image_url: z.string().trim().optional().default(""),
  aw_image_url: z.string().trim().optional().default(""),
  large_image: z.string().trim().optional().default(""),
  alternate_image: z.string().trim().optional().default(""),
  average_rating: z.string().optional().default("").transform(parseFloatSafe),
  reviews: z.string().optional().default("").transform(parseIntegerSafe),
});

const ArgsSchema = z.object({
  store: z.string().min(1),
  feed: z.string().min(1),
  dryRun: z.boolean(),
  refreshProducts: z.boolean(),
});

// ─── helpers ──────────────────────────────────────────────────────────────────

function sanitizePriceOld(price: number, priceOld: number | null): number | null {
  if (!priceOld || priceOld <= price) return null;
  return priceOld / price <= MAX_DISCOUNT_RATIO ? priceOld : null;
}

function calcDiscount(price: number, priceOld: number | null): number {
  if (!priceOld) return 0;
  return Math.max(0, Math.round((1 - price / priceOld) * 100));
}

function pickImage(merchant: string, aw: string, large: string, alt: string): string | null {
  return (merchant || large || alt || aw || "").replace(/^http:\/\//, "https://") || null;
}

function parseArgs() {
  const get = (k: string) => process.argv.find(a => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
  return ArgsSchema.parse({
    store: get("store") ?? "",
    feed: get("feed") ?? "",
    dryRun: process.argv.includes("--dry-run"),
    refreshProducts: process.argv.includes("--refresh-products"),
  });
}

// ─── tipos del plan ───────────────────────────────────────────────────────────

type FeedEntry = {
  aw: string; ean: string; price: number; priceOld: number | null;
  inStock: boolean; affLink: string; image: string | null;
  rating: number | null; reviews: number | null;
};

type OfferPatch = {
  offerId: string; productId: string; store: string; label: string;
  data: { priceCurrent: number; priceOld: number | null; discountPercent: number; inStock: boolean; externalUrl?: string };
  priceChanged: boolean; newPrice: number;
};

type ProductPatch = {
  productId: string; label: string;
  data: { image?: string; rating?: number; reviewCount?: number };
};

// ─── pipeline ─────────────────────────────────────────────────────────────────

async function ingestFeed(feedPath: string): Promise<{ feed: Map<string, FeedEntry>; total: number; invalid: number }> {
  const stream = fs.createReadStream(feedPath)
    .pipe(feedPath.endsWith(".gz") ? zlib.createGunzip() : new (require("stream").PassThrough)())
    .pipe(parse({
      columns: true,
      relax_quotes: true,
      relax_column_count: true,
      skip_empty_lines: true,
      bom: true,
    }));

  const feed = new Map<string, FeedEntry>();
  let total = 0, invalid = 0;
  const sampleErrors: string[] = [];

  for await (const raw of stream) {
    total++;
    const result = FeedRowSchema.safeParse(raw);
    if (!result.success) {
      invalid++;
      if (sampleErrors.length < 5) {
        const issue = result.error.issues[0];
        sampleErrors.push(`fila ${total} aw=${raw.aw_product_id ?? "?"}: ${issue.path.join(".")} → ${issue.message}`);
      }
      continue;
    }
    const r = result.data;
    feed.set(r.aw_product_id, {
      aw: r.aw_product_id,
      ean: r.merchant_product_id,
      price: r.search_price,
      priceOld: r.product_price_old && r.product_price_old > r.search_price ? r.product_price_old : null,
      inStock: r.in_stock,
      affLink: r.aw_deep_link || r.merchant_deep_link,
      image: pickImage(r.merchant_image_url, r.aw_image_url, r.large_image, r.alternate_image),
      rating: r.average_rating,
      reviews: r.reviews,
    });
  }

  if (sampleErrors.length) {
    console.log("Muestra de filas inválidas:");
    for (const e of sampleErrors) console.log(`  · ${e}`);
    console.log();
  }
  return { feed, total, invalid };
}

function buildPlan(
  offers: Awaited<ReturnType<typeof loadOffers>>,
  feed: Map<string, FeedEntry>,
  refreshProducts: boolean,
) {
  const offerPatches: OfferPatch[] = [];
  const productPatches: ProductPatch[] = [];
  const stockOffOnly: { offerId: string; label: string }[] = [];
  let unchanged = 0, missing = 0, outliers = 0;

  for (const offer of offers) {
    const label = offer.product.name.slice(0, 50);
    const aw = offer.product.slug.split("-")[1];
    const entry = aw ? feed.get(aw) : undefined;

    if (!entry) {
      missing++;
      if (offer.inStock) stockOffOnly.push({ offerId: offer.id, label });
      continue;
    }

    const isOutlier =
      entry.price > offer.priceCurrent * MAX_PRICE_JUMP_RATIO ||
      entry.price < offer.priceCurrent / MAX_PRICE_JUMP_RATIO;
    if (isOutlier) {
      outliers++;
      console.log(`  [warn] ${label}: outlier ${entry.price.toFixed(2)}€ vs actual ${offer.priceCurrent.toFixed(2)}€`);
      continue;
    }

    const newPriceOld = sanitizePriceOld(entry.price, entry.priceOld);
    const newDisc = calcDiscount(entry.price, newPriceOld);
    const priceChanged = Math.abs(entry.price - offer.priceCurrent) >= 0.01;
    const priceOldChanged = newPriceOld !== (offer.priceOld ?? null);
    const discChanged = newDisc !== (offer.discountPercent ?? 0);
    const stockChanged = entry.inStock !== offer.inStock;
    const urlChanged = !!entry.affLink && entry.affLink !== offer.externalUrl;
    const offerChanged = priceChanged || priceOldChanged || discChanged || stockChanged || urlChanged;

    const productData: ProductPatch["data"] = {};
    if (refreshProducts) {
      if (!offer.product.image && entry.image) productData.image = entry.image;
      if (offer.product.rating == null && entry.rating != null) productData.rating = entry.rating;
      if (offer.product.reviewCount == null && entry.reviews != null) productData.reviewCount = entry.reviews;
    }
    const productHasPatch = Object.keys(productData).length > 0;

    if (!offerChanged && !productHasPatch) { unchanged++; continue; }

    if (offerChanged) {
      offerPatches.push({
        offerId: offer.id, productId: offer.productId, store: offer.store, label,
        data: {
          priceCurrent: entry.price,
          priceOld: newPriceOld,
          discountPercent: newDisc,
          inStock: entry.inStock,
          ...(urlChanged ? { externalUrl: entry.affLink } : {}),
        },
        priceChanged,
        newPrice: entry.price,
      });
    }
    if (productHasPatch) {
      productPatches.push({ productId: offer.product.id, label, data: productData });
    }
  }
  return { offerPatches, productPatches, stockOffOnly, unchanged, missing, outliers };
}

async function loadOffers(storeArg: string) {
  return prisma.offer.findMany({
    where: { store: { equals: storeArg, mode: "insensitive" } },
    include: { product: { select: { id: true, slug: true, name: true, image: true, rating: true, reviewCount: true } } },
  });
}

async function applyPlan(plan: ReturnType<typeof buildPlan>) {
  // ofertas + price history + product patches + stock-off → todo en lotes transaccionales
  const ops: Promise<unknown>[] = [];
  let writes = 0;

  // colectamos como factories y los lanzamos en chunks de transacciones
  type Factory = () => Promise<unknown>;
  const factories: Factory[] = [];

  for (const p of plan.offerPatches) {
    factories.push(() => prisma.offer.update({ where: { id: p.offerId }, data: p.data }));
    if (p.priceChanged) {
      factories.push(() => prisma.priceHistory.create({
        data: { productId: p.productId, store: p.store, price: p.newPrice },
      }));
    }
  }
  for (const p of plan.productPatches) {
    factories.push(() => prisma.product.update({ where: { id: p.productId }, data: p.data }));
  }
  for (const s of plan.stockOffOnly) {
    factories.push(() => prisma.offer.update({ where: { id: s.offerId }, data: { inStock: false } }));
  }

  for (let i = 0; i < factories.length; i += TX_BATCH_SIZE) {
    const chunk = factories.slice(i, i + TX_BATCH_SIZE).map(f => f());
    await prisma.$transaction(chunk as Promise<unknown>[] as never);
    writes += chunk.length;
    process.stdout.write(`\r  escribiendo... ${writes}/${factories.length}`);
  }
  if (factories.length) process.stdout.write("\n");
  return writes;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  console.log(`Store:  "${args.store}"`);
  console.log(`Feed:   ${args.feed}`);
  console.log(`Modo:   ${args.dryRun ? "DRY RUN" : "WRITE"}${args.refreshProducts ? " · refresh products" : ""}\n`);

  const t0 = Date.now();
  console.log("─── 1. Ingest + validación del feed ─────────────────");
  const { feed, total, invalid } = await ingestFeed(args.feed);
  const ratio = total ? invalid / total : 0;
  console.log(`Feed: ${total} filas · ${feed.size} válidas · ${invalid} inválidas (${(ratio * 100).toFixed(2)}%) · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (ratio > MAX_INVALID_RATIO) {
    console.error(`\n✖ Abortado: ${(ratio * 100).toFixed(2)}% de filas inválidas supera el umbral del ${(MAX_INVALID_RATIO * 100).toFixed(0)}%`);
    process.exit(2);
  }
  if (feed.size === 0) {
    console.error("\n✖ Abortado: feed sin filas válidas");
    process.exit(2);
  }

  console.log("\n─── 2. Lectura de offers en BD ──────────────────────");
  const offers = await loadOffers(args.store);
  console.log(`Offers de "${args.store}": ${offers.length}`);
  if (offers.length === 0) {
    console.log("\nSin offers que actualizar.");
    return;
  }

  console.log("\n─── 3. Cálculo del plan de cambios ──────────────────");
  const plan = buildPlan(offers, feed, args.refreshProducts);
  const offerCount = plan.offerPatches.length;
  const productCount = plan.productPatches.length;
  const priceChanges = plan.offerPatches.filter(p => p.priceChanged).length;

  for (const p of plan.offerPatches.slice(0, 30)) {
    const orig = offers.find(o => o.id === p.offerId)!;
    const bits: string[] = [];
    if (Math.abs(p.data.priceCurrent - orig.priceCurrent) >= 0.01)
      bits.push(`price ${orig.priceCurrent.toFixed(2)}→${p.data.priceCurrent.toFixed(2)}€`);
    if (p.data.priceOld !== (orig.priceOld ?? null))
      bits.push(`old ${orig.priceOld?.toFixed(2) ?? "—"}→${p.data.priceOld?.toFixed(2) ?? "—"}€`);
    if ((p.data.discountPercent ?? 0) !== (orig.discountPercent ?? 0))
      bits.push(`disc ${orig.discountPercent ?? 0}→${p.data.discountPercent ?? 0}%`);
    if (p.data.inStock !== orig.inStock)
      bits.push(`stock ${orig.inStock ? "in" : "out"}→${p.data.inStock ? "in" : "out"}`);
    if (p.data.externalUrl) bits.push("deeplink↺");
    console.log(`  [chg]  ${p.label.padEnd(50)} ${bits.join(" · ")}`);
  }
  if (offerCount > 30) console.log(`  ... y ${offerCount - 30} más`);

  console.log(`\nPlan: ${offerCount} offers · ${priceChanges} price changes (→ priceHistory) · ${productCount} products · ${plan.stockOffOnly.length} stock-off · ${plan.unchanged} sin cambios · ${plan.outliers} outliers`);

  if (args.dryRun) {
    console.log("\n✓ DRY RUN — no se han guardado cambios");
    return;
  }

  console.log("\n─── 4. Escritura transaccional ──────────────────────");
  const writes = await applyPlan(plan);
  console.log(`✓ ${writes} operaciones escritas en lotes de ${TX_BATCH_SIZE}`);
  console.log(`\nTotal: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
