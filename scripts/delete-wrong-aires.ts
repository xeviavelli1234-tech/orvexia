/**
 * Borra productos de ropa que el feed AWIN de El Corte Inglés
 * coló como AIRES_ACONDICIONADOS (el regex anterior cazaba "Split"
 * en "Short Split" o "Pantalón Split"). El regex ya está endurecido,
 * este script limpia los que ya entraron.
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.log("⏭️  no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const SLUG_PREFIXES_TO_DELETE = [
  "eci-44469259551-asics-short-de-mujer-metarun-split-asics",
  "eci-44391507523-billabong-pantalon-de-mujer-split-spirit-bil",
  "eci-42197973652-new-balance-short-rc-3-ultra-light-split-de-",
  "eci-40748485252-new-balance-short-de-hombre-3-rc-seamless-sp",
  "eci-40740253586-new-balance-short-de-hombre-3-rc-seamless-sp",
];

async function main() {
  let ok = 0, miss = 0;
  for (const prefix of SLUG_PREFIXES_TO_DELETE) {
    const product = await prisma.product.findFirst({
      where: { slug: { startsWith: prefix } },
      select: { id: true, slug: true, name: true },
    });
    if (!product) { console.log(`⚠️  ${prefix}: no encontrado`); miss++; continue; }
    await prisma.product.delete({ where: { id: product.id } });
    console.log(`🗑️  ${product.name.slice(0, 70)}`);
    ok++;
  }
  console.log(`\n🎯 ${ok} borrados, ${miss} no encontrados`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
