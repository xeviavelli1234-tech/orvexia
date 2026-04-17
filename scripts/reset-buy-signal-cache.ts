import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const r = await prisma.buySignal.updateMany({ where: {}, data: { calculatedAt: new Date(0) } });
  console.log(`✅ Cache invalidado: ${r.count} señales — se recalcularán al próximo acceso`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
