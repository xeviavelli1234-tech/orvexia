import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const dryRun = process.argv[2] !== "--confirm";

  const victims = await prisma.product.findMany({
    where: {
      category: "LAVADORAS",
      offers: { some: { store: { equals: "Fnac", mode: "insensitive" } } },
    },
    include: { offers: true },
  });

  console.log(`${victims.length} lavadoras FNAC encontradas:\n`);
  let fnacOnly = 0;
  let multiStore = 0;
  for (const p of victims) {
    const stores = p.offers.map(o => o.store);
    const isFnacOnly = stores.every(s => s.toLowerCase() === "fnac");
    if (isFnacOnly) fnacOnly++; else multiStore++;
    const tag = isFnacOnly ? "  " : "⚠ ";
    console.log(`${tag}${p.brand} ${p.model} | offers: [${stores.join(", ")}]`);
  }
  console.log(`\nSolo FNAC: ${fnacOnly} · Con otras tiendas: ${multiStore}`);

  if (dryRun) {
    console.log(`\nDRY RUN — pasa --confirm para borrar.`);
    return;
  }

  const ids = victims.map(p => p.id);
  const deleted = await prisma.product.deleteMany({ where: { id: { in: ids } } });
  console.log(`\n🗑  Borradas ${deleted.count} lavadoras (cascade).`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
