import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.offer.updateMany({
    where: {},
    data: { inStock: true },
  });
  console.log(`✅ ${result.count} ofertas actualizadas → inStock = true`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
