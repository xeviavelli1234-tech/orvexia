/**
 * scrape-images-pccomponentes.ts
 *
 * Fetches product image galleries from PcComponentes and saves them to DB.
 * PcComponentes is protected by Cloudflare, so direct automated access is blocked.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  HOW TO GET PAST CLOUDFLARE                                              │
 * │                                                                          │
 * │  1. Open any PcComponentes page in your Chrome browser.                  │
 * │  2. Open DevTools → Application → Cookies → www.pccomponentes.com        │
 * │  3. Copy the value of the "cf_clearance" cookie.                         │
 * │  4. Run this script with that value:                                     │
 * │                                                                          │
 * │     npx tsx scripts/scrape-images-pccomponentes.ts \                     │
 * │       --cf-clearance "paste_cookie_value_here"                           │
 * │                                                                          │
 * │  The cookie is valid ~30 min from the same IP. Refresh it if needed.    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Usage:
 *   npx tsx scripts/scrape-images-pccomponentes.ts --cf-clearance <VALUE>
 *   npx tsx scripts/scrape-images-pccomponentes.ts --cf-clearance <VALUE> --dry-run
 *   npx tsx scripts/scrape-images-pccomponentes.ts --cf-clearance <VALUE> --slug xiaomi-tv-a-pro-32-2026-qled
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { chromium } from "playwright";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DRY_RUN = process.argv.includes("--dry-run");

const SLUG_FILTER =
  process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1] ??
  (process.argv.includes("--slug")
    ? process.argv[process.argv.indexOf("--slug") + 1]
    : null);

// --cf-clearance VALUE  (or  --cf-clearance=VALUE)
const CF_CLEARANCE =
  process.argv.find((a) => a.startsWith("--cf-clearance="))?.split("=").slice(1).join("=") ??
  (process.argv.includes("--cf-clearance")
    ? process.argv[process.argv.indexOf("--cf-clearance") + 1]
    : null);

const THUMB_HOST = "thumb.pccomponentes.com/w-530-530";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isCloudflare(html: string): boolean {
  return (
    /just a moment/i.test(html) ||
    /enable javascript and cookies/i.test(html) ||
    /cdn-cgi\/challenge-platform/i.test(html) ||
    /__cf_chl_/i.test(html)
  );
}

function extractImages(html: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  function add(raw: string) {
    const url = raw
      .replace(/\\u002F/g, "/")
      .replace(/\\\//g, "/")
      .replace(/^\/\//, "https://")
      .split("?")[0]
      .trim();
    if (
      !seen.has(url) &&
      url.startsWith("http") &&
      url.includes(THUMB_HOST) &&
      /\.(jpg|jpeg|png|webp)$/i.test(url)
    ) {
      seen.add(url);
      results.push(url);
    }
  }

  // JSON-LD Product
  for (const m of html.matchAll(
    /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      const json = JSON.parse(m[1]);
      const nodes = Array.isArray(json)
        ? json
        : json["@graph"]
        ? json["@graph"]
        : [json];
      for (const node of nodes) {
        if (node["@type"] === "Product") {
          const imgs = Array.isArray(node.image)
            ? node.image
            : node.image
            ? [node.image]
            : [];
          imgs.forEach((u: string) => add(u));
        }
      }
    } catch { /* skip */ }
  }

  // Quoted URLs
  for (const m of html.matchAll(
    /["'`](https?:\/\/thumb\.pccomponentes\.com\/w-530-530\/[^"'`\s]+\.(?:jpg|jpeg|png|webp))["'`]/gi
  )) {
    add(m[1]);
  }

  // <img> data-src / src
  for (const m of html.matchAll(
    /<img[^>]+(?:data-src|src)="([^"]*thumb\.pccomponentes\.com\/w-530-530[^"]*)"/gi
  )) {
    add(m[1]);
  }

  // Escaped JS blobs
  for (const m of html.matchAll(
    /https?:\\\/\\\/thumb\.pccomponentes\.com\\\/w-530-530[^"' \\]*/g
  )) {
    add(m[0]);
  }

  return results;
}

async function fetchWithPlaywright(
  url: string,
  cfClearance: string
): Promise<string> {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    userAgent: UA,
    locale: "es-ES",
    viewport: { width: 1366, height: 768 },
    extraHTTPHeaders: { "Accept-Language": "es-ES,es;q=0.9,en;q=0.8" },
  });

  // Inject the real cf_clearance cookie BEFORE loading any page
  await context.addCookies([
    {
      name: "cf_clearance",
      value: cfClearance,
      domain: ".pccomponentes.com",
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "None",
    },
  ]);

  const page = await context.newPage();
  await page.route("**/*.{mp4,webm,ogg,woff,woff2,ttf,otf,eot}", (r) => r.abort());

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });

    // Scroll to trigger lazy image loading
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let y = 0;
        const id = setInterval(() => {
          window.scrollBy(0, 300);
          y += 300;
          if (y >= 2500) { clearInterval(id); resolve(); }
        }, 100);
      });
    });
    await sleep(2000);

    return await page.content();
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

async function main() {
  console.log(
    `Scrape PcComponentes images${DRY_RUN ? " — DRY RUN" : ""}${
      SLUG_FILTER ? ` | slug: ${SLUG_FILTER}` : ""
    }\n`
  );

  if (!CF_CLEARANCE) {
    console.error(`
❌  No se ha proporcionado el cookie de Cloudflare.

Sigue estos pasos para obtenerlo:
  1. Abre Chrome y ve a: https://www.pccomponentes.com
  2. DevTools (F12) → Application → Cookies → www.pccomponentes.com
  3. Copia el valor de la cookie "cf_clearance"
  4. Ejecuta:

     npx tsx scripts/scrape-images-pccomponentes.ts --cf-clearance "VALOR_AQUI"
`);
    process.exit(1);
  }

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
    const label = `${product.name.substring(0, 55)} [${product.slug}]`;

    try {
      const html = await fetchWithPlaywright(offer.externalUrl, CF_CLEARANCE);

      if (isCloudflare(html)) {
        console.log(`  [skip] Cookie caducada o IP diferente — ${label}`);
        blocked++;
        await sleep(2000);
        continue;
      }

      const images = extractImages(html);

      if (images.length === 0) {
        console.log(`  [warn] Sin imágenes en la página — ${label}`);
        failed++;
        await sleep(2000);
        continue;
      }

      const current: string[] = Array.isArray(product.images)
        ? (product.images as string[])
        : [];
      const same = current.length === images.length && current[0] === images[0];

      if (same) {
        console.log(`  [ok]   Sin cambios (${images.length} imgs) — ${label}`);
        unchanged++;
      } else {
        console.log(`  [upd]  ${current.length} → ${images.length} imgs — ${label}`);
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

    await sleep(1500 + Math.random() * 1000);
  }

  console.log(
    `\nDone: ${updated} updated | ${unchanged} unchanged | ${blocked} blocked (cookie caducada) | ${failed} errors`
  );
  if (DRY_RUN) console.log("Dry-run: no DB changes were saved.");
  if (blocked > 0) {
    console.log("\n⚠️  Renueva el cf_clearance si hay muchos bloqueos (caduca ~30 min).");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
