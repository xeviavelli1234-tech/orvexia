import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.log("⏭️  sync-eci-frigorificos-prices: no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const STORE = "El Corte Inglés";

// Correcciones manuales según capturas de elcorteingles.es (2026-04-28).
// Localizamos cada producto por código de modelo en el nombre (los slugs de
// ECI llevan IDs AWIN volátiles), igual que sync-eci-lavadoras-prices.ts.
type U = {
  model: string;
  label: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  inStock: boolean;
};

const UPDATES: U[] = [
  { model: "RB38C655DS9",  label: "Samsung RB38C655DS9/EF Smart Reacond. D",         priceCurrent: 599,    priceOld: 1259, discountPercent: 52, inStock: true },
  { model: "GBBS727CMB",   label: "LG GBBS727CMB DoorCooling+ Serie 700 Reacond. D", priceCurrent: 569,    priceOld: 1199, discountPercent: 52, inStock: true },
  { model: "GBBW726CMB",   label: "LG GBBW726CMB DoorCooling+ Reacond. D",           priceCurrent: 699,    priceOld: 1499, discountPercent: 53, inStock: true },
  { model: "HDPW5620CNPW", label: "Haier HDPW5620CNPW Series 5 Pro WIFI Reacond. D", priceCurrent: 559,    priceOld: 1199, discountPercent: 53, inStock: true },
  { model: "HDPW5620CNPK", label: "Haier HDPW5620CNPK Series 5 WIFI Reacond. D",     priceCurrent: 499,    priceOld: 1265, discountPercent: 60, inStock: true },
  { model: "KGN392ICF",    label: "Bosch KGN392ICF VitaFresh Reacond. C",            priceCurrent: 679,    priceOld: 1439, discountPercent: 52, inStock: true },
  { model: "KGN39VIBT",    label: "Bosch KGN39VIBT No Frost Reacond. D",             priceCurrent: 699,    priceOld: 1499, discountPercent: 53, inStock: true },
  { model: "CBNsdc765i",   label: "Liebherr CBNsdc765i EasyFresh Reacond. D",        priceCurrent: 999,    priceOld: 2369, discountPercent: 57, inStock: true },
  { model: "KG39N2ICF",    label: "Siemens KG39N2ICF No Frost Reacond. D",           priceCurrent: 559,    priceOld: 1369, discountPercent: 59, inStock: true },
  { model: "HTW5618CNMG",  label: "Haier HTW5618CNMG Series 5 3D WIFI",              priceCurrent: 696.15, priceOld: 1699, discountPercent: 59, inStock: true },
  { model: "RB38C7B6AS9",  label: "Samsung RB38C7B6AS9/EF Twin Cooling Plus Reacond. D", priceCurrent: 689, priceOld: 1999, discountPercent: 65, inStock: true },
];

// Modelos AGOTADOS en ECI (capturas 2026-04-28). Solo flip de inStock=false,
// no tocamos precios ni descuento (la página ya no los muestra).
// Mismo patrón que sync-eci-lavadoras-stock.ts.
const SOLD_OUT_MODELS = [
  "RB53DG706AS9EF", // Samsung ancho Especial 75cm
  "RB34C775CS9",    // Samsung Smart
  "KGN392LAG",      // Bosch Total No Frost 203x60cm
  "KGN392WCF",      // Bosch VitaFresh blanco
  "HDPW7620ANPK",   // Haier Series 7 Pro Reacond. B
  "RB38C776CS9",    // Samsung 390L Botellero Reacond. D
  "GBV7280AMB",     // LG Total No Frost 203cm Reacond. D
];

async function applyPriceUpdates(): Promise<{ updated: number; unchanged: number; missing: number }> {
  let updated = 0;
  let unchanged = 0;
  let missing = 0;

  for (const u of UPDATES) {
    const products = await prisma.product.findMany({
      where: {
        category: "FRIGORIFICOS",
        name: { contains: u.model, mode: "insensitive" },
        offers: { some: { store: STORE } },
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
        category: "FRIGORIFICOS",
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

  console.log("🎯 sync-eci-frigorificos-prices: hecho");
}

main()
  .catch((e) => {
    console.error("❌ sync-eci-frigorificos-prices error:", e);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
