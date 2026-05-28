import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const tvs = await prisma.product.findMany({
    where: {
      category: "LAVADORAS",
      offers: { some: { store: { equals: "Fnac", mode: "insensitive" } } },
    },
    include: { offers: { where: { store: { equals: "Fnac", mode: "insensitive" } } } },
  });

  console.log(`Encontrados ${tvs.length} LAVADORAS con oferta FNAC\n`);
  for (const t of tvs) {
    const o = t.offers[0];
    console.log(`- ${t.brand} ${t.model} | ${t.name}`);
    console.log(`  slug: ${t.slug} | img: ${t.image ? "Y" : "N"} | rating: ${t.rating ?? "-"} (${t.reviewCount ?? 0})`);
    console.log(`  price: ${o?.priceCurrent}€ old:${o?.priceOld ?? "-"} url:${o?.externalUrl?.slice(0, 80)}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
