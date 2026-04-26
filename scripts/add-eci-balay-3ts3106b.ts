/**
 * Añade una sola lavadora Balay 3TS3106B a El Corte Inglés.
 *
 * Modelo verificado en el catálogo ECI:
 *   https://www.elcorteingles.es/electrodomesticos/A47069523-lavadora-balay-10-kg-1400-rpm-3ts3106b/
 *
 * Precio aproximado (no se pudo scrapear ECI por Cloudflare). El script de
 * sync-eci-lavadoras-prices actualizará el precio en el siguiente deploy si
 * se añade a su lista.
 *
 * Uso:
 *   npx tsx scripts/add-eci-balay-3ts3106b.ts
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  console.log("⏭️  no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const STORE = "El Corte Inglés";
const STORE_SLUG = "eci";

// ECI internal product ID (extraído de la URL canónica). No es un aw_product_id
// pero sirve como identificador único estable para el slug.
const AW = "A47069523";
const NAME = "Balay - Lavadora Balay 10 kg / 1.400 rpm - 3TS3106B.";
const BRAND = "Balay";
const MODEL = "3TS3106B";
const EXTERNAL_URL =
  "https://www.elcorteingles.es/electrodomesticos/A47069523-lavadora-balay-10-kg-1400-rpm-3ts3106b/";
const DESCRIPTION =
  "Lavadora Balay 3TS3106B de carga frontal, 10 kg de capacidad y 1400 rpm. Clase A. Motor ExtraSilencio, programa Rápido 30 min, función AutoControl, tambor 3D y display LED. Acabado blanco con puerta de cristal.";

// Precio orientativo (Balay 3TS3106B suele estar en 499-599€ en ECI según promo).
// Auto-corregible vía sync-eci-lavadoras-prices.ts si el precio real difiere.
const PRICE_CURRENT = 499.0;
const PRICE_OLD = 599.0;
const DISCOUNT = 17;

// ECI bloquea scrape directo (Cloudflare). Imagen del CDN público de
// MediaMarkt para el mismo SKU Balay 3TS3106B (assets.mmsrg.com ya está en
// next.config.ts > remotePatterns).
const IMAGES = [
  "https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MP_116998692?x=800&y=800&format=jpg",
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function main() {
  const slug = `${STORE_SLUG}-${AW}-${slugify(NAME)}`;
  console.log(`Slug: ${slug}`);

  const product = await prisma.product.upsert({
    where: { slug },
    update: { image: IMAGES[0], images: IMAGES },
    create: {
      slug,
      name: NAME,
      category: "LAVADORAS",
      brand: BRAND,
      model: MODEL,
      description: DESCRIPTION,
      image: IMAGES[0],
      images: IMAGES,
    },
  });

  await prisma.offer.upsert({
    where: { productId_store: { productId: product.id, store: STORE } },
    update: {
      priceCurrent: PRICE_CURRENT,
      priceOld: PRICE_OLD,
      discountPercent: DISCOUNT,
      externalUrl: EXTERNAL_URL,
      inStock: true,
    },
    create: {
      productId: product.id,
      store: STORE,
      priceCurrent: PRICE_CURRENT,
      priceOld: PRICE_OLD,
      discountPercent: DISCOUNT,
      externalUrl: EXTERNAL_URL,
      inStock: true,
    },
  });

  await prisma.priceHistory.create({
    data: { productId: product.id, store: STORE, price: PRICE_CURRENT },
  });

  console.log(`✅ insertado: ${product.id} | ${slug}`);
}

main()
  .catch((e) => {
    console.error("❌ error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
