import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.log("⏭️  sync-eci-lavavajillas-prices: no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const STORE = "El Corte Inglés";

// Correcciones manuales según capturas de elcorteingles.es (2026-04-28).
// Localizamos cada producto por código de modelo en el nombre (los slugs de
// ECI llevan IDs AWIN volátiles), igual que sync-eci-frigorificos-prices.ts.
type U = {
  model: string;
  // Si está, descarta productos cuyo nombre contenga este texto. Útil cuando
  // el mismo modelo existe en versión nueva y reacondicionada con precios
  // distintos (ej. Indesit DFO 3T133 A F).
  excludeContains?: string;
  label: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  inStock: boolean;
};

const UPDATES: U[] = [
  { model: "3E7L0W2",    label: "Candy CI 3E7L0W2 13c WiFi 60cm",                                                  priceCurrent: 349, priceOld: 529, discountPercent: 34, inStock: true },
  { model: "DVS05024W",  label: "Beko DVS05024W 10c 5 programas 45cm",                                             priceCurrent: 359, priceOld: 549, discountPercent: 34, inStock: true },
  { model: "BDFN26430W", label: "Beko BDFN26430W 14c progr. 6+4 60cm",                                             priceCurrent: 369, priceOld: 579, discountPercent: 36, inStock: true },
  { model: "3C42",       label: "Whirlpool WFC 3C42 P 14c 8 progr. 60cm",                                          priceCurrent: 469, priceOld: 739, discountPercent: 36, inStock: true },
  { model: "3T133", excludeContains: "Reacondicionado", label: "Indesit DFO 3T133 A F nuevo 14c Bandeja 60cm",     priceCurrent: 399, priceOld: 669, discountPercent: 40, inStock: true },
  { model: "3T133 A F (Reacondicionado", label: "Indesit DFO 3T133 A F Reacond. C 14c Bandeja 60cm",               priceCurrent: 349, priceOld: 669, discountPercent: 47, inStock: true },
];

// Modelos AGOTADOS en ECI (capturas 2026-04-28). Solo flip de inStock=false,
// no tocamos precios ni descuento (la página ya no los muestra).
// Mismo patrón que sync-eci-lavadoras-stock.ts.
const SOLD_OUT_MODELS = [
  "FFB76717PM", // AEG 14c Bandeja para cubiertos 60cm Reacond. D
  "6B0S3FSB",   // Haier XS 16c WiFi Washlens Plus 60cm Reacond. B
  "3VH6330SA",  // Balay 14c Seco+ 60cm Reacond. D
  "MID60S110",  // Midea MID60S110.1-ES 12c 4 progr. 60cm Reacond. D
  "FFB64627ZW", // AEG 13c 60cm Reacond. D
  "6B2S3PSX",   // Candy CF 6B2S3PSX 16c 3ª bandeja WiFi RapidÓ Reacond. D
  "SPS4EMW61E", // Bosch SPS4EMW61E 10c 45cm Reacond. D
  "4A4M3PB",    // Haier XS 4A4M3PB 14c WiFi I-PRO SHINE 60cm Reacond. C
];

async function applyPriceUpdates(): Promise<{ updated: number; unchanged: number; missing: number }> {
  let updated = 0;
  let unchanged = 0;
  let missing = 0;

  for (const u of UPDATES) {
    const products = await prisma.product.findMany({
      where: {
        category: "LAVAVAJILLAS",
        name: { contains: u.model, mode: "insensitive" },
        offers: { some: { store: STORE } },
        ...(u.excludeContains
          ? { NOT: { name: { contains: u.excludeContains, mode: "insensitive" } } }
          : {}),
      },
      select: {
        id: true,
        slug: true,
        offers: {
          where: { store: STORE },
          select: {
            id: true,
            priceCurrent: true,
            priceOld: true,
            discountPercent: true,
            inStock: true,
          },
        },
      },
    });

    if (products.length === 0) {
      console.log(`⚠️  ${u.label}: producto no encontrado (modelo=${u.model})`);
      missing++;
      continue;
    }

    for (const p of products) {
      for (const o of p.offers) {
        const samePrice = o.priceCurrent === u.priceCurrent;
        const sameOld = o.priceOld === u.priceOld;
        const sameDisc = o.discountPercent === u.discountPercent;
        const sameStock = o.inStock === u.inStock;
        if (samePrice && sameOld && sameDisc && sameStock) {
          unchanged++;
          continue;
        }

        await prisma.offer.update({
          where: { id: o.id },
          data: {
            priceCurrent: u.priceCurrent,
            priceOld: u.priceOld,
            discountPercent: u.discountPercent,
            inStock: u.inStock,
          },
        });

        if (!samePrice) {
          await prisma.priceHistory.create({
            data: { productId: p.id, store: STORE, price: u.priceCurrent },
          });
        }

        const before = `${o.priceCurrent}€ (old=${o.priceOld}, ${o.discountPercent}%, stock=${o.inStock})`;
        const after = `${u.priceCurrent}€ (old=${u.priceOld}, ${u.discountPercent}%, stock=${u.inStock})`;
        console.log(`✅ ${u.label} [${p.slug.slice(0, 60)}]\n     antes: ${before}\n     ahora: ${after}`);
        updated++;
      }
    }
  }

  return { updated, unchanged, missing };
}

async function markSoldOut(): Promise<{ ok: number; missing: number }> {
  let ok = 0;
  let missing = 0;

  for (const model of SOLD_OUT_MODELS) {
    const products = await prisma.product.findMany({
      where: {
        category: "LAVAVAJILLAS",
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
      console.log(`⚠️  ${model}: no encontrado (oferta ${STORE})`);
      missing++;
      continue;
    }

    for (const p of products) {
      for (const o of p.offers) {
        if (o.inStock === false) {
          console.log(`✓  ${model} (${p.slug.slice(0, 60)}): ya marcado sin stock`);
        } else {
          await prisma.offer.update({
            where: { id: o.id },
            data: { inStock: false },
          });
          console.log(`✅ ${model} (${p.slug.slice(0, 60)}): marcado inStock=false`);
        }
        ok++;
      }
    }
  }

  return { ok, missing };
}

async function main() {
  console.log("💶 Actualizando precios...");
  const u = await applyPriceUpdates();
  console.log(`   ${u.updated} actualizados, ${u.unchanged} sin cambios, ${u.missing} no encontrados\n`);

  console.log("🔻 Marcando agotados...");
  const so = await markSoldOut();
  console.log(`   ${so.ok} ofertas tocadas, ${so.missing} modelos no encontrados\n`);

  console.log("🎯 sync-eci-lavavajillas-prices: hecho");
}

main()
  .catch((e) => {
    console.error("❌ sync-eci-lavavajillas-prices error:", e);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
