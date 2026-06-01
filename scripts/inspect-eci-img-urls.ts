import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: getDatabaseUrl() }) });

async function main() {
  const r = await p.product.findMany({
    where: { slug: { startsWith: "eci-" } },
    select: { slug: true, image: true, images: true },
    take: 10,
  });
  for (const x of r) {
    console.log(`\n${x.slug}`);
    for (const i of x.images) console.log(`  ${i}`);
  }
}
main().catch(console.error).finally(() => p.$disconnect());
