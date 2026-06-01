import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: getDatabaseUrl() }) });
async function main() {
  const r = await p.product.findMany({ where: { slug: { startsWith: "eci-" } }, select: { image: true }, take: 100 });
  const hosts = new Set<string>();
  for (const x of r) { try { if (x.image) hosts.add(new URL(x.image).hostname); } catch {} }
  console.log("ECI image hosts:", [...hosts]);
}
main().catch(console.error).finally(() => p.$disconnect());
