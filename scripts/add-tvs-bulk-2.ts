import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const STORE = "PcComponentes";

interface ProductData {
  slug: string;
  name: string;
  brand: string;
  model: string;
  image: string;
  rating: number;
  reviewCount: number;
  description: string;
  priceCurrent: number;
  priceOld: number | null;
  externalUrl: string;
  inStock: boolean;
}

const products: ProductData[] = [
  {
    slug: "philips-qled-55pus8400-55-4k-ambilight-titan",
    name: 'TV Philips QLED 55PUS8400 55" 4K UltraHD Ambilight Smart TV Dolby Atmos Titan OS',
    brand: "Philips", model: "55PUS8400/12",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1094/10949184/1976-tv-philips-qled-55pus8400-55-4k-ultrahd-ambilight-smart-tv-dolby-atmos-titan-os.jpg",
    rating: 4.5, reviewCount: 123,
    description: '55" QLED 4K con Ambilight 3 lados, Quantum Dot, Dolby Atmos, Titan OS, HDMI 2.1 VRR/ALLM, Alexa y Google Home.',
    priceCurrent: 379.00, priceOld: 759.00,
    externalUrl: "https://www.pccomponentes.com/tv-philips-qled-55pus8400-55-4k-ultrahd-ambilight-smart-tv-dolby-atmos-titan-os",
    inStock: true,
  },
  {
    slug: "nilait-luxe-55ud8004swos-55-qled-4k-webos",
    name: 'Nilait Luxe 55UD8004SWOS 55" QLED UHD 4K Smart TV WebOS',
    brand: "Nilait", model: "NI-55UD8004SWOS",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1097/10976620/1214-nilait-luxe-55ud8004swos-55-qled-uhd-4k-smart-tv-webos-comprar.jpg",
    rating: 4.5, reviewCount: 941,
    description: '55" QLED 4K 60Hz con WebOS, MEMC, ALLM, HDR10/HLG, 3x HDMI 2.0, Dolby Digital.',
    priceCurrent: 299.00, priceOld: 399.00,
    externalUrl: "https://www.pccomponentes.com/nilait-luxe-55ud8004swos-55-qled-uhd-4k-smart-tv-webos",
    inStock: true,
  },
  {
    slug: "nilait-prisma-32fd7004swos-32-fhd-webos",
    name: 'Nilait Prisma 32FD7004SWOS 32" LED FHD Smart TV WebOS',
    brand: "Nilait", model: "NI-32FD7004SWOS",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1095/10950915/1204-nilait-prisma-32fd7004swos-32-led-fhd-smart-tv-webos-review.jpg",
    rating: 4.5, reviewCount: 941,
    description: '32" Full HD Direct LED con WebOS, 3x HDMI ARC, USB PVR, Dolby Digital Plus.',
    priceCurrent: 129.00, priceOld: 219.00,
    externalUrl: "https://www.pccomponentes.com/nilait-prisma-32fd7004swos-32-led-fhd-smart-tv-webos",
    inStock: true,
  },
  {
    slug: "samsung-ai-qled-55-tq55q7faauxxc-4k-tizen",
    name: 'TV Samsung AI QLED 55" TQ55Q7FAAUXXC UltraHD 4K Quantum HDR Tizen',
    brand: "Samsung", model: "TQ55Q7FAAUXXC",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1087/10877393/1634-samsung-ai-qled-55-tq55q7faauxxc-ultrahd-4k-quantum-hdr-tizen-comprar.jpg",
    rating: 4.6, reviewCount: 480,
    description: '55" QLED 4K con procesador Q4 AI, Quantum HDR10+, Object Tracking Sound Lite, Tizen, mando solar.',
    priceCurrent: 399.00, priceOld: 699.00,
    externalUrl: "https://www.pccomponentes.com/samsung-ai-qled-55-tq55q7faauxxc-ultrahd-4k-quantum-hdr-tizen",
    inStock: true,
  },
  {
    slug: "philips-led-55pus7000-55-4k-titan-os",
    name: 'TV Philips LED 55PUS7000 55" 4K Ultra HD Smart TV HDR10+ Dolby Atmos Titan OS',
    brand: "Philips", model: "55PUS7000/12",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1091/10910888/1650-tv-philips-led-55pus7000-55-4k-ultra-hd-smart-tv-hdr10-dolby-atmos-wifi-bluetooth-comprar.jpg",
    rating: 4.5, reviewCount: 223,
    description: '55" 4K LED con Titan OS, HDR10+, Dolby Atmos, DTS:X, HDMI 2.1, Alexa y Google Home, diseño ultradelgado.',
    priceCurrent: 319.00, priceOld: 599.00,
    externalUrl: "https://www.pccomponentes.com/tv-philips-led-55pus7000-55-4k-ultra-hd-smart-tv-hdr10-dolby-atmos-wifi-bluetooth",
    inStock: true,
  },
];

async function main() {
  // Verificar duplicados por modelo antes de insertar
  const existingModels = await prisma.product.findMany({
    where: { model: { in: products.map((p) => p.model) } },
    select: { model: true, name: true },
  });

  if (existingModels.length > 0) {
    console.log("⚠️  Ya existen en BD (se omitirán):");
    existingModels.forEach((p) => console.log(`   - ${p.name} (${p.model})`));
  }

  const existingModelSet = new Set(existingModels.map((p) => p.model));
  const toAdd = products.filter((p) => !existingModelSet.has(p.model));

  let added = 0;
  for (const p of toAdd) {
    const discountPercent = p.priceOld
      ? Math.round((1 - p.priceCurrent / p.priceOld) * 100)
      : 0;

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: { image: p.image, images: [p.image], rating: p.rating, reviewCount: p.reviewCount },
      create: {
        slug: p.slug, name: p.name, category: "TELEVISORES",
        brand: p.brand, model: p.model, image: p.image, images: [p.image],
        rating: p.rating, reviewCount: p.reviewCount, description: p.description,
      },
    });

    const existing = await prisma.offer.findUnique({
      where: { productId_store: { productId: product.id, store: STORE } },
      select: { priceCurrent: true },
    });

    await prisma.offer.upsert({
      where: { productId_store: { productId: product.id, store: STORE } },
      update: { priceCurrent: p.priceCurrent, priceOld: p.priceOld, discountPercent, externalUrl: p.externalUrl, inStock: p.inStock },
      create: { productId: product.id, store: STORE, priceCurrent: p.priceCurrent, priceOld: p.priceOld, discountPercent, externalUrl: p.externalUrl, inStock: p.inStock },
    });

    if (!existing || existing.priceCurrent !== p.priceCurrent) {
      await prisma.priceHistory.create({ data: { productId: product.id, store: STORE, price: p.priceCurrent } });
    }

    const priceInfo = p.priceOld
      ? `${p.priceCurrent.toFixed(2)} € (antes ${p.priceOld.toFixed(2)} €, -${discountPercent}%)`
      : `${p.priceCurrent.toFixed(2)} €`;
    console.log(`✅ ${p.name} — ${priceInfo}`);
    added++;
  }

  console.log(`\n🎉 ${added} productos añadidos | ${existingModels.length} omitidos por duplicado`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
