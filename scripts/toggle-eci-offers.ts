/**
 * toggle-eci-offers.ts
 * Marca todas las ofertas de El Corte Inglés como fuera de stock (desactiva)
 * o en stock (reactiva). Reversible — no borra productos ni historial.
 *
 * Usage:
 *   npx tsx scripts/toggle-eci-offers.ts off --confirm   # desactiva
 *   npx tsx scripts/toggle-eci-offers.ts on  --confirm   # reactiva
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: getDatabaseUrl() }) });

async function main() {
  const mode = process.argv[2];
  const confirm = process.argv.includes("--confirm");
  if (mode !== "on" && mode !== "off") {
    console.error("Usa: toggle-eci-offers.ts on|off [--confirm]");
    process.exit(1);
  }
  const inStock = mode === "on";
  const n = await p.offer.count({ where: { store: { contains: "Corte", mode: "insensitive" } } });
  console.log(`${n} ofertas ECI → inStock=${inStock}`);
  if (!confirm) { console.log("DRY RUN — pasa --confirm."); return; }
  const r = await p.offer.updateMany({
    where: { store: { contains: "Corte", mode: "insensitive" } },
    data: { inStock },
  });
  console.log(`✅ ${r.count} ofertas actualizadas.`);
}
main().catch(console.error).finally(() => p.$disconnect());
