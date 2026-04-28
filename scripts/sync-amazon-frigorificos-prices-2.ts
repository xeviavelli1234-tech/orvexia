import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  console.log("⏭️  sync-amazon-frigorificos-prices-2: no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const STORE = "Amazon";

// Segunda tanda de correcciones según capturas amazon.es (2026-04-28).
// Incluye 3 modelos nuevos con porcentaje y 1 marcado como agotado.
type U = {
  slug: string;
  label: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  inStock: boolean;
};

const UPDATES: U[] = [
  // Verde, "Agotado temporalmente" en la captura. Mantenemos precio histórico.
  { slug: "visita-la-tienda-de-candy-b0g2z33k4k",                  label: "Candy CNCQ2T518EG Verde (AGOTADO)", priceCurrent: 382.69, priceOld: 419.00,  discountPercent: 9,  inStock: false },
  { slug: "hisense-rb343d4cde-frigorifico-combi-269l-inox",        label: "Hisense RB343D4CDE 269L Inox",      priceCurrent: 289.99, priceOld: 299.00,  discountPercent: 3,  inStock: true  },
  { slug: "hisense-rb343d4cwe-frigorifico-combi-269l-blanco",      label: "Hisense RB343D4CWE 269L Blanco",    priceCurrent: 259.99, priceOld: 289.99,  discountPercent: 10, inStock: true  },
  { slug: "candy-ccg1s-518ew-frigorifico-combi-252l-blanco",       label: "Candy CCG1S 518EW Combi 252L",      priceCurrent: 286.99, priceOld: 309.00,  discountPercent: 7,  inStock: true  },
];

async function main() {
  let updated = 0;
  let unchanged = 0;
  let missing = 0;

  for (const u of UPDATES) {
    const product = await prisma.product.findUnique({
      where: { slug: u.slug },
      select: { id: true },
    });
    if (!product) {
      console.log(`⚠️  ${u.label}: producto no encontrado (${u.slug})`);
      missing++;
      continue;
    }

    const existing = await prisma.offer.findUnique({
      where: { productId_store: { productId: product.id, store: STORE } },
      select: { priceCurrent: true, priceOld: true, discountPercent: true, inStock: true },
    });
    if (!existing) {
      console.log(`⚠️  ${u.label}: oferta Amazon no encontrada`);
      missing++;
      continue;
    }

    const samePrice = existing.priceCurrent === u.priceCurrent;
    const sameOld = existing.priceOld === u.priceOld;
    const sameDisc = existing.discountPercent === u.discountPercent;
    const sameStock = existing.inStock === u.inStock;
    if (samePrice && sameOld && sameDisc && sameStock) {
      unchanged++;
      continue;
    }

    await prisma.offer.update({
      where: { productId_store: { productId: product.id, store: STORE } },
      data: {
        priceCurrent: u.priceCurrent,
        priceOld: u.priceOld,
        discountPercent: u.discountPercent,
        inStock: u.inStock,
      },
    });

    if (!samePrice) {
      await prisma.priceHistory.create({
        data: { productId: product.id, store: STORE, price: u.priceCurrent },
      });
    }

    const before = `${existing.priceCurrent}€ (old=${existing.priceOld}, ${existing.discountPercent}%, stock=${existing.inStock})`;
    const after = `${u.priceCurrent}€ (old=${u.priceOld}, ${u.discountPercent}%, stock=${u.inStock})`;
    console.log(`✅ ${u.label}\n     antes: ${before}\n     ahora: ${after}`);
    updated++;
  }

  console.log(
    `\n🎯 sync-amazon-frigorificos-prices-2: ${updated} actualizados, ${unchanged} sin cambios, ${missing} no encontrados`,
  );
}

main()
  .catch((e) => {
    console.error("❌ sync-amazon-frigorificos-prices-2 error:", e);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
