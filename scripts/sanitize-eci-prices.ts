/**
 * sanitize-eci-prices.ts
 * Descarta PVPR inflados (priceOld/priceCurrent > 2.1) en ofertas ECI.
 * Recalcula discountPercent desde los valores saneados.
 *
 * Usage:
 *   npx tsx scripts/sanitize-eci-prices.ts            # dry-run
 *   npx tsx scripts/sanitize-eci-prices.ts --confirm
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const MAX_DISCOUNT_RATIO = 2.1;
const CONFIRM = process.argv.includes("--confirm");

async function main() {
  const offers = await p.offer.findMany({
    where: { store: { contains: "Corte", mode: "insensitive" }, priceOld: { not: null } },
    include: { product: { select: { name: true, slug: true } } },
  });

  let affected = 0;
  for (const o of offers) {
    if (!o.priceOld) continue;
    const ratio = o.priceOld / o.priceCurrent;
    if (ratio <= MAX_DISCOUNT_RATIO) continue;
    affected++;
    const newOld: number | null = null;
    const newDisc: number | null = null;
    console.log(`  ratio=${ratio.toFixed(2)}x · ${o.priceCurrent}€ / was ${o.priceOld}€ (-${o.discountPercent}%) → sin PVPR · ${o.product.name.slice(0, 55)}`);
    if (CONFIRM) {
      await p.offer.update({
        where: { id: o.id },
        data: { priceOld: newOld, discountPercent: newDisc },
      });
    }
  }

  console.log(`\n${affected} ofertas ECI con PVPR inflado (ratio > ${MAX_DISCOUNT_RATIO}x)`);
  console.log(CONFIRM ? "✅ Limpiado." : "DRY RUN — pasa --confirm para aplicar.");
}
main().catch(console.error).finally(() => p.$disconnect());
