import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const all = await p.product.findMany({
    where: { slug: { startsWith: "eci-" } },
    include: { offers: { where: { store: { contains: "Corte", mode: "insensitive" } } } },
    orderBy: { category: "asc" },
  });
  console.log(`ECI products: ${all.length}\n`);
  for (const prod of all) {
    const o = prod.offers[0];
    const discCalc = o.priceOld ? Math.round(((o.priceOld - o.priceCurrent) / o.priceOld) * 100) : null;
    const mismatch = discCalc !== o.discountPercent ? ` ⚠mismatch(${o.discountPercent}%)` : "";
    console.log(`${prod.category.padEnd(20)} | ${o.priceCurrent}€ (was ${o.priceOld ?? "-"}€) -${discCalc ?? 0}%${mismatch} | ${prod.name.slice(0, 50)}`);
  }
}
main().catch(console.error).finally(() => p.$disconnect());
