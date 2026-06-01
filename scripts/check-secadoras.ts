import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
});

async function main() {
  const products = await prisma.product.findMany({
    where: { category: "SECADORAS" },
    include: {
      offers: { select: { store: true, externalUrl: true, priceCurrent: true } },
    },
  });
  console.log(`Found ${products.length} product(s):\n`);
  for (const p of products) {
    console.log(`slug:  ${p.slug}`);
    console.log(`name:  ${p.name}`);
    console.log(`cat:   ${p.category}`);
    console.log(`image: ${p.image}`);
    console.log(`images (${Array.isArray(p.images) ? (p.images as string[]).length : 0}): ${JSON.stringify(p.images).substring(0, 120)}`);
    console.log(`offers: ${p.offers.map(o => `${o.store} ${o.priceCurrent}€ ${o.externalUrl}`).join(" | ")}`);
    console.log("---");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
