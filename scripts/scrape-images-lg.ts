/**
 * scrape-images-lg.ts
 *
 * Para cada offer LG en BD, expande la galería de imágenes derivando del patrón
 * de URL conocido de LG España.
 *
 * LG sirve sus galerías en:
 *   https://www.lg.com/content/dam/channel/wcms/es/productos/.../<modelo>/lgcom/gallery/Basic-450.jpg  ← imagen principal
 *   https://www.lg.com/content/dam/channel/wcms/es/productos/.../<modelo>/lgcom/gallery/S-01.jpg       ← detalles
 *   https://www.lg.com/content/dam/channel/wcms/es/productos/.../<modelo>/lgcom/gallery/S-02.jpg
 *   ... hasta S-NN.jpg
 *
 * El feed Awin ya nos da la URL `Basic-450.jpg`. A partir de ahí, hacemos HEAD
 * requests enumerando S-01..S-12 y nos quedamos con las que devuelven 200.
 *
 * Uso:
 *   npx tsx scripts/scrape-images-lg.ts                # todos los productos LG
 *   npx tsx scripts/scrape-images-lg.ts --dry-run      # sin escribir en BD
 *   npx tsx scripts/scrape-images-lg.ts --slug <slug>  # solo un producto
 *   npx tsx scripts/scrape-images-lg.ts --limit 5      # primeros N (testing)
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.error("❌ no DATABASE_URL");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
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
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MAX_GALLERY_INDEX = 12;
const MAX_CONSECUTIVE_404 = 2;
const MAX_TOTAL_IMAGES = 10;

/**
 * Identifica si una URL es del CDN de LG España (lg.com/content/dam/...) y la
 * filtra del array, devolviendo la primera Basic-XXX.jpg encontrada.
 */
function findGalleryBaseImage(images: readonly string[]): string | null {
  for (const url of images) {
    if (!url.includes("lg.com/content/dam/")) continue;
    if (!/\/gallery\/[^/]+\.(jpg|jpeg|png|webp)$/i.test(url)) continue;
    return url;
  }
  return null;
}

async function head(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Dada la URL base de la galería (ej: .../gallery/Basic-450.jpg), enumera
 * S-01.jpg..S-NN.jpg y devuelve las que existen.
 */
async function enumerateGallery(baseImageUrl: string): Promise<string[]> {
  // Extraer la carpeta gallery/ de la URL
  const galleryRoot = baseImageUrl.replace(/\/[^/]+$/, "");

  const out: string[] = [];
  let consecutive404 = 0;

  for (let i = 1; i <= MAX_GALLERY_INDEX; i++) {
    const candidate = `${galleryRoot}/S-${String(i).padStart(2, "0")}.jpg`;
    const exists = await head(candidate);
    if (exists) {
      out.push(candidate);
      consecutive404 = 0;
    } else {
      consecutive404++;
      if (consecutive404 >= MAX_CONSECUTIVE_404) break;
    }
    // Pequeño delay para no martillar a LG
    await sleep(80);
  }

  return out;
}

async function main() {
  console.log(
    `Expandir galería LG${DRY_RUN ? " — DRY RUN" : ""}${
      SLUG_FILTER ? ` | slug=${SLUG_FILTER}` : ""
    }${LIMIT ? ` | limit=${LIMIT}` : ""}\n`
  );

  const offers = await prisma.offer.findMany({
    where: {
      store: { contains: "lg", mode: "insensitive" },
      ...(SLUG_FILTER ? { product: { slug: SLUG_FILTER } } : {}),
    },
    include: {
      product: { select: { id: true, slug: true, name: true, image: true, images: true } },
    },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  // Doble filtro porque "contains lg" puede ser laxo
  const lgOffers = offers.filter((o) => /\blg\b/i.test(o.store));

  if (lgOffers.length === 0) {
    console.log("No LG offers found.");
    return;
  }

  console.log(`${lgOffers.length} producto(s) a procesar\n`);

  let updated = 0;
  let unchanged = 0;
  let noBase = 0;
  let noGallery = 0;

  // Para no procesar el mismo producto varias veces
  const processed = new Set<string>();

  for (const offer of lgOffers) {
    const { product } = offer;
    if (processed.has(product.id)) continue;
    processed.add(product.id);

    const label = `${product.name.substring(0, 55)} [${product.slug}]`;
    const currentImages = (product.images ?? []) as string[];

    // 1. Encontrar la imagen base de la galería en el array actual
    const base = findGalleryBaseImage(currentImages);
    if (!base) {
      console.log(`  [skip] sin URL gallery/Basic — ${label}`);
      noBase++;
      continue;
    }

    try {
      // 2. Enumerar imágenes adicionales
      const extras = await enumerateGallery(base);

      if (extras.length === 0) {
        console.log(`  [warn] sin imágenes S-XX.jpg — ${label}`);
        noGallery++;
        continue;
      }

      // 3. Galería final: Basic-450 + S-01..S-NN, conservando además otras
      // imágenes existentes que NO sean del proxy de Awin (productserve)
      const otherImages = currentImages.filter(
        (u) => !u.includes("productserve.com") && u !== base
      );
      const finalImages = [base, ...extras, ...otherImages].slice(0, MAX_TOTAL_IMAGES);

      const same =
        currentImages.length === finalImages.length &&
        currentImages.every((u, i) => u === finalImages[i]);

      if (same) {
        console.log(`  [ok]   sin cambios (${finalImages.length} imgs) — ${label}`);
        unchanged++;
      } else {
        console.log(
          `  [upd]  ${currentImages.length} → ${finalImages.length} imgs — ${label}`
        );
        if (!DRY_RUN) {
          await prisma.product.update({
            where: { id: product.id },
            data: { image: finalImages[0], images: finalImages },
          });
        }
        updated++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  [err]  ${label}: ${msg}`);
    }
  }

  console.log(
    `\nDone: ${updated} updated | ${unchanged} unchanged | ${noBase} sin base | ${noGallery} sin galería`
  );
  if (DRY_RUN) console.log("Dry-run: no DB changes were saved.");
}

main()
  .catch((e) => {
    console.error("❌ fatal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
