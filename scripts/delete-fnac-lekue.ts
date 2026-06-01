import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: getDatabaseUrl() }) });

async function main() {
  const victims = await prisma.product.findMany({
    where: {
      category: "MICROONDAS",
      OR: [
        { brand: { equals: "Lekue", mode: "insensitive" } },
        { name: { contains: "Grill Para Microondas", mode: "insensitive" } },
        { name: { contains: "Palomitero", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });
  console.log(`Borrando ${victims.length}:`);
  victims.forEach(v => console.log(`  - ${v.name}`));
  const r = await prisma.product.deleteMany({ where: { id: { in: victims.map(v => v.id) } } });
  console.log(`🗑 ${r.count} borradas`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
