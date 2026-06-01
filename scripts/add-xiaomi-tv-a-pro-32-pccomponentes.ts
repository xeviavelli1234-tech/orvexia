import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
});

async function main() {
  const slug = "xiaomi-tv-a-pro-32-2026-qled";
  const images = [
    "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934126/1254-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-mejor-precio.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934126/2191-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-caracteristicas.jpg",
  ];

  const product = await prisma.product.upsert({
    where: { slug },
    update: { image: images[0], images, rating: 4.3, reviewCount: 109 },
    create: {
      slug,
      name: 'Xiaomi TV A Pro 32 2026 32" QLED HD Google TV',
      category: "TELEVISORES",
      brand: "Xiaomi",
      model: "ELA5936EU",
      image: images[0],
      images,
      rating: 4.3,
      reviewCount: 109,
      description:
        'Smart TV 32" QLED HD con Google TV, Chromecast integrado, sonido DTS:X y Dolby Audio, Wi-Fi dual, Bluetooth 5.0.',
    },
  });

  const store = "PcComponentes";
  const priceCurrent = 139.00;
  const priceOld = 149.00;   // precio mínimo últimos 30 días (PcC muestra 149 € tachado)
  const discountPercent = Math.round((1 - priceCurrent / priceOld) * 100); // 7 %
  const externalUrl =
    "https://www.pccomponentes.com/xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts";

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

  console.log(`✅ Añadido: ${product.name} — ${priceCurrent.toFixed(2)} € en ${store}`);
  console.log(`   ID: ${product.id} | Slug: ${slug}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
