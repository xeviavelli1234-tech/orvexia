import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.log("⏭️  no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

type U = { slug: string; priceCurrent: number; priceOld: number | null; discountPercent: number | null };

const UPDATES: U[] = [
  { slug: "visita-la-tienda-de-comfee-b0grt27lnl",         priceCurrent: 409.99, priceOld: null,   discountPercent: null },
  { slug: "visita-la-tienda-de-hisense-b08dmtvl3m",        priceCurrent: 266.29, priceOld: null,   discountPercent: null },
  { slug: "cecotec-bolero-dresscode-7150-inverter-7kg",    priceCurrent: 259.00, priceOld: null,   discountPercent: null },
  { slug: "nilson-nl6200ai-6kg",                           priceCurrent: 219.90, priceOld: 239.90, discountPercent: 8 },
  { slug: "cecotec-bolero-dresscode-7500-inverter-7kg",    priceCurrent: 289.00, priceOld: null,   discountPercent: null },
  { slug: "corbero-clt9bl1423-9kg",                        priceCurrent: 299.00, priceOld: null,   discountPercent: null },
  { slug: "cecotec-bolero-dresscode-8500-inverter-8kg",    priceCurrent: 309.00, priceOld: null,   discountPercent: null },
  { slug: "chiq-cw07123863ax-7kg",                         priceCurrent: 269.99, priceOld: null,   discountPercent: null },
  { slug: "hisense-wf1q9041bw-9kg",                        priceCurrent: 313.65, priceOld: 322.15, discountPercent: 3 },
  { slug: "haier-hw80-b14939-ib-ipro3-8kg",                priceCurrent: 390.15, priceOld: 549.00, discountPercent: 29 },
  { slug: "visita-la-tienda-de-haier-b0crhx1n9s",          priceCurrent: 449.00, priceOld: 529.00, discountPercent: 15 },
];

async function main() {
  let ok = 0, miss = 0;
  for (const u of UPDATES) {
    const product = await prisma.product.findUnique({ where: { slug: u.slug }, select: { id: true } });
    if (!product) { console.log(`⚠️  ${u.slug}: no encontrado`); miss++; continue; }

    const existing = await prisma.offer.findUnique({
      where: { productId_store: { productId: product.id, store: "Amazon" } },
      select: { priceCurrent: true },
    });
    if (!existing) { console.log(`⚠️  ${u.slug}: sin oferta Amazon`); miss++; continue; }

    await prisma.offer.update({
      where: { productId_store: { productId: product.id, store: "Amazon" } },
      data: { priceCurrent: u.priceCurrent, priceOld: u.priceOld, discountPercent: u.discountPercent, inStock: true },
    });

    if (existing.priceCurrent !== u.priceCurrent) {
      await prisma.priceHistory.create({ data: { productId: product.id, store: "Amazon", price: u.priceCurrent } });
    }

    const tag = u.priceOld ? ` (antes ${u.priceOld}€, -${u.discountPercent}%)` : "";
    console.log(`✅ ${u.slug.slice(0, 60)}…  ${u.priceCurrent}€${tag}`);
    ok++;
  }
  console.log(`\n🎯 ${ok} actualizados, ${miss} no encontrados`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
