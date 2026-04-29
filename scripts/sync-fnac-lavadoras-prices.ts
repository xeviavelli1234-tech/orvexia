import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.log("⏭️  sync-fnac-lavadoras-prices: no DATABASE_URL, skipping");
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
  { slug: "lavadora-de-carga-frontal-aeg-lfa6i8472a-8-kg-1400-rpm-blanco-a-3-9404855-37592175046",                priceCurrent: 420.52, priceOld: null,    discountPercent: null },
  { slug: "lavadora-de-carga-frontal-aeg-lfa6i8272a-8-kg-1200-rpm-blanco-a-3-9404853-37592175044",                priceCurrent: 423.90, priceOld: 559.00,  discountPercent: 24 },
  { slug: "lavadora-de-carga-frontal-cecotec-bolero-dresscode-121000-steel-12kg-1400rpm-plata-a-3-9400656-40528620966", priceCurrent: 460.90, priceOld: 609.00,  discountPercent: 24 },
  { slug: "lavadora-de-carga-frontal-integrable-balay-3ti987b-8kg-1400rpm-clase-c-3-9366470-37592173604",         priceCurrent: 791.40, priceOld: 1109.50, discountPercent: 29 },
  { slug: "lavadora-de-carga-frontal-hotpoint-ariston-ns824wksptn-8-kg-1200-rpm-blanco-c-3-9404884-44372459927",   priceCurrent: 540.03, priceOld: null,    discountPercent: null },
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

  console.log(`\n🎯 sync-fnac-lavadoras-prices: ${updated} actualizados, ${missing} no encontrados`);
}

main()
  .catch((e) => {
    console.error("❌ sync-fnac-lavadoras-prices error:", e);
    // No romper el build si falla
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
