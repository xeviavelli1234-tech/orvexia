/**
 * clean-price-history.ts
 * Elimina registros de PriceHistory que son errores de scraping:
 * precios que son >3× o <10% del precio actual del producto.
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const offers = await prisma.offer.findMany({
    select: { productId: true, store: true, priceCurrent: true },
  });

  let deleted = 0;

  for (const offer of offers) {
    const min = offer.priceCurrent * 0.10;
    const max = offer.priceCurrent * 3.00;

    const result = await prisma.priceHistory.deleteMany({
      where: {
        productId: offer.productId,
        store:     offer.store,
        OR: [
          { price: { lt: min } },
          { price: { gt: max } },
        ],
      },
    });

    if (result.count > 0) {
      console.log(`🧹 ${result.count} registros eliminados — precio actual ${offer.priceCurrent.toFixed(2)} € (rango válido: ${min.toFixed(2)}-${max.toFixed(2)} €)`);
      deleted += result.count;
    }
  }

  console.log(`\n✅ Total eliminados: ${deleted} registros de historial corruptos`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
