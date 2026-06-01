import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: getDatabaseUrl() }) });

const JUNK = /bolsa|filtro|accesor|recambio|cepillo|manguera|tubo|boquilla|para\s+aspirador|kit\s+aspirador|repuesto|suministro|bater[ií]a/i;

async function main() {
  const all = await p.product.findMany({
    where: { category: "ASPIRADORAS", offers: { some: { store: { equals: "Fnac", mode: "insensitive" } } } },
    select: { id: true, name: true },
  });
  const junk = all.filter(x => JUNK.test(x.name));
  console.log(`Borrando ${junk.length} junk:`);
  junk.forEach(x => console.log("  - " + x.name));
  const r = await p.product.deleteMany({ where: { id: { in: junk.map(v => v.id) } } });
  console.log(`🗑 ${r.count} borrados`);
}
main().catch(console.error).finally(() => p.$disconnect());
