import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  console.log("⏭️  sync-amazon-frigorificos-prices: no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const STORE = "Amazon";

// Correcciones manuales de precio según capturas amazon.es (2026-04-26).
// Slugs ya verificados en BD vía find-amazon-frigorificos-slugs.ts.
type U = {
  slug: string;
  label: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
};

const UPDATES: U[] = [
  { slug: "visita-la-tienda-de-chiq-b0byhmvwgz",                          label: "CHiQ FBM228NE4DE No Frost 231L",     priceCurrent: 369.99, priceOld: null,    discountPercent: null },
  { slug: "visita-la-tienda-de-midea-b0ftdv9jgw",                         label: "Midea Combi Blanco 262L",            priceCurrent: 299.99, priceOld: null,    discountPercent: null },
  { slug: "visita-la-tienda-de-candy-b0g2z33k4k",                         label: "Candy CNCQ2T518EG City Fresco 300",  priceCurrent: 382.69, priceOld: 419.00,  discountPercent: 9 },
  { slug: "svan-sc185602enf-frigorifico-combi-293l-no-frost-blanco",      label: "Svan SC185602ENF Combi 293L",        priceCurrent: 314.99, priceOld: 379.90,  discountPercent: 17 },
  { slug: "nilson-nc185500e-frigorifico-combi-262l",                      label: "Nilson NC185500E Combi 262L",        priceCurrent: 289.90, priceOld: null,    discountPercent: null },
  { slug: "cecotec-bolero-minicooling-4l-habana-light-blue",              label: "Cecotec Bolero MiniCooling 4L",      priceCurrent: 42.90,  priceOld: null,    discountPercent: null },
  { slug: "comfee-rcd93bl2eurt-frigorifico-retro-93l-negro",              label: "Comfee RCD93BL2EURT Retro 93L",      priceCurrent: 169.99, priceOld: 189.99,  discountPercent: 11 },
  { slug: "candy-chasd4351ebc-frigorifico-mini-43l-negro",                label: "Candy CHASD4351EBC Mini 43L",        priceCurrent: 99.00,  priceOld: 129.00,  discountPercent: 23 },
  { slug: "chiq-frigorifico-minibar-46l-negro",                           label: "CHiQ Minibar 46L",                   priceCurrent: 104.99, priceOld: null,    discountPercent: null },
  { slug: "svan-sr145501e-frigorifico-242l-blanco",                       label: "Svan SR145501E 242L",                priceCurrent: 288.57, priceOld: null,    discountPercent: null },
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
      select: { priceCurrent: true, priceOld: true, discountPercent: true },
    });
    if (!existing) {
      console.log(`⚠️  ${u.label}: oferta Amazon no encontrada`);
      missing++;
      continue;
    }

    const samePrice = existing.priceCurrent === u.priceCurrent;
    const sameOld = existing.priceOld === u.priceOld;
    const sameDisc = existing.discountPercent === u.discountPercent;
    if (samePrice && sameOld && sameDisc) {
      unchanged++;
      continue;
    }

    await prisma.offer.update({
      where: { productId_store: { productId: product.id, store: STORE } },
      data: {
        priceCurrent: u.priceCurrent,
        priceOld: u.priceOld,
        discountPercent: u.discountPercent,
        inStock: true,
      },
    });

    if (!samePrice) {
      await prisma.priceHistory.create({
        data: { productId: product.id, store: STORE, price: u.priceCurrent },
      });
    }

    const before = `${existing.priceCurrent}€ (old=${existing.priceOld}, ${existing.discountPercent}%)`;
    const after = `${u.priceCurrent}€ (old=${u.priceOld}, ${u.discountPercent}%)`;
    console.log(`✅ ${u.label}\n     antes: ${before}\n     ahora: ${after}`);
    updated++;
  }

  console.log(
    `\n🎯 sync-amazon-frigorificos-prices: ${updated} actualizados, ${unchanged} sin cambios, ${missing} no encontrados`,
  );
}

main()
  .catch((e) => {
    console.error("❌ sync-amazon-frigorificos-prices error:", e);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
