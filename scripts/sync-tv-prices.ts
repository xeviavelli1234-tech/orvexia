import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.log("⏭️  sync-tv-prices: no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type U = {
  slug: string;
  rating: number;
  reviewCount: number;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  externalUrl: string;
  inStock?: boolean;
};

const UPDATES: U[] = [
  { slug: "lg-32lr60006la-fhd-webos-32",       rating: 4.4, reviewCount: 116,  priceCurrent: 229.0,  priceOld: 289.0,  discountPercent: 21,   externalUrl: "https://amzn.to/47HRdvr" },
  { slug: "lg-50ua73006la-uhd-webos25-50",     rating: 4.4, reviewCount: 3595, priceCurrent: 315.9,  priceOld: null,   discountPercent: null, externalUrl: "https://amzn.to/4t0JRM3" },
  { slug: "lg-43ua73006la-uhd-webos25-43",     rating: 4.4, reviewCount: 3556, priceCurrent: 269.0,  priceOld: null,   discountPercent: null, externalUrl: "https://amzn.to/3NLAXCW" },
  { slug: "td-systems-prime32c22tizen-32",     rating: 4.4, reviewCount: 2229, priceCurrent: 119.89, priceOld: null,   discountPercent: null, externalUrl: "https://amzn.to/3PGfv2P" },
  { slug: "td-systems-prime40c22tizen-40",     rating: 4.4, reviewCount: 2229, priceCurrent: 169.89, priceOld: null,   discountPercent: null, externalUrl: "https://amzn.to/3PGfv2P" },
  { slug: "tcl-50v6c-google-tv-50",            rating: 4.4, reviewCount: 2583, priceCurrent: 299.0,  priceOld: 399.0,  discountPercent: 25,   externalUrl: "https://amzn.to/3PPVxm7" },
  { slug: "tcl-65t69c-qled-google-tv-65",      rating: 4.3, reviewCount: 469,  priceCurrent: 492.31, priceOld: 649.0,  discountPercent: 24,   externalUrl: "https://amzn.to/4sjeLOB", inStock: false },
  { slug: "xiaomi-tv-f-32-2026",               rating: 4.4, reviewCount: 4995, priceCurrent: 139.0,  priceOld: 149.0,  discountPercent: 7,    externalUrl: "https://amzn.to/48b2FQi" },
  { slug: "xiaomi-tv-f-50-2026",               rating: 4.4, reviewCount: 4917, priceCurrent: 299.0,  priceOld: null,   discountPercent: null, externalUrl: "https://amzn.to/4dZ5kAe" },
  { slug: "hisense-43e63qt-4k-43",             rating: 4.4, reviewCount: 507,  priceCurrent: 220.15, priceOld: 247.99, discountPercent: 11,   externalUrl: "https://amzn.to/3NVCB4X" },
  { slug: "xiaomi-tv-f-65-2025",                          rating: 4.4, reviewCount: 4995, priceCurrent: 399.0,  priceOld: 449.0, discountPercent: 11,   externalUrl: "https://www.amazon.es/XIAOMI-Pulgadas-Control-Compatible-AirPlay/dp/B0F457MQCQ/" },
  { slug: "fpd-b0f32kwfqw",                               rating: 4.1, reviewCount: 3101, priceCurrent: 202.79, priceOld: null,  discountPercent: null, externalUrl: "https://amzn.to/4cga4Ap" },
  { slug: "visita-la-tienda-de-xiaomi-b0f457m449",        rating: 4.2, reviewCount: 3472, priceCurrent: 179.0,  priceOld: null,  discountPercent: null, externalUrl: "https://amzn.to/41CObFi" },
  { slug: "visita-la-tienda-de-cello-b0d31y8cmd",         rating: 4.3, reviewCount: 267,  priceCurrent: 279.99, priceOld: null,  discountPercent: null, externalUrl: "https://amzn.to/3O8S1D7" },
  { slug: "philips-40pfs6000-led-titan-os-40",            rating: 4.2, reviewCount: 402,  priceCurrent: 158.99, priceOld: null,  discountPercent: null, externalUrl: "https://amzn.to/41f0aZv" },
  { slug: "haier-h55k85fux-google-tv-55",                 rating: 4.2, reviewCount: 405,  priceCurrent: 296.9,  priceOld: null,  discountPercent: null, externalUrl: "https://amzn.to/4c02wAh" },
  { slug: "tcl-55t6c-qled-55",                            rating: 4.1, reviewCount: 819,  priceCurrent: 369.0,  priceOld: null,  discountPercent: null, externalUrl: "https://amzn.to/4dsJIME" },
];

async function main() {
  let updated = 0;
  let missing = 0;

  for (const u of UPDATES) {
    const product = await prisma.product.findUnique({ where: { slug: u.slug }, select: { id: true } });
    if (!product) {
      console.log(`⚠️  ${u.slug}: producto no encontrado`);
      missing++;
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { rating: u.rating, reviewCount: u.reviewCount },
    });

    const existing = await prisma.offer.findUnique({
      where: { productId_store: { productId: product.id, store: "Amazon" } },
      select: { priceCurrent: true },
    });

    const inStock = u.inStock ?? true;

    await prisma.offer.upsert({
      where: { productId_store: { productId: product.id, store: "Amazon" } },
      update: {
        priceCurrent: u.priceCurrent,
        priceOld: u.priceOld,
        discountPercent: u.discountPercent,
        inStock,
      },
      create: {
        productId: product.id,
        store: "Amazon",
        priceCurrent: u.priceCurrent,
        priceOld: u.priceOld,
        discountPercent: u.discountPercent,
        externalUrl: u.externalUrl,
        inStock,
      },
    });

    if (existing && existing.priceCurrent !== u.priceCurrent) {
      await prisma.priceHistory.create({
        data: { productId: product.id, store: "Amazon", price: u.priceCurrent },
      });
    }

    const stockTag = inStock ? "" : " ❌sin stock";
    console.log(`✅ ${u.slug}: ${u.priceCurrent}€${u.priceOld ? ` (antes ${u.priceOld}€, -${u.discountPercent}%)` : ""}${stockTag}`);
    updated++;
  }

  console.log(`\n🎯 sync-tv-prices: ${updated} actualizados, ${missing} no encontrados`);
}

main()
  .catch((e) => {
    console.error("❌ sync-tv-prices error:", e);
    // No romper el build si falla
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
