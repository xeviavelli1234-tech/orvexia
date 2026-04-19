import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const slug = "philips-led-40-40pfs6000-fullhd-titan";
  const images = [
    "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878768/1365-philips-led-40-40pfs6000-fullhd-dolby-audio-hdr10-titan.jpg",
  ];

  const product = await prisma.product.upsert({
    where: { slug },
    update: { image: images[0], images, rating: 4.4, reviewCount: 174 },
    create: {
      slug,
      name: 'Philips LED 40" 40PFS6000 FullHD Dolby Audio HDR10 Titan',
      category: "TELEVISORES",
      brand: "Philips",
      model: "40PFS6000/12",
      image: images[0],
      images,
      rating: 4.4,
      reviewCount: 174,
      description:
        'Smart TV 40" Full HD con Direct LED, Pixel Plus HD, HDR10, HLG, Dolby Audio con Vocal Boost, Titan OS, 3x HDMI, Wi-Fi, DVB-T/T2/C/S2.',
    },
  });

  const store = "PcComponentes";
  const priceCurrent = 189.00;
  const priceOld = 319.00;   // precio original PcComponentes
  const discountPercent = Math.round((1 - priceCurrent / priceOld) * 100); // 41 %
  const externalUrl =
    "https://www.pccomponentes.com/philips-led-40-40pfs6000-fullhd-dolby-audio-hdr10-titan";

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
