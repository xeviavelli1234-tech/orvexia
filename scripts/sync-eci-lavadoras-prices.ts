import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.log("⏭️  sync-eci-lavadoras-prices: no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const STORE = "El Corte Inglés";

// Correcciones manuales de precio según capturas de elcorteingles.es (2026-04-26).
// Localizamos cada producto por código de modelo en el nombre (los slugs de ECI
// llevan IDs AWIN volátiles) + tienda = "El Corte Inglés".
type U = {
  model: string;
  label: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
};

const UPDATES: U[] = [
  { model: "LFSR9514L6U", label: "AEG LFSR9514L6U 10kg Reacond. D",          priceCurrent: 535.20, priceOld: 1129.00, discountPercent: 52 },
  { model: "WG44G2ZAES",  label: "Siemens WG44G2ZAES 9kg Reacond. D",        priceCurrent: 375.20, priceOld: 789.00,  discountPercent: 52 },
  { model: "WUU28T67ES",  label: "Bosch WUU28T67ES 9kg Reacond. D",          priceCurrent: 359.20, priceOld: 779.00,  discountPercent: 54 },
  { model: "WMK 81050",   label: "Teka WMK 81050 BLANC 10kg AutoDosif.",     priceCurrent: 466.65, priceOld: 1000.00, discountPercent: 53 },
  { model: "MF100T80B",   label: "Midea MF100T80B/W-ES 8kg carga superior",  priceCurrent: 424.15, priceOld: 619.00,  discountPercent: 31 },
  { model: "MF100T70B",   label: "Midea MF100T70B/W-ES 7kg carga superior",  priceCurrent: 381.65, priceOld: 579.00,  discountPercent: 34 },
  { model: "MF100T60B",   label: "Midea MF100T60B/W-ES 6kg carga superior",  priceCurrent: 356.15, priceOld: 549.00,  discountPercent: 35 },
];

async function main() {
  let updated = 0;
  let missing = 0;

  for (const u of UPDATES) {
    const products = await prisma.product.findMany({
      where: {
        category: "LAVADORAS",
        name: { contains: u.model, mode: "insensitive" },
        offers: { some: { store: STORE } },
      },
      select: {
        id: true,
        slug: true,
        offers: {
          where: { store: STORE },
          select: { id: true, priceCurrent: true, priceOld: true, discountPercent: true },
        },
      },
    });

    if (products.length === 0) {
      console.log(`⚠️  ${u.label}: producto no encontrado`);
      missing++;
      continue;
    }

    for (const p of products) {
      for (const o of p.offers) {
        await prisma.offer.update({
          where: { id: o.id },
          data: {
            priceCurrent: u.priceCurrent,
            priceOld: u.priceOld,
            discountPercent: u.discountPercent,
            inStock: true,
          },
        });

        if (o.priceCurrent !== u.priceCurrent) {
          await prisma.priceHistory.create({
            data: { productId: p.id, store: STORE, price: u.priceCurrent },
          });
        }

        const before = `${o.priceCurrent}€ (old=${o.priceOld}, ${o.discountPercent}%)`;
        const after = `${u.priceCurrent}€ (old=${u.priceOld}, ${u.discountPercent}%)`;
        console.log(`✅ ${u.label} [${p.slug.slice(0, 60)}]\n     antes: ${before}\n     ahora: ${after}`);
        updated++;
      }
    }
  }

  console.log(`\n🎯 sync-eci-lavadoras-prices: ${updated} actualizados, ${missing} no encontrados`);
}

main()
  .catch((e) => {
    console.error("❌ sync-eci-lavadoras-prices error:", e);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
