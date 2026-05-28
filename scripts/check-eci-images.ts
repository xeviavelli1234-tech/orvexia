import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const r = await p.product.findMany({
    where: { slug: { startsWith: "eci-" } },
    select: { slug: true, image: true, images: true, offers: { where: { store: { contains: "Corte", mode: "insensitive" } }, select: { externalUrl: true } } },
  });
  console.log(`ECI products: ${r.length}`);
  const counts = r.map(x => x.images.length);
  const histogram: Record<number, number> = {};
  for (const c of counts) histogram[c] = (histogram[c] || 0) + 1;
  console.log("Images count histogram:", histogram);
  console.log("\nSample URL:", r[0]?.offers[0]?.externalUrl);
}
main().catch(console.error).finally(() => p.$disconnect());
