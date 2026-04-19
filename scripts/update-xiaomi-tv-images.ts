import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const base = "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934126";
const images = [
  `${base}/1254-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-mejor-precio.jpg`,
  `${base}/2191-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-caracteristicas.jpg`,
  `${base}/3516-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-opiniones.jpg`,
  `${base}/4970-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-review.jpg`,
  `${base}/5626-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-ce943e2a-33a9-4e12-93fa-61f0122a2057.jpg`,
  `${base}/6480-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-f5c25858-3b46-4531-a48a-aa542fb68c79.jpg`,
  `${base}/7791-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-e0f66b23-c51a-44fa-81fc-4e5c00174610.jpg`,
  `${base}/8258-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-486091f3-1a9c-4f42-a3c6-ba3936a47a6b.jpg`,
];

async function main() {
  const r = await prisma.product.update({
    where: { slug: "xiaomi-tv-a-pro-32-2026-qled" },
    data: { image: images[0], images },
  });
  console.log(`✅ ${r.name} — ${images.length} imágenes actualizadas`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
