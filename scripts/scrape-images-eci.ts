/**
 * scrape-images-eci.ts
 *
 * Enriquece productos de El Corte Inglés con la galería completa.
 * El feed AWIN solo expone 1-2 imágenes; extraemos todas desde JSON-LD,
 * OpenGraph y el DOM de la página de producto.
 *
 * Uso:
 *   npx tsx scripts/scrape-images-eci.ts
 *   npx tsx scripts/scrape-images-eci.ts --dry-run
 *   npx tsx scripts/scrape-images-eci.ts --slug eci-12345-foo
 *   npx tsx scripts/scrape-images-eci.ts --only-few
 *   npx tsx scripts/scrape-images-eci.ts --limit 20
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY_FEW = process.argv.includes("--only-few");
const SLUG_FILTER =
  process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1] ??
  (process.argv.includes("--slug")
    ? process.argv[process.argv.indexOf("--slug") + 1]
    : null);
const LIMIT = (() => {
  const raw =
    process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ??
    (process.argv.includes("--limit")
      ? process.argv[process.argv.indexOf("--limit") + 1]
      : null);
  const v = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(v) && v > 0 ? v : null;
})();

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const HEADERS: Record<string, string> = {
  "User-Agent": UA,
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  Referer: "https://www.google.com/",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function resolveAwinRedirect(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: HEADERS,
      signal: AbortSignal.timeout(12000),
    });
    return res.url || url;
  } catch {
    return url;
  }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  return res.text();
}

function normalizeEciImage(raw: string): string | null {
  const url = raw
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .split("?")[0]
    .trim();

  if (!/^https?:\/\//.test(url)) return null;
  if (!/elcorteingles\.es/i.test(url)) return null;
  if (!/\.(jpg|jpeg|png|webp)$/i.test(url)) return null;
  if (/\/(logo|icon|flags|payment|badge|sello|pictos)\//i.test(url)) return null;
  return url;
}

function extractImages(html: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string) => {
    const n = normalizeEciImage(raw);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  };

  // JSON-LD Product.image
  for (const m of html.matchAll(
    /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const json = JSON.parse(m[1]);
      const nodes = Array.isArray(json)
        ? json
        : json["@graph"]
          ? json["@graph"]
          : [json];
      for (const node of nodes) {
        if (!node) continue;
        const type = node["@type"];
        const isProduct =
          type === "Product" || (Array.isArray(type) && type.includes("Product"));
        if (!isProduct) continue;
        const imgs = Array.isArray(node.image)
          ? node.image
          : node.image
            ? [node.image]
            : [];
        for (const u of imgs) if (typeof u === "string") push(u);
      }
    } catch {
      // skip
    }
  }

  // OpenGraph
  for (const m of html.matchAll(
    /<meta[^>]+property="og:image(?::secure_url)?"[^>]+content="([^"]+)"/gi,
  )) {
    push(m[1]);
  }

  // <img> apuntando a dam.elcorteingles.es
  for (const m of html.matchAll(
    /<img[^>]+(?:data-src|data-original|src)="([^"]*elcorteingles\.es[^"]*\.(?:jpg|jpeg|png|webp))"/gi,
  )) {
    push(m[1]);
  }

  // URLs sueltas
  for (const m of html.matchAll(
    /["'`](https?:\/\/[^"'`\s]*elcorteingles\.es[^"'`\s]+\.(?:jpg|jpeg|png|webp))["'`]/gi,
  )) {
    push(m[1]);
  }

  return out;
}

async function run() {
  console.log(
    `Scrape ECI images${DRY_RUN ? " — DRY RUN" : ""}${
      SLUG_FILTER ? ` | slug: ${SLUG_FILTER}` : ""
    }${ONLY_FEW ? " | solo productos con ≤1 imagen" : ""}${
      LIMIT ? ` | limit: ${LIMIT}` : ""
    }\n`,
  );

  const offers = await prisma.offer.findMany({
    where: {
      OR: [
        { store: { contains: "corte", mode: "insensitive" } },
        { store: { equals: "ECI", mode: "insensitive" } },
        { store: { contains: "eci", mode: "insensitive" } },
      ],
      ...(SLUG_FILTER ? { product: { slug: SLUG_FILTER } } : {}),
    },
    include: {
      product: {
        select: { id: true, slug: true, name: true, images: true, image: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const filtered = ONLY_FEW
    ? offers.filter((o: (typeof offers)[number]) => (o.product.images?.length ?? 0) <= 1)
    : offers;
  const pool = LIMIT ? filtered.slice(0, LIMIT) : filtered;

  if (pool.length === 0) {
    console.log("No hay ofertas de ECI que procesar.");
    return;
  }

  console.log(`${pool.length} producto(s) a procesar\n`);

  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const offer of pool) {
    const { product } = offer;
    const label = `${product.name.substring(0, 55)} [${product.slug}]`;

    try {
      const finalUrl = await resolveAwinRedirect(offer.externalUrl);
      if (!/elcorteingles\.es/i.test(finalUrl)) {
        console.log(`  [skip] AWIN no resolvió a ECI — ${label}`);
        failed++;
        await sleep(800);
        continue;
      }

      const html = await fetchHtml(finalUrl);
      const images = extractImages(html);

      if (images.length === 0) {
        console.log(`  [warn] Sin imágenes extraídas — ${label}`);
        failed++;
        await sleep(1200);
        continue;
      }

      const current: string[] = Array.isArray(product.images)
        ? (product.images as string[])
        : [];
      const same =
        current.length === images.length &&
        current.every((u: string, i: number) => u === images[i]);

      if (same) {
        console.log(`  [ok]   Sin cambios (${images.length} imgs) — ${label}`);
        unchanged++;
      } else {
        console.log(
          `  [upd]  ${current.length} → ${images.length} imgs — ${label}`,
        );
        if (!DRY_RUN) {
          await prisma.product.update({
            where: { id: product.id },
            data: { image: images[0], images },
          });
        }
        updated++;
      }
    } catch (err) {
      console.log(
        `  [err]  ${label}: ${err instanceof Error ? err.message : err}`,
      );
      failed++;
    }

    await sleep(1200 + Math.random() * 800);
  }

  console.log(
    `\nHecho: ${updated} actualizados | ${unchanged} sin cambios | ${failed} fallidos`,
  );
  if (DRY_RUN) console.log("Dry-run: no se guardó nada en DB.");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
