import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: getDatabaseUrl() }) });

async function main() {
  const cats = ["TELEVISORES","LAVADORAS","FRIGORIFICOS","LAVAVAJILLAS","SECADORAS","HORNOS","MICROONDAS","ASPIRADORAS","CAFETERAS","AIRES_ACONDICIONADOS","OTROS"] as const;
  for (const c of cats) {
    const n = await p.product.count({
      where: { category: c, offers: { some: { store: { equals: "Fnac", mode: "insensitive" } } } },
    });
    if (n > 0) console.log(`${c}: ${n} FNAC`);
  }
}
main().catch(console.error).finally(() => p.$disconnect());
