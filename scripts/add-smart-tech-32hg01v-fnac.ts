import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const STORE = "Fnac";

async function main() {
  const slug = "smart-tech-32hg01v-32-hd-google-tv";
  const model = "32HG01V";
  const name = 'TV LED 32" Smart Tech 32HG01V (80 cm) HD Google TV';
  const image = "https://www.smarttech-tv.com/image/cache/catalog/32HG01V%20PP/32HG01V%20-%201-700x500.jpg";
  const priceCurrent = 149.54;
  const priceOld = null;
  const discountPercent = 0;
  // Enlace de afiliado Awin/Fnac
  const externalUrl =
    "https://www.awin1.com/cread.php?awinmid=77630&awinaffid=2854543&platform=dl&ued=https%3A%2F%2Fwww.fnac.es%2Fmp9543851%2FTV-LED-32-Smart-Tech-32HG01V-32-80-cm-HD-Google-LED-TV-Gris-E";

  const existing = await prisma.product.findFirst({
    where: { model: { equals: model, mode: "insensitive" } },
    select: { id: true, name: true },
  });

  if (existing) {
    console.log(`⚠️  Ya existe: ${existing.name} (id: ${existing.id})`);
    // Actualizar imagen si está mal y añadir oferta Fnac
    await prisma.product.update({
      where: { id: existing.id },
      data: { image, images: [image] },
    });
    await prisma.offer.upsert({
      where: { productId_store: { productId: existing.id, store: STORE } },
      update: { priceCurrent, priceOld, discountPercent, externalUrl, inStock: true },
      create: { productId: existing.id, store: STORE, priceCurrent, priceOld, discountPercent, externalUrl, inStock: true },
    });
    await prisma.priceHistory.create({
      data: { productId: existing.id, store: STORE, price: priceCurrent },
    });
    console.log(`✅ Imagen actualizada y oferta Fnac añadida — ${priceCurrent.toFixed(2)} €`);
    return;
  }

  const product = await prisma.product.upsert({
    where: { slug },
    update: { image, images: [image] },
    create: {
      slug,
      name,
      category: "TELEVISORES",
      brand: "Smart Tech",
      model,
      image,
      images: [image],
      rating: 4.0,
      reviewCount: 0,
      description: '32" (80 cm) HD LED con Google TV, Chromecast integrado, Dolby Audio, Wi-Fi, DVB-T2/S2/C.',
    },
  });

  await prisma.offer.upsert({
    where: { productId_store: { productId: product.id, store: STORE } },
    update: { priceCurrent, priceOld, discountPercent, externalUrl, inStock: true },
    create: { productId: product.id, store: STORE, priceCurrent, priceOld, discountPercent, externalUrl, inStock: true },
  });

  await prisma.priceHistory.create({
    data: { productId: product.id, store: STORE, price: priceCurrent },
  });

  console.log(`✅ ${name} — ${priceCurrent.toFixed(2)} € [${STORE}]`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
