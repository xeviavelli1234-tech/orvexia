import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: getDatabaseUrl() }) });

async function main() {
  const KEEP = 20;
  const all = await p.product.findMany({
    where: { category: "MICROONDAS", offers: { some: { store: { equals: "Fnac", mode: "insensitive" } } } },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true },
  });
  console.log(`Total FNAC microondas: ${all.length} · keep newest ${KEEP}`);
  const victims = all.slice(KEEP);
  console.log(`Deleting ${victims.length}:`);
  victims.forEach(v => console.log(`  - ${v.name}`));
  const r = await p.product.deleteMany({ where: { id: { in: victims.map(v => v.id) } } });
  console.log(`🗑 ${r.count} borrados`);
}
main().catch(console.error).finally(() => p.$disconnect());
