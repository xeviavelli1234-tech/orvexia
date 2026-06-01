/**
 * delete-eci-offers.ts
 * Borra todas las ofertas ECI. Los productos quedan en DB pero sin oferta ECI
 * (no aparecen como disponibles). Reversible re-corriendo add-store-bulk.ts.
 *
 * Usage:
 *   npx tsx scripts/delete-eci-offers.ts              # dry-run
 *   npx tsx scripts/delete-eci-offers.ts --confirm    # aplica
 *   npx tsx scripts/delete-eci-offers.ts --products --confirm   # borra también productos
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: getDatabaseUrl() }) });

async function main() {
  const confirm = process.argv.includes("--confirm");
  const alsoProducts = process.argv.includes("--products");

  const offers = await p.offer.count({ where: { store: { contains: "Corte", mode: "insensitive" } } });
  const prods = await p.product.count({ where: { slug: { startsWith: "eci-" } } });
  console.log(`Ofertas ECI: ${offers} · Productos ECI: ${prods}${alsoProducts ? " (se borrarán también)" : ""}`);

  if (!confirm) { console.log("DRY RUN — pasa --confirm."); return; }

  const r1 = await p.offer.deleteMany({ where: { store: { contains: "Corte", mode: "insensitive" } } });
  console.log(`🗑 ${r1.count} ofertas borradas.`);

  if (alsoProducts) {
    const r2 = await p.product.deleteMany({ where: { slug: { startsWith: "eci-" } } });
    console.log(`🗑 ${r2.count} productos borrados (cascade).`);
  }
}
main().catch(console.error).finally(() => p.$disconnect());
