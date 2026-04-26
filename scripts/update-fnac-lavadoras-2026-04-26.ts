import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.log("⏭️  no DATABASE_URL");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type U = {
  productId: string;
  label: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
};

// Datos extraídos manualmente de Fnac.es (screenshots de 2026-04-26)
const UPDATES: U[] = [
  {
    productId: "cmoadlki40d0bav5hae",
    label: "AEG LFA6I8472A 1400rpm",
    priceCurrent: 420.52,
    priceOld: null,
    discountPercent: null,
  },
  {
    productId: "cmoadlk58y53v43w0vs",
    label: "AEG LFA6I8272A 1200rpm",
    priceCurrent: 423.90,
    priceOld: 559.00,
    discountPercent: 24,
  },
  {
    productId: "cmoadlj2zp22ct5vhes",
    label: "Cecotec DressCode 121000 12kg",
    priceCurrent: 460.90,
    priceOld: 609.00,
    discountPercent: 24,
  },
  {
    productId: "cmoadli0sodtnsst7et",
    label: "Balay 3TI987B Integrable 8kg",
    priceCurrent: 791.40,
    priceOld: 1109.50,
    discountPercent: 29,
  },
];

async function main() {
  for (const u of UPDATES) {
    const existing = await prisma.offer.findUnique({
      where: { productId_store: { productId: u.productId, store: "Fnac" } },
      select: { priceCurrent: true, priceOld: true, discountPercent: true },
    });

    if (!existing) {
      console.log(`⚠️  ${u.label}: oferta Fnac no encontrada`);
      continue;
    }

    const updated = await prisma.offer.update({
      where: { productId_store: { productId: u.productId, store: "Fnac" } },
      data: {
        priceCurrent: u.priceCurrent,
        priceOld: u.priceOld,
        discountPercent: u.discountPercent,
        inStock: true,
      },
    });

    if (existing.priceCurrent !== u.priceCurrent) {
      await prisma.priceHistory.create({
        data: { productId: u.productId, store: "Fnac", price: u.priceCurrent },
      });
    }

    const before = `${existing.priceCurrent}€ (old=${existing.priceOld}, ${existing.discountPercent}%)`;
    const after = `${updated.priceCurrent}€ (old=${updated.priceOld}, ${updated.discountPercent}%)`;
    console.log(`✅ ${u.label}\n     antes: ${before}\n     ahora: ${after}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
