/**
 * scrape-images-pccomponentes.ts
 * Fetches product pages from PcComponentes and updates the images array in DB.
 *
 * Usage:
 *   npx tsx scripts/scrape-images-pccomponentes.ts            # all PcC products
 *   npx tsx scripts/scrape-images-pccomponentes.ts --dry-run  # preview only, no DB write
 *   npx tsx scripts/scrape-images-pccomponentes.ts --slug xiaomi-tv-a-pro-32  # single product
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DRY_RUN = process.argv.includes("--dry-run");
const SLUG_FILTER = process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1]
  ?? (process.argv.includes("--slug") ? process.argv[process.argv.indexOf("--slug") + 1] : null);

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isPcComponentesBlockedHtml(html: string): boolean {
  return (
    /just a moment/i.test(html) &&
    /enable javascript and cookies to continue/i.test(html) &&
    /cdn-cgi\/challenge-platform/i.test(html)
  ) || /__cf_chl_|cloudflare/i.test(html);
}

async function fetchHtml(url: string): Promise<string> {
  const headers = {
    "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Upgrade-Insecure-Requests": "1",
    Referer: "https://www.google.com/",
  };
  const res = await fetch(url, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  return res.text();
}

/**
 * Extracts all gallery image URLs from a PcComponentes product page HTML.
 * Tries multiple strategies in order of reliability.
 */
function extractImages(html: string): string[] {
  const thumb = "thumb.pccomponentes.com/w-530-530";
  const seen = new Set<string>();
  const results: string[] = [];

  function add(url: string) {
    // Normalise: strip query strings, ensure https
    const clean = url.replace(/^\/\//, "https://").split("?")[0].trim();
    if (!seen.has(clean) && clean.startsWith("http") && clean.includes(thumb)) {
      seen.add(clean);
      results.push(clean);
    }
  }

  // ── Strategy 1: JSON-LD "@type":"Product" images array ──────────────────────
  // PcC embeds a JSON-LD block like: {"@type":"Product","image":["url1","url2",...]}
  const ldMatches = html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of ldMatches) {
    try {
      const json = JSON.parse(match[1]);
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        const obj = item["@graph"] ? item["@graph"] : [item];
        for (const node of (Array.isArray(obj) ? obj : [obj])) {
          if (node["@type"] === "Product") {
            const imgs = Array.isArray(node.image) ? node.image : node.image ? [node.image] : [];
            imgs.forEach((u: string) => add(u));
          }
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  // ── Strategy 2: window.__INITIAL_STATE__ / window.__NUXT__ / __STATE__ JSON ──
  // PcC is a Vue/Nuxt SPA — initial state often contains image galleries
  const statePatterns = [
    /window\.__(?:INITIAL_STATE|NUXT|STATE)__\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i,
    /window\.__pinia\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i,
  ];
  for (const pattern of statePatterns) {
    const stateMatch = html.match(pattern);
    if (stateMatch) {
      // Pull all thumb URLs from the state blob (safer than full JSON parse of huge objects)
      const urlMatches = stateMatch[1].matchAll(/https?:\\?\/\\?\/thumb\.pccomponentes\.com\\?\/w-530-530[^"' \\]*/g);
      for (const m of urlMatches) {
        add(m[0].replace(/\\u002F/g, "/").replace(/\\\//g, "/"));
      }
    }
  }

  // ── Strategy 3: data-src / src on <img> tags with thumb domain ───────────────
  const imgTagPattern = /<img[^>]+(?:data-src|src)="([^"]*thumb\.pccomponentes\.com\/w-530-530[^"]*)"/gi;
  for (const m of html.matchAll(imgTagPattern)) {
    add(m[1]);
  }

  // ── Strategy 4: data-zoom-image / data-image attributes ──────────────────────
  const dataAttrPattern = /data-(?:zoom-image|image|gallery-image|large-image)="([^"]*thumb\.pccomponentes\.com[^"]*)"/gi;
  for (const m of html.matchAll(dataAttrPattern)) {
    add(m[1]);
  }

  // ── Strategy 5: bare URL strings anywhere in the HTML ────────────────────────
  // Catches URLs in JS variable assignments, inline JSON, etc.
  const bareUrlPattern = /["'`](https?:\/\/thumb\.pccomponentes\.com\/w-530-530\/[^"'`\s]+\.(?:jpg|jpeg|png|webp))["'`]/gi;
  for (const m of html.matchAll(bareUrlPattern)) {
    add(m[1]);
  }

  // ── Strategy 6: unquoted URLs in data attributes / src ───────────────────────
  const unquotedPattern = /(?:src|href|content)=(https?:\/\/thumb\.pccomponentes\.com\/w-530-530\/[^\s>]+\.(?:jpg|jpeg|png|webp))/gi;
  for (const m of html.matchAll(unquotedPattern)) {
    add(m[1]);
  }

  return results;
}

async function main() {
  console.log(`Scrape PcComponentes images${DRY_RUN ? " (dry-run)" : ""}${SLUG_FILTER ? ` | slug: ${SLUG_FILTER}` : ""}\n`);

  // Get all PcC products (joined via offers)
  const offers = await prisma.offer.findMany({
    where: {
      store: { contains: "pccomponentes", mode: "insensitive" },
      ...(SLUG_FILTER ? { product: { slug: SLUG_FILTER } } : {}),
    },
    include: {
      product: { select: { id: true, slug: true, name: true, images: true } },
    },
  });

  if (offers.length === 0) {
    console.log("No PcComponentes offers found.");
    return;
  }

  console.log(`${offers.length} product(s) to process\n`);

  let updated = 0;
  let unchanged = 0;
  let blocked = 0;
  let failed = 0;

  for (const offer of offers) {
    const { product } = offer;
    const label = `${product.name.substring(0, 50)} [${product.slug}]`;

    try {
      const html = await fetchHtml(offer.externalUrl);

      if (isPcComponentesBlockedHtml(html)) {
        console.log(`  [skip] Cloudflare block — ${label}`);
        blocked++;
        await sleep(3000 + Math.random() * 2000);
        continue;
      }

      const images = extractImages(html);

      if (images.length === 0) {
        console.log(`  [warn] No images found — ${label}`);
        failed++;
        await sleep(2000 + Math.random() * 1000);
        continue;
      }

      // Check if already up-to-date (same first image = same gallery version)
      const currentImages: string[] = Array.isArray(product.images) ? product.images as string[] : [];
      const alreadyUpToDate =
        currentImages.length === images.length &&
        currentImages[0] === images[0];

      if (alreadyUpToDate) {
        console.log(`  [ok]   Unchanged (${images.length} imgs) — ${label}`);
        unchanged++;
      } else {
        console.log(`  [upd]  ${currentImages.length} → ${images.length} imgs — ${label}`);
        if (!DRY_RUN) {
          await prisma.product.update({
            where: { id: product.id },
            data: { image: images[0], images },
          });
        }
        updated++;
      }
    } catch (err) {
      console.log(`  [err]  ${label}: ${err instanceof Error ? err.message : err}`);
      failed++;
    }

    // Polite delay between requests
    await sleep(2500 + Math.random() * 2000);
  }

  console.log(`\nDone: ${updated} updated | ${unchanged} unchanged | ${blocked} blocked | ${failed} errors`);
  if (DRY_RUN) console.log("Dry-run: no DB changes were saved.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
