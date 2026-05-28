import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const JUNK = /mando\s+a\s+distancia|accesor|recambio|^filtro|kit\s+aire|para\s+aire|ventilador|humidificador|deshumidificador|purificador/i;

async function main() {
  const all = await p.product.findMany({
    where: { category: "AIRES_ACONDICIONADOS", offers: { some: { store: { equals: "Fnac", mode: "insensitive" } } } },
    select: { id: true, name: true },
  });
  const junk = all.filter(x => JUNK.test(x.name));
  console.log(`Borrando ${junk.length}:`);
  junk.forEach(x => console.log("  - " + x.name));
  const r = await p.product.deleteMany({ where: { id: { in: junk.map(v => v.id) } } });
  console.log(`🗑 ${r.count} borrados`);
}
main().catch(console.error).finally(() => p.$disconnect());
