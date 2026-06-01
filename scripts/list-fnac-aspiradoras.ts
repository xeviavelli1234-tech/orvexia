import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: getDatabaseUrl() }) });

async function main() {
  const all = await p.product.findMany({
    where: { category: "ASPIRADORAS", offers: { some: { store: { equals: "Fnac", mode: "insensitive" } } } },
    include: { offers: { where: { store: { equals: "Fnac", mode: "insensitive" } } } },
    orderBy: { createdAt: "asc" },
  });
  console.log(`${all.length} FNAC aspiradoras:\n`);
  for (const t of all) {
    const o = t.offers[0];
    const flag = /bolsa|filtro|accesor|recambio|cepillo|manguera|tubo|boquilla|para aspirador|kit|repuesto/i.test(t.name) ? "🟥" : "✓ ";
    console.log(`${flag} ${t.brand} | ${t.name.slice(0, 70)} | ${o.priceCurrent}€${o.priceOld ? ` (was ${o.priceOld}€)` : ""}`);
  }
}
main().catch(console.error).finally(() => p.$disconnect());
