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
    slug: "lg-led-43ua73006la-43-4k-webos",
    name: 'LG LED 43" 43UA73006LA 4K UHD Smart TV HDR10 WiFi Bluetooth Sin Marco',
    brand: "LG", model: "43UA73006LA.AEUQ",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891056/1110-lg-led-43ua73006la-43-4k-uhd-smart-tv-hdr10-wifi-bluetooth-sin-marco.jpg",
    rating: 4.5, reviewCount: 77,
    description: 'Smart TV 43" 4K Direct LED con WebOS 25, AI Sound Pro 20W, HDMI 2.1, VRR/ALLM, WiFi 5, Bluetooth 5.1, diseño sin marco.',
    priceCurrent: 290.90, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/lg-led-43ua73006la-43-4k-uhd-smart-tv-hdr10-wifi-bluetooth-sin-marco",
    inStock: true,
  },
  {
    slug: "lg-led-50ua73006la-50-4k-webos",
    name: 'LG LED 50" 50UA73006LA 4K Ultra HD Smart TV WebOS AI Sound Pro Dolby',
    brand: "LG", model: "50UA73006LA.AEUQ",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891055/1310-lg-led-50ua73006la-50-4k-ultra-hd-smart-tv-webos-ai-sound-pro-dolby-control-voz.jpg",
    rating: 4.5, reviewCount: 77,
    description: 'Smart TV 50" 4K Direct LED con WebOS 25, AI Sound Pro, Dolby Digital, HDR10/HLG, HDMI 2.1, WiFi 5, Bluetooth 5.1, AirPlay 2.',
    priceCurrent: 326.90, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/lg-led-50ua73006la-50-4k-ultra-hd-smart-tv-webos-ai-sound-pro-dolby-control-voz",
    inStock: true,
  },
  {
    slug: "lg-led-32lr60006la-32-fullhd-webos",
    name: 'TV LG LED 32" 32LR60006LA FullHD WebOS HDR10 Pro',
    brand: "LG", model: "32LR60006LA.AEUQ",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874587/1475-lg-led-32-32lr60006laaeuq-fullhd-webos-hdr10-pro-review.jpg",
    rating: 4.5, reviewCount: 38,
    description: 'Smart TV 32" Full HD con WebOS, Procesador Σ5 AI Gen6, HDR10 Pro, AI Sound, compatible con las principales apps de streaming.',
    priceCurrent: 249.00, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/tv-lg-led-32-32lr60006laaeuq-fullhd-webos-hdr10-pro",
    inStock: true,
  },
  {
    slug: "haier-s8-h65s800ug-65-qled-4k",
    name: 'Haier S8 Series H65S800UG 65" QLED UltraHD 4K HDR10 Smart TV',
    brand: "Haier", model: "H65S800UG",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1072/10727786/1493-haier-s8-series-h65s800ug-65-qled-ultrahd-4k-hdr10-smart-tv.jpg",
    rating: 4.4, reviewCount: 1035,
    description: '65" HQLED 4K Direct LED con Android TV 11, Dolby Atmos, 4x HDMI 2.1, HDR10, control por voz.',
    priceCurrent: 881.25, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/haier-s8-series-h65s800ug-65-qled-ultrahd-4k-hdr10-smart-tv",
    inStock: true,
  },
  {
    slug: "hisense-65a6q-65-4k-reacondicionado",
    name: 'Hisense 65A6Q 65" 4K Dolby Vision HDR10+ Game Mode Alexa VIDAA Reacondicionado',
    brand: "Hisense", model: "65A6Q-RAS",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878820/1837-hisense-direct-led-65a6q-65-4k-dolby-vision-hdr10-game-mode-plus-alexa-vidaa.jpg",
    rating: 4.5, reviewCount: 78,
    description: '65" 4K Direct LED reacondicionado con Dolby Vision, HDR10+, Alexa integrada, Game Mode Plus, VIDAA smart platform, DTS Virtual:X.',
    priceCurrent: 368.40, priceOld: 402.99,
    externalUrl: "https://www.pccomponentes.com/hisense-direct-led-65a6q-65-4k-dolby-vision-hdr10-game-mode-plus-alexa-vidaa?refurbished",
    inStock: true,
  },
  {
    slug: "xiaomi-a-pro-2026-50-qled-4k",
    name: 'Xiaomi A Pro 2026 50" QLED 4K UltraHD Smart TV Dolby Audio Game Boost HDR Google TV',
    brand: "Xiaomi", model: "ELA6088EU",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1094/10948933/1377-xiaomi-a-pro-2026-50-qled-4k-ultrahd-smart-tv-dolby-audio-game-boost-hdr-google-tv-caracteristicas.jpg",
    rating: 4.8, reviewCount: 6,
    description: '50" QLED 4K con DCI-P3 94%, 120Hz Game Boost HDMI, Dolby Audio, DTS, Google TV.',
    priceCurrent: 440.69, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/xiaomi-qled-50-a-pro-2026-qled-4k-ultrahd-smart-tv-dolby-audio-game-boost-hdr-google-tv",
    inStock: true,
  },
  {
    slug: "xiaomi-a-2025-50-led-4k",
    name: 'Xiaomi A 2025 50" LED UltraHD 4K Dolby Atmos Google TV',
    brand: "Xiaomi", model: "ELA5489EU",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1082/10822186/1747-xiaomi-a-2025-50-led-ultrahd-4k-dolby-atmos-google-tv.jpg",
    rating: 4.4, reviewCount: 642,
    description: '50" 4K LED sin marco con Google TV, Dolby Atmos, procesador quad-core, altavoces duales 10W.',
    priceCurrent: 336.99, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/xiaomi-a-2025-50-led-ultrahd-4k-dolby-atmos-google-tv",
    inStock: true,
  },
  {
    slug: "tcl-65p8k-65-qled-4k-onkyo",
    name: 'TCL QLED 65" 65P8K UltraHD 4K Sonido Onkyo Google TV',
    brand: "TCL", model: "65P8K",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1087/10879300/1222-tcl-qled-65-65p8k-ultrahd-4k-sonido-onkyo-google-tv.jpg",
    rating: 4.7, reviewCount: 32,
    description: '65" QLED 4K 144Hz nativo con sistema de sonido Onkyo 2.1, Google TV, ALLM, VRR.',
    priceCurrent: 557.77, priceOld: 575.96,
    externalUrl: "https://www.pccomponentes.com/tcl-qled-65-65p8k-ultrahd-4k-sonido-onkyo-google-tv",
    inStock: true,
  },
  {
    slug: "tcl-65p6k-65-4k-google-tv",
    name: 'TV TCL LED P6K 65P6K 65" 4K Dolby Audio HDR10 Google TV',
    brand: "TCL", model: "65P6K",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1091/10911634/1391-tv-tcl-led-p6k-65p6k-65-4k-dolby-audio-hdr10-google-tv-opiniones.jpg",
    rating: 4.5, reviewCount: 256,
    description: '65" 4K LED con Google TV, Dolby Audio, HDR10, DVB-T2/S2/C, PPI 2500.',
    priceCurrent: 491.72, priceOld: 592.90,
    externalUrl: "https://www.pccomponentes.com/tv-tcl-led-p6k-65p6k-65-4k-dolby-audio-hdr10-google-tv",
    inStock: true,
  },
  {
    slug: "tcl-50v6c-50-4k-google-tv",
    name: 'TV TCL LED 50V6C 50" 4K Ultra HD 60Hz Smart TV Google TV Dolby Vision HDR10',
    brand: "TCL", model: "50V6C",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1103/11034886/1228-tv-tcl-led-50v6c-50-4k-ultra-hd-60hz-smart-tv-google-tv-dolby-vision-hdr10.jpg",
    rating: 4.4, reviewCount: 909,
    description: '50" 4K Direct LED sin marcos con Google TV, Dolby Vision, HDR10+, Dolby Atmos.',
    priceCurrent: 371.49, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/tv-tcl-led-50v6c-50-4k-ultra-hd-60hz-smart-tv-google-tv-dolby-vision-hdr10",
    inStock: true,
  },
  {
    slug: "tcl-55t8c-55-qled-4k-google-tv",
    name: 'TV TCL QLED 55T8C 55" 4K Ultra HD Smart TV Google TV HDR10 Dolby Vision',
    brand: "TCL", model: "55T8C",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1098/10989285/1459-tv-tcl-qled-55t8c-55-4k-ultra-hd-smart-tv-google-tv-hdr10-dolby-vision.jpg",
    rating: 3.7, reviewCount: 315,
    description: '55" QLED 4K con Google TV, Dolby Vision, HDR10, HDMI 2.1, control por voz.',
    priceCurrent: 623.01, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/tv-tcl-qled-55t8c-55-4k-ultra-hd-smart-tv-google-tv-hdr10-dolby-vision",
    inStock: true,
  },
  {
    slug: "xiaomi-tv-s-2025-65-qd-mini-led",
    name: 'Xiaomi TV S 2025 65" QD Mini LED UltraHD 4K Google TV',
    brand: "Xiaomi", model: "ELA5674EU",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1086/10862918/1112-xiaomi-tv-s-2025-65-qd-mini-led-ultrahd-4k-google-tv-dd929673-788d-407e-b80c-4e5692373aef.jpg",
    rating: 4.6, reviewCount: 87,
    description: '65" QD Mini LED 4K 144Hz con Dolby Vision IQ, HDR10+, IMAX Enhanced, Google TV, FreeSync Premium.',
    priceCurrent: 579.00, priceOld: 1099.00,
    externalUrl: "https://www.pccomponentes.com/xiaomi-tv-s-2025-65-qd-mini-led-ultrahd-4k-google-tv",
    inStock: true,
  },
];

async function main() {
  let added = 0;

  for (const p of products) {
    const discountPercent = p.priceOld
      ? Math.round((1 - p.priceCurrent / p.priceOld) * 100)
      : 0;

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: { image: p.image, images: [p.image], rating: p.rating, reviewCount: p.reviewCount },
      create: {
        slug: p.slug,
        name: p.name,
        category: "TELEVISORES",
        brand: p.brand,
        model: p.model,
        image: p.image,
        images: [p.image],
        rating: p.rating,
        reviewCount: p.reviewCount,
        description: p.description,
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
      await prisma.priceHistory.create({
        data: { productId: product.id, store: STORE, price: p.priceCurrent },
      });
    }

    const priceInfo = p.priceOld
      ? `${p.priceCurrent.toFixed(2)} € (antes ${p.priceOld.toFixed(2)} €, -${discountPercent}%)`
      : `${p.priceCurrent.toFixed(2)} €`;
    console.log(`✅ ${p.name} — ${priceInfo}`);
    added++;
  }

  console.log(`\n🎉 ${added} productos añadidos/actualizados en ${STORE}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
