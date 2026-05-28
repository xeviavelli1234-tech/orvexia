import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  // Fix descripción con encoding roto en Smart Tech 32HG01V
  const smartTech = await prisma.product.findFirst({
    where: { model: { equals: "32HG01V", mode: "insensitive" } },
    select: { id: true, name: true, description: true },
  });

  if (smartTech) {
    await prisma.product.update({
      where: { id: smartTech.id },
      data: {
        description: '32" (80 cm) HD LED con Google TV, Chromecast integrado, Dolby Audio, Wi-Fi, Ethernet, DVB-T2/S2/C.',
        rating: 4.0,
        reviewCount: 0,
      },
    });
    console.log(`✅ ${smartTech.name} — descripción corregida`);
  } else {
    console.log("❌ Smart Tech 32HG01V no encontrado");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
