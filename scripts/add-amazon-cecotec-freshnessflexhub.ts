/**
 * Añade Cecotec Bolero CoolMarket FreshNessFlexHub 403L (4 puertas Dark Inox)
 * a la categoría FRIGORIFICOS, tienda Amazon. URL de afiliado pasada por el
 * usuario (https://amzn.to/4u2G3tG → tag=orvexia-21).
 *
 * Uso:
 *   npx tsx scripts/add-amazon-cecotec-freshnessflexhub.ts
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

const STORE = "Amazon";
const ASIN = "B0FL1Y594L";
const NAME =
  "Cecotec Bolero CoolMarket FreshNessFlexHub 403 L - Frigorífico 4 Puertas Dark Inox, Compresor Inverter, ATT Antibacterias, Cajón FreshNess FlexHub";
const BRAND = "Cecotec";
const MODEL = "Bolero CoolMarket FreshNessFlexHub 403";
const DESCRIPTION =
  "Frigorífico Cecotec Bolero CoolMarket de 403 L y 4 puertas estilo French Door, color Dark Inox. Compresor Inverter con garantía de 10 años, tecnología ATT (Active Triple Technology) Antibacterias, cajón FreshNess FlexHub para conservación óptima. Clase E.";
const PRICE_CURRENT = 629.0;
const PRICE_OLD: number | null = null;
const DISCOUNT: number | null = null;
const IMAGE = `https://images-na.ssl-images-amazon.com/images/P/${ASIN}.01._SL500_.jpg`;
const RATING = 4.1;
const REVIEW_COUNT = 21;
const EXTERNAL_URL =
  "https://www.amazon.es/Cecotec-Frigor%C3%ADfico-CoolMarket-FreshNessFlexHub-Antibacterias/dp/B0FL1Y594L?tag=orvexia-21&linkCode=sl2&linkId=9e1a50e84e7b0234364723ad1c7a7b9b&ref_=as_li_ss_tl";

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
  const slug = `amazon-${ASIN.toLowerCase()}-${slugify(NAME)}`;

  const product = await prisma.product.upsert({
    where: { slug },
    update: {
      image: IMAGE,
      images: [IMAGE],
      rating: RATING,
      reviewCount: REVIEW_COUNT,
    },
    create: {
      slug,
      name: NAME,
      category: "FRIGORIFICOS",
      brand: BRAND,
      model: MODEL,
      description: DESCRIPTION,
      image: IMAGE,
      images: [IMAGE],
      rating: RATING,
      reviewCount: REVIEW_COUNT,
    },
  });

  const before = await prisma.offer.findUnique({
    where: { productId_store: { productId: product.id, store: STORE } },
    select: { priceCurrent: true },
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

  if (!before) {
    await prisma.priceHistory.create({
      data: { productId: product.id, store: STORE, price: PRICE_CURRENT },
    });
    console.log(`✅ insertado: ${slug}`);
  } else if (before.priceCurrent !== PRICE_CURRENT) {
    await prisma.priceHistory.create({
      data: { productId: product.id, store: STORE, price: PRICE_CURRENT },
    });
    console.log(`🔄 actualizado: ${slug}`);
  } else {
    console.log(`✓ ya existe sin cambios: ${slug}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
