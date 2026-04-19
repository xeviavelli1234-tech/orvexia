import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const slug = "td-systems-led-m32c22tizen-32-tizen";
  const images = [
    "https://thumb.pccomponentes.com/w-530-530/articles/1102/11026312/1196-tv-td-systems-led-m32c22tizen-32-hd-60hz-smart-tv-tizen-hdr-dolby-digital-plus.jpg",
  ];

  const product = await prisma.product.upsert({
    where: { slug },
    update: { image: images[0], images, rating: 3.7, reviewCount: 3 },
    create: {
      slug,
      name: 'TV TD Systems LED M32C22TIZEN 32" HD Smart TV Tizen HDR Dolby Digital Plus',
      category: "TELEVISORES",
      brand: "TD Systems",
      model: "M32C22TIZEN",
      image: images[0],
      images,
      rating: 3.7,
      reviewCount: 3,
      description:
        'Smart TV 32" HD 60Hz con Tizen 8.0 (powered by Samsung), HDR, Dolby Digital Plus, compatible con Netflix, Disney+ y YouTube.',
    },
  });

  const store = "PcComponentes";
  const priceCurrent = 119.89;
  const priceOld = 179.89;
  const discountPercent = Math.round((1 - priceCurrent / priceOld) * 100); // 33 %
  const externalUrl =
    "https://www.pccomponentes.com/tv-td-systems-led-m32c22tizen-32-hd-60hz-smart-tv-tizen-hdr-dolby-digital-plus";

  const existing = await prisma.offer.findUnique({
    where: { productId_store: { productId: product.id, store } },
    select: { priceCurrent: true },
  });

  await prisma.offer.upsert({
    where: { productId_store: { productId: product.id, store } },
    update: { priceCurrent, priceOld, discountPercent, externalUrl, inStock: true },
    create: { productId: product.id, store, priceCurrent, priceOld, discountPercent, externalUrl, inStock: true },
  });

  if (!existing || existing.priceCurrent !== priceCurrent) {
    await prisma.priceHistory.create({
      data: { productId: product.id, store, price: priceCurrent },
    });
  }

  console.log(`✅ Añadido: ${product.name} — ${priceCurrent.toFixed(2)} € en ${store} (antes ${priceOld.toFixed(2)} €, -${discountPercent}%)`);
  console.log(`   ID: ${product.id} | Slug: ${slug}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
