import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.log("⏭️  no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Borrar duplicados de lavadoras ECI. Se mantiene 1 ejemplar de cada modelo.
const SLUG_PREFIXES_TO_DELETE = [
  // Siemens WG44G2ZAES Reacondicionado: 4 entradas a 469€, mantener la más reciente (44342720800)
  "eci-44241734989-siemens-lavadora-siemens-9-kg-1-400-rpm-wg44g2zaes",
  "eci-44241735031-siemens-lavadora-siemens-9-kg-1-400-rpm-wg44g2zaes",
  "eci-44241735041-siemens-lavadora-siemens-9-kg-1-400-rpm-wg44g2zaes",
  // Bosch WUU28T67ES Reacondicionado: 3 entradas, mantener la más barata (44514481330 a 449€)
  "eci-44149868395-bosch-lavadora-bosch-9-kg-1-400-rpm-motor-ecosilence-wuu28t67es",
  "eci-44259812073-bosch-lavadora-bosch-9-kg-1-400-rpm-motor-ecosilence-wuu28t67es",
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
    console.log(`🗑️  ${product.slug.slice(0, 80)}`);
    ok++;
  }
  console.log(`\n🎯 ${ok} borrados, ${miss} no encontrados`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
