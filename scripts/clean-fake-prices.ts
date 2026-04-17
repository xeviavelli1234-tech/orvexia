/**
 * clean-fake-prices.ts
 * Limpia priceOld y discountPercent falsos de la BD.
 * Un "priceOld" es falso cuando el ratio priceOld/priceCurrent > 1.40
 * (Amazon infla el PVPR para simular grandes descuentos que no son reales).
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const MAX_RATIO = 1.40; // máximo descuento creíble: ~28%

async function main() {
  const offers = await prisma.offer.findMany({
    where: { priceOld: { not: null } },
    select: { id: true, priceCurrent: true, priceOld: true, discountPercent: true },
  });

  let cleaned = 0;
  let kept = 0;

  for (const o of offers) {
    if (!o.priceOld) continue;
    const ratio = o.priceOld / o.priceCurrent;

    if (ratio > MAX_RATIO) {
      await prisma.offer.update({
        where: { id: o.id },
        data: { priceOld: null, discountPercent: 0 },
      });
      console.log(`🧹 Limpiado — ${o.priceCurrent.toFixed(2)} € (priceOld era ${o.priceOld.toFixed(2)} €, ratio ${ratio.toFixed(2)}x)`);
      cleaned++;
    } else {
      kept++;
    }
  }

  console.log(`\n✅ ${cleaned} precios falsos eliminados · ${kept} precios reales conservados`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
