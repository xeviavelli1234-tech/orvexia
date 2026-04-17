// Restaura el caché a "ahora" para que los badges vuelvan a aparecer inmediatamente
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const r = await prisma.buySignal.updateMany({ where: {}, data: { calculatedAt: new Date() } });
  console.log(`✅ Caché restaurado: ${r.count} señales válidas por 1 hora`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
