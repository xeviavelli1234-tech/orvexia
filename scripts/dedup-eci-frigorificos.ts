/**
 * Borra duplicados de FRIGORIFICOS ECI por modelo. Conserva 1 producto por
 * código de modelo único, dando preferencia al más barato.
 *
 * Estado actual (2026-04-26):
 *   - Samsung RB38C7B6AS9/EF Twin Cooling Plus: 12 ofertas (11 Reacond D + 1 C)
 *   - Samsung RB38C776CS9/EF AI Balda Botellero 390L: 5 ofertas
 *   - LG GBV7280AMB Total No Frost: 2 ofertas
 *   - Haier HDPW5620CNPK: 1 oferta
 *   Total: 20 ofertas, 4 modelos únicos.
 *
 * Tras la ejecución quedan 4 productos ECI (1 por modelo). Hay que añadir
 * 16 modelos diferentes adicionales para llegar al objetivo de 20 distintos
 * que pidió el usuario.
 *
 * Uso:
 *   npx tsx scripts/dedup-eci-frigorificos.ts
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  console.log("⏭️  no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const STORE = "El Corte Inglés";

// Códigos de modelo a deduplicar. Conservamos el producto con menor precio
// en la oferta ECI (o el primero si empatan).
const MODELS = ["RB38C7B6AS9", "RB38C776CS9", "GBV7280AMB", "HDPW5620CNPK"];

async function main() {
  let kept = 0;
  let deleted = 0;

  for (const m of MODELS) {
    const products = await prisma.product.findMany({
      where: {
        category: "FRIGORIFICOS",
        name: { contains: m, mode: "insensitive" },
        offers: { some: { store: STORE } },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        offers: {
          where: { store: STORE },
          select: { priceCurrent: true },
        },
      },
    });
    if (products.length === 0) continue;

    // ordenar por precio ascendente; el primero se queda
    products.sort((a, b) => (a.offers[0]?.priceCurrent ?? 1e9) - (b.offers[0]?.priceCurrent ?? 1e9));
    const keep = products[0];
    console.log(`\n🟢 ${m}: conservar ${keep.offers[0]?.priceCurrent}€ | ${keep.slug.slice(0, 70)}`);
    kept++;

    for (let i = 1; i < products.length; i++) {
      const p = products[i];
      await prisma.product.delete({ where: { id: p.id } });
      console.log(`🗑️  ${m}: ${p.offers[0]?.priceCurrent}€ | ${p.slug.slice(0, 70)}`);
      deleted++;
    }
  }

  console.log(`\n🎯 dedup-eci-frigorificos: ${kept} conservados, ${deleted} borrados`);
}

main()
  .catch((e) => {
    console.error("❌ error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
