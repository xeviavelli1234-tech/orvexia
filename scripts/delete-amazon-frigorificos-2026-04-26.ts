/**
 * Borra los 10 frigoríficos Amazon insertados en commit b363ce3 para volver
 * a 20 productos Amazon en la categoría FRIGORIFICOS (homogéneo con el resto
 * de categorías). Todos los modelos ya estaban cubiertos por ofertas previas
 * con el mismo ASIN o el mismo modelo.
 *
 * Uso:
 *   npx tsx scripts/delete-amazon-frigorificos-2026-04-26.ts
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  console.log("⏭️  no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ASINS_TO_DELETE = [
  "B0BYHMVWGZ",
  "B0FTDV9JGW",
  "B0G2Z33K4K",
  "B0F351DLPY",
  "B0F1P57B4Y",
  "B0BPZKV8YT",
  "B0DN5WW6KW",
  "B0CYH72M4S",
  "B0CK6FYLJ9",
  "B0DJ8ZCPK7",
];

async function main() {
  let deleted = 0;
  for (const asin of ASINS_TO_DELETE) {
    const products = await prisma.product.findMany({
      where: { slug: { startsWith: `amazon-${asin.toLowerCase()}-` } },
      select: { id: true, slug: true, name: true },
    });
    for (const p of products) {
      // schema tiene onDelete: Cascade en Offer/PriceHistory/BuySignal/etc.
      await prisma.product.delete({ where: { id: p.id } });
      console.log(`🗑️  ${asin} | ${p.slug.slice(0, 80)}`);
      deleted++;
    }
  }
  console.log(`\n🎯 ${deleted} productos borrados`);
}

main()
  .catch((e) => {
    console.error("❌ error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
