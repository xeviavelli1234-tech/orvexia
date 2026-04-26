import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.log("⏭️  sync-eci-lavadoras-stock: no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const STORE = "El Corte Inglés";

// El usuario pidió quitar todo lo de "agotado". Este script ya no marca nada
// como sin stock; al contrario, hace cleanup deshaciendo los marcados previos
// (commits e1ee530 / 6f8dd53) sobre estos 4 modelos en la oferta ECI.
const RESET_TO_IN_STOCK_MODELS = ["WAN28287ES", "LFE6G54H4B", "WUU28T66ES", "WUU28T8XES"];

// Slugs de los 4 productos sustitutos que inserté en e1ee530 y que el usuario
// quiere revertir. Defensivo: si ya los borró el deploy anterior, no pasa nada.
// Schema tiene onDelete: Cascade para Offer, PriceHistory, BuySignal,
// SavedProduct y PriceAlert.
const REPLACEMENTS_TO_DELETE_PREFIXES = [
  "eci-44531643339-", // Bosch WGG254Z5ES
  "eci-44149868303-", // AEG LFR7394O4V
  "eci-44437097399-", // Bosch WUU28T6KES
  "eci-44450209052-", // Bosch WUU28T63ES
];

async function resetInStock(): Promise<{ ok: number; missing: number }> {
  let ok = 0;
  let missing = 0;

  for (const model of RESET_TO_IN_STOCK_MODELS) {
    const products = await prisma.product.findMany({
      where: {
        category: "LAVADORAS",
        name: { contains: model, mode: "insensitive" },
        offers: { some: { store: STORE } },
      },
      select: {
        id: true,
        slug: true,
        offers: { where: { store: STORE }, select: { id: true, inStock: true } },
      },
    });

    if (products.length === 0) {
      console.log(`⚠️  ${model}: no encontrado en BD (oferta ${STORE})`);
      missing++;
      continue;
    }

    for (const p of products) {
      for (const o of p.offers) {
        if (o.inStock === true) {
          console.log(`✓  ${model} (${p.slug.slice(0, 60)}): ya en stock`);
        } else {
          await prisma.offer.update({
            where: { id: o.id },
            data: { inStock: true },
          });
          console.log(`✅ ${model} (${p.slug.slice(0, 60)}): reset inStock=true`);
        }
        ok++;
      }
    }
  }

  return { ok, missing };
}

async function deleteRevertedReplacements(): Promise<{ deleted: number }> {
  let deleted = 0;
  for (const prefix of REPLACEMENTS_TO_DELETE_PREFIXES) {
    const products = await prisma.product.findMany({
      where: { slug: { startsWith: prefix } },
      select: { id: true, slug: true },
    });
    for (const p of products) {
      await prisma.product.delete({ where: { id: p.id } });
      console.log(`🗑️  borrado: ${p.slug.slice(0, 80)}`);
      deleted++;
    }
  }
  return { deleted };
}

async function main() {
  console.log("🔄 Reseteando inStock=true...");
  const so = await resetInStock();
  console.log(`   ${so.ok} ofertas tocadas, ${so.missing} modelos no encontrados\n`);

  console.log("🧹 Borrando reemplazos revertidos (defensivo)...");
  const del = await deleteRevertedReplacements();
  console.log(`   ${del.deleted} productos borrados\n`);

  console.log("🎯 sync-eci-lavadoras-stock: hecho");
}

main()
  .catch((e) => {
    console.error("❌ sync-eci-lavadoras-stock error:", e);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
