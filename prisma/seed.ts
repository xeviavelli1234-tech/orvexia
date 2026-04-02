import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Insertando productos...");

  await prisma.product.upsert({
    where: { slug: "xiaomi-tv-f-65-2025" },
    update: {},
    create: {
      slug: "xiaomi-tv-f-65-2025",
      name: "Xiaomi TV F 65",
      category: "TELEVISORES",
      brand: "Xiaomi",
      model: "TV F 65",
      image: "https://m.media-amazon.com/images/I/51PLQ-Xf9sL._AC_SX425_.jpg",
      description:
        "65 Pulgadas (165 cm), 4K UHD, Smart TV, Fire OS 8, Control por Voz Alexa, HDR10, MEMC, Modo Game Boost 120Hz, 2GB+32GB, Compatible con Apple AirPlay. Clase de eficiencia energética F.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 389.0,
          priceOld: null,
          discountPercent: null,
          externalUrl:
            "https://www.amazon.es/XIAOMI-Pulgadas-Control-Compatible-AirPlay/dp/B0F457MQCQ/",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Xiaomi TV F 65 insertada en Amazon");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
