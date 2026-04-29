import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.log("⏭️  sync-fnac-frigorificos-prices: no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type U = {
  slug: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
};

const UPDATES: U[] = [
  { slug: "frigorifico-combi-balay-3kfe565gi-gris-a-186x60cm-led-3-8913561",                          priceCurrent: 1217.64, priceOld: null,   discountPercent: null },
  { slug: "frigorifico-combi-balay-3kfe560wi-blanco-a-nofrost-3-8913559",                             priceCurrent: 681.90,  priceOld: 899.00, discountPercent: 24 },
  { slug: "frigorifico-combi-balay-3kfe361mi-inox-a-nofrost-3-8909835-37592152642",                   priceCurrent: 975.73,  priceOld: null,   discountPercent: null },
  { slug: "frigorifico-1-puerta-cecotec-bolero-coolmarket-1d-242l-blanco-e-3-9408503-44282717225",    priceCurrent: 302.05,  priceOld: null,   discountPercent: null },
  { slug: "frigorifico-combi-teka-nfl345c-inox-1-88m-40672051-3-8260527-39262249986",                 priceCurrent: 495.85,  priceOld: null,   discountPercent: null },
  { slug: "frigorifico-combi-teka-nfl342c-inox-1-88m-113420000-3-8260525-39095949912",                priceCurrent: 449.31,  priceOld: null,   discountPercent: null },
  { slug: "frigorifico-dometic-ds-601-h-3-2958388-40597540871",                                       priceCurrent: 1419.38, priceOld: null,   discountPercent: null },
];

async function main() {
  let updated = 0;
  let missing = 0;

  for (const u of UPDATES) {
    const product = await prisma.product.findUnique({ where: { slug: u.slug }, select: { id: true } });
    if (!product) {
      console.log(`⚠️  ${u.slug}: producto no encontrado`);
      missing++;
      continue;
    }

    const existing = await prisma.offer.findUnique({
      where: { productId_store: { productId: product.id, store: "Fnac" } },
      select: { priceCurrent: true },
    });

    if (!existing) {
      console.log(`⚠️  ${u.slug}: oferta Fnac no encontrada`);
      missing++;
      continue;
    }

    if (existing.priceCurrent !== u.priceCurrent) {
      const priorLogged = await prisma.priceHistory.findFirst({
        where: { productId: product.id, store: "Fnac", price: existing.priceCurrent },
      });
      if (!priorLogged) {
        await prisma.priceHistory.create({
          data: { productId: product.id, store: "Fnac", price: existing.priceCurrent },
        });
      }
    }

    await prisma.offer.update({
      where: { productId_store: { productId: product.id, store: "Fnac" } },
      data: {
        priceCurrent: u.priceCurrent,
        priceOld: u.priceOld,
        discountPercent: u.discountPercent,
        inStock: true,
      },
    });

    if (existing.priceCurrent !== u.priceCurrent) {
      await prisma.priceHistory.create({
        data: { productId: product.id, store: "Fnac", price: u.priceCurrent },
      });
    }

    console.log(`✅ ${u.slug}: ${u.priceCurrent}€${u.priceOld ? ` (antes ${u.priceOld}€, -${u.discountPercent}%)` : ""}`);
    updated++;
  }

  console.log(`\n🎯 sync-fnac-frigorificos-prices: ${updated} actualizados, ${missing} no encontrados`);
}

main()
  .catch((e) => {
    console.error("❌ sync-fnac-frigorificos-prices error:", e);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
