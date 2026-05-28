import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const all = await p.product.findMany({
    where: { category: "AIRES_ACONDICIONADOS", offers: { some: { store: { equals: "Fnac", mode: "insensitive" } } } },
    include: { offers: { where: { store: { equals: "Fnac", mode: "insensitive" } } } },
    orderBy: { createdAt: "asc" },
  });
  console.log(`${all.length} FNAC aires:\n`);
  for (const t of all) {
    const o = t.offers[0];
    console.log(`  ${t.brand} | ${t.name.slice(0, 80)} | ${o.priceCurrent}€${o.priceOld ? ` (was ${o.priceOld}€)` : ""}`);
  }
}
main().catch(console.error).finally(() => p.$disconnect());
