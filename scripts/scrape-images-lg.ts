/**
 * scrape-images-lg.ts
 *
 * Para cada offer LG en BD, expande la galería de imágenes combinando 3
 * estrategias:
 *
 *   1. Fetch HTML de la página lg.com (resolviendo el deeplink Awin).
 *   2. Extracción de TODAS las URLs de imágenes que están en la misma
 *      carpeta gallery/ que la og:image canónica del producto.
 *   3. Enumeración del patrón S-NN.jpg (típico de TVs premium) como
 *      complemento — pilla imágenes que la página no inyecta en HTML
 *      estático sino que carga vía JS.
 *
 * Cada estrategia recoge URLs distintas. La unión final, sin duplicados,
 * va al campo Product.images.
 *
 * Uso:
 *   npm run db:scrape-images-lg
 *   npx tsx scripts/scrape-images-lg.ts --dry-run
 *   npx tsx scripts/scrape-images-lg.ts --slug <slug>
 *   npx tsx scripts/scrape-images-lg.ts --limit 5
 */
import * as dotenv from "dotenv";
import { getDatabaseUrl } from "../lib/db-url";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.error("❌ no DATABASE_URL");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
});

const DRY_RUN = process.argv.includes("--dry-run");
const SLUG_FILTER = getArg("--slug");
const LIMIT = parseInt(getArg("--limit") ?? "0", 10) || undefined;

function getArg(name: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(name + "="));
  if (eq) return eq.split("=").slice(1).join("=");
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--")) {
    return process.argv[idx + 1];
  }
  return undefined;
}

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MAX_GALLERY_INDEX = 14; // S-01..S-14
const MAX_CONSECUTIVE_404 = 2;
const MAX_TOTAL_IMAGES = 10;
const PAGE_TIMEOUT_MS = 25000;
const HEAD_TIMEOUT_MS = 8000;

// ────────────────────────────────────────────────────────────────────────
// HTTP helpers
// ────────────────────────────────────────────────────────────────────────

async function fetchPage(
  url: string
): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return { html: await res.text(), finalUrl: res.url };
  } catch {
    return null;
  }
}

async function head(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: HEADERS,
      signal: AbortSignal.timeout(HEAD_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Verifica con HEAD que una URL devuelva 200. Devuelve true si está viva.
 * Hace caching en memoria por proceso para evitar HEADs duplicados.
 */
const headCache = new Map<string, boolean>();
async function isUrlAlive(url: string): Promise<boolean> {
  if (headCache.has(url)) return headCache.get(url)!;
  // Productserve URLs siempre las consideramos válidas (son thumbnails proxy
  // y pueden bloquear HEAD pero servir GET; evitamos romper esa funcionalidad)
  if (url.includes("productserve.com")) {
    headCache.set(url, true);
    return true;
  }
  const ok = await head(url);
  headCache.set(url, ok);
  return ok;
}

// ────────────────────────────────────────────────────────────────────────
// HTML parsing
// ────────────────────────────────────────────────────────────────────────

function extractOgImage(html: string): string | null {
  const m = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  );
  return m?.[1] ?? null;
}

/**
 * De `https://www.lg.com/.../<modelo>/lgcom/gallery/Basic-450.jpg` extrae
 * `https://www.lg.com/.../<modelo>/lgcom/gallery` (sin trailing slash).
 * Funciona también con paths AEM que llevan /jcr:content/renditions/...
 */
function getGalleryFolder(url: string): string | null {
  const m = url.match(/^(.*?\/gallery)(?:\/|$)/);
  return m?.[1] ?? null;
}

/**
 * Limpia URLs LG que vienen con sufijos AEM /jcr:content/... o query strings,
 * dejando la URL canónica del archivo.
 */
function normalizeLgUrl(url: string): string {
  // Cortar en /jcr:content/ si aparece
  const idx = url.indexOf("/jcr:content/");
  if (idx > 0) return url.slice(0, idx);
  // Cortar query string
  const q = url.indexOf("?");
  if (q > 0) return url.slice(0, q);
  return url;
}

/**
 * Extrae todas las URLs en el HTML que apuntan a archivos de imagen dentro
 * de la carpeta gallery/ pasada. Devuelve URLs canónicas (sin AEM suffix).
 */
function extractGalleryImagesFromHtml(
  html: string,
  galleryFolder: string
): string[] {
  const escaped = galleryFolder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `${escaped}/[A-Za-z0-9_\\-]+\\.(?:jpg|jpeg|png|webp)`,
    "gi"
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of html.matchAll(pattern)) {
    const clean = normalizeLgUrl(m[0]);
    if (!seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────
// S-NN.jpg enumeration
// ────────────────────────────────────────────────────────────────────────

async function enumerateSNN(galleryFolder: string): Promise<string[]> {
  const out: string[] = [];
  let consecutive404 = 0;
  for (let i = 1; i <= MAX_GALLERY_INDEX; i++) {
    const candidate = `${galleryFolder}/S-${String(i).padStart(2, "0")}.jpg`;
    const exists = await head(candidate);
    if (exists) {
      out.push(candidate);
      consecutive404 = 0;
    } else {
      consecutive404++;
      if (consecutive404 >= MAX_CONSECUTIVE_404) break;
    }
    await sleep(60);
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────
// Encontrar imagen base en el array existente del producto
// ────────────────────────────────────────────────────────────────────────

function findGalleryBaseImage(images: readonly string[]): string | null {
  for (const url of images) {
    if (!url.includes("lg.com/content/dam/")) continue;
    if (!url.includes("/gallery/")) continue;
    return normalizeLgUrl(url);
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────
// Procesado de una offer
// ────────────────────────────────────────────────────────────────────────

interface ProcessResult {
  finalImages: string[];
  source: "page+enum" | "page" | "enum" | "none";
  notes: string[];
}

async function processOffer(
  offer: {
    externalUrl: string;
    product: { images: string[] | null };
  }
): Promise<ProcessResult> {
  const notes: string[] = [];
  const currentImages = (offer.product.images ?? []) as string[];

  // 1) Fetch página lg.com (resolviendo redirect Awin)
  const page = await fetchPage(offer.externalUrl);
  let pageImages: string[] = [];
  let ogImage: string | null = null;

  if (page) {
    if (!/lg\.com/i.test(page.finalUrl)) {
      notes.push(`redirect no fue a lg.com (${page.finalUrl.slice(0, 50)})`);
    }
    ogImage = extractOgImage(page.html);
    if (ogImage && !ogImage.includes("/gallery/")) {
      // og:image no es producto (banner, logo, etc.) — descartar
      ogImage = null;
    }
  } else {
    notes.push("fetch página falló");
  }

  // 2) Decidir carpeta gallery/ canónica
  const baseImage =
    ogImage ??
    findGalleryBaseImage(currentImages) ??
    null;

  if (!baseImage) {
    return { finalImages: currentImages, source: "none", notes };
  }

  const galleryFolder = getGalleryFolder(baseImage);
  if (!galleryFolder) {
    return { finalImages: currentImages, source: "none", notes };
  }

  // 3) Extraer imágenes de la página filtradas a esta carpeta
  if (page) {
    pageImages = extractGalleryImagesFromHtml(page.html, galleryFolder);
  }

  // 4) Enumerar S-NN.jpg en la misma carpeta
  const enumerated = await enumerateSNN(galleryFolder);

  // 5) Mezcla, dedupe (manteniendo orden de prioridad)
  const seen = new Set<string>();
  const out: string[] = [];

  function add(u: string | null | undefined) {
    if (!u) return;
    const norm = normalizeLgUrl(u);
    if (seen.has(norm)) return;
    seen.add(norm);
    out.push(norm);
  }

  // Orden de prioridad: imagen canónica del og:image, luego enumeradas S-NN,
  // luego las que aparecen en HTML, luego las que ya teníamos en BD.
  // Dedupe automático.
  add(baseImage);
  for (const u of enumerated) add(u);
  for (const u of pageImages) add(u);
  for (const u of currentImages) add(u);

  // Verificar cada URL con HEAD. Sólo conservar las que devuelven 200.
  // Esto evita guardar URLs muertas (LG retira imágenes de modelos outlet).
  const verified: string[] = [];
  for (const u of out) {
    if (await isUrlAlive(u)) verified.push(u);
  }

  const finalImages = verified.slice(0, MAX_TOTAL_IMAGES);

  // Si no quedó ninguna URL viva, no tocar BD (mejor conservar la basura
  // existente que dejar el producto sin imágenes y romper la card).
  if (finalImages.length === 0) {
    notes.push("todas las URLs candidatas devolvieron error");
    return { finalImages: currentImages, source: "none", notes };
  }

  const source: ProcessResult["source"] =
    pageImages.length > 0 && enumerated.length > 0
      ? "page+enum"
      : pageImages.length > 0
      ? "page"
      : enumerated.length > 0
      ? "enum"
      : "none";

  return { finalImages, source, notes };
}

// ────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    `Expandir galería LG (v2)${DRY_RUN ? " — DRY RUN" : ""}${
      SLUG_FILTER ? ` | slug=${SLUG_FILTER}` : ""
    }${LIMIT ? ` | limit=${LIMIT}` : ""}\n`
  );

  const offers = await prisma.offer.findMany({
    where: {
      store: { contains: "lg", mode: "insensitive" },
      ...(SLUG_FILTER ? { product: { slug: SLUG_FILTER } } : {}),
    },
    include: {
      product: {
        select: { id: true, slug: true, name: true, image: true, images: true },
      },
    },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  const lgOffers = offers.filter((o) => /\blg\b/i.test(o.store));

  if (lgOffers.length === 0) {
    console.log("No LG offers found.");
    return;
  }

  console.log(`${lgOffers.length} producto(s) a procesar\n`);

  let updated = 0;
  let unchanged = 0;
  let noChange = 0; // sin gallery base ni og:image — no se puede mejorar
  const sourceCounts: Record<string, number> = {};

  const processed = new Set<string>();

  for (let i = 0; i < lgOffers.length; i++) {
    const offer = lgOffers[i];
    const { product } = offer;
    if (processed.has(product.id)) continue;
    processed.add(product.id);

    const label = `${product.name.substring(0, 50)} [${product.slug.slice(0, 30)}]`;

    try {
      const result = await processOffer({
        externalUrl: offer.externalUrl,
        product: { images: product.images as string[] | null },
      });

      sourceCounts[result.source] = (sourceCounts[result.source] ?? 0) + 1;

      if (result.source === "none") {
        console.log(`  [skip] ${label} (sin og:image ni base) ${result.notes.join("; ")}`);
        noChange++;
      } else {
        const current = (product.images ?? []) as string[];
        const same =
          current.length === result.finalImages.length &&
          current.every((u, idx) => u === result.finalImages[idx]);

        if (same) {
          console.log(`  [ok]   sin cambios (${result.finalImages.length} imgs) — ${label}`);
          unchanged++;
        } else {
          console.log(
            `  [upd]  ${current.length} → ${result.finalImages.length} imgs (${result.source}) — ${label}`
          );
          if (!DRY_RUN) {
            await prisma.product.update({
              where: { id: product.id },
              data: {
                image: result.finalImages[0],
                images: result.finalImages,
              },
            });
          }
          updated++;
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  [err]  ${label}: ${msg}`);
    }

    // Rate limit (1.2s ± 0.5s) entre productos
    if (i < lgOffers.length - 1) await sleep(1200 + Math.random() * 500);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(
    `Resultado: ${updated} actualizados | ${unchanged} sin cambios | ${noChange} no mejorables`
  );
  console.log(`Fuentes:`, sourceCounts);
  if (DRY_RUN) console.log("Dry-run: no DB changes were saved.");
}

main()
  .catch((e) => {
    console.error("❌ fatal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
