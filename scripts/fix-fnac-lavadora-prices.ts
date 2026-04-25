import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.log("⏭️  no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

type U = { slug: string; priceCurrent: number; priceOld: number; discountPercent: number };

const UPDATES: U[] = [
  { slug: "lavadora-de-carga-frontal-integrable-balay-3ti979b-7kg-1200rpm-clase-c-3-9366469-37592173603", priceCurrent: 649.90, priceOld: 849, discountPercent: 23 },
  { slug: "lavadora-de-carga-frontal-balay-3ts392bd-9kg-1200rpm-blanco-a-3-9307510-37592171317",          priceCurrent: 570.90, priceOld: 749, discountPercent: 24 },
  { slug: "lavadora-de-carga-frontal-electrolux-ea2f6820cf-8kg-1200rpm-blanco-a-3-9366466-37592173601",   priceCurrent: 402.90, priceOld: 529, discountPercent: 24 },
  { slug: "lavadora-de-carga-superior-whirlpool-tdlr-7220ls-7kg-1200rpm-blanco-e-3-9339665-37592171424",  priceCurrent: 334.90, priceOld: 449, discountPercent: 25 },
  { slug: "lavadora-de-carga-frontal-brandt-wfb193qwp-9kg-1400rpm-blanco-b-3-9344037-37592171473",        priceCurrent: 358.90, priceOld: 479, discountPercent: 25 },
  { slug: "lavadora-de-carga-frontal-bosch-wuu24t63es-9kg-1200rpm-blanco-a-3-9346666-37592171538",        priceCurrent: 510.90, priceOld: 669, discountPercent: 24 },
];

async function main() {
  let ok = 0, miss = 0;
  for (const u of UPDATES) {
    const product = await prisma.product.findUnique({ where: { slug: u.slug }, select: { id: true } });
    if (!product) { console.log(`⚠️  ${u.slug}: no encontrado`); miss++; continue; }

    const existing = await prisma.offer.findUnique({
      where: { productId_store: { productId: product.id, store: "Fnac" } },
      select: { priceCurrent: true },
    });
    if (!existing) { console.log(`⚠️  ${u.slug}: sin oferta Fnac`); miss++; continue; }

    await prisma.offer.update({
      where: { productId_store: { productId: product.id, store: "Fnac" } },
      data: { priceCurrent: u.priceCurrent, priceOld: u.priceOld, discountPercent: u.discountPercent, inStock: true },
    });

    if (existing.priceCurrent !== u.priceCurrent) {
      await prisma.priceHistory.create({ data: { productId: product.id, store: "Fnac", price: u.priceCurrent } });
    }

    console.log(`✅ ${u.slug.slice(0, 70)}…  ${u.priceCurrent}€ (antes ${u.priceOld}€, -${u.discountPercent}%)`);
    ok++;
  }
  console.log(`\n🎯 ${ok} actualizados, ${miss} no encontrados`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
