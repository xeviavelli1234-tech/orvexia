import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as zlib from "zlib";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

const FEED_PATH = "C:/Users/xavie/Downloads/datafeed_2854543 (2).csv.gz";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function awIdFromUrl(url: string): string | null {
  const m = url.match(/[?&]p=(\d+)/);
  return m ? m[1] : null;
}

async function loadFeedMap(): Promise<Map<string, Record<string, string>>> {
  const raw = zlib.gunzipSync(fs.readFileSync(FEED_PATH)).toString("utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  const idIdx = headers.indexOf("aw_product_id");
  const map = new Map<string, Record<string, string>>();
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < headers.length) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, j) => (row[h] = cols[j] ?? ""));
    map.set(cols[idIdx], row);
  }
  return map;
}

function parseNum(s: string): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(",", ".").replace(/[^\d.]/g, ""));
  return isFinite(n) ? n : null;
}

async function main() {
  const category = (process.argv[2] || "TELEVISORES").toUpperCase() as
    | "TELEVISORES" | "LAVADORAS" | "FRIGORIFICOS" | "LAVAVAJILLAS" | "SECADORAS"
    | "HORNOS" | "MICROONDAS" | "ASPIRADORAS" | "CAFETERAS" | "AIRES_ACONDICIONADOS" | "OTROS";

  console.log(`Categoría: ${category}`);
  console.log("Cargando feed...");
  const feed = await loadFeedMap();
  console.log(`Feed: ${feed.size} productos\n`);

  const tvs = await prisma.product.findMany({
    where: {
      category,
      offers: { some: { store: { equals: "Fnac", mode: "insensitive" } } },
    },
    include: { offers: { where: { store: { equals: "Fnac", mode: "insensitive" } } } },
  });

  let matched = 0;
  let missed = 0;

  for (const t of tvs) {
    const offer = t.offers[0];
    const awId = awIdFromUrl(offer.externalUrl);
    const row = awId ? feed.get(awId) : null;

    if (!row) {
      missed++;
      console.log(`✗ ${t.brand} ${t.model} — no match (aw_id=${awId})`);
      continue;
    }
    matched++;

    const priceCurrent = parseNum(row.search_price) ?? offer.priceCurrent;
    const priceOldRaw = parseNum(row.product_price_old);
    const priceOld = priceOldRaw != null && priceOldRaw > priceCurrent ? priceOldRaw : null;
    const savings = parseNum(row.savings_percent);
    const discountPercent =
      priceOld != null ? (savings != null ? Math.round(savings) : Math.round(((priceOld - priceCurrent) / priceOld) * 100))
      : null;
    const inStock = row.in_stock === "1" || row.in_stock.toLowerCase() === "true";

    const rating = parseNum(row.average_rating);
    const reviews = parseNum(row.reviews);

    const mainImg = row.large_image || row.merchant_image_url || row.aw_image_url || t.image;
    const alt = row.alternate_image;
    const gallery = [mainImg, alt].filter((x): x is string => !!x && x.length > 0);

    await prisma.product.update({
      where: { id: t.id },
      data: {
        image: mainImg || undefined,
        images: gallery.length ? gallery : t.images,
        rating: rating ?? t.rating,
        reviewCount: reviews != null ? Math.round(reviews) : t.reviewCount,
        description: row.product_short_description || t.description || undefined,
      },
    });

    const prevPrice = offer.priceCurrent;
    await prisma.offer.update({
      where: { id: offer.id },
      data: {
        priceCurrent,
        priceOld: priceOld ?? null,
        discountPercent,
        inStock,
      },
    });

    if (prevPrice !== priceCurrent) {
      await prisma.priceHistory.create({
        data: { productId: t.id, store: offer.store, price: priceCurrent },
      });
    }

    console.log(`✓ ${t.brand} ${t.model} | ${priceCurrent}€ ${priceOld ? `(was ${priceOld}€ -${discountPercent}%)` : ""} | ${rating ?? "?"}★ (${reviews ?? 0}) | stock=${inStock}`);
  }

  console.log(`\n✅ ${matched} actualizados, ${missed} sin match`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
