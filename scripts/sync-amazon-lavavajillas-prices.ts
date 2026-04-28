import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.log("⏭️  sync-amazon-lavavajillas-prices: no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const STORE = "Amazon";

// Correcciones manuales según capturas amazon.es (2026-04-28).
// Match por código de modelo en el nombre (los slugs Amazon llevan ASINs).
type U = {
  model: string;
  label: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  inStock: boolean;
};

const UPDATES: U[] = [
  { model: "Aguazero 6500",  label: "Cecotec Bolero Aguazero 6500 C 15c Blanco",      priceCurrent: 379,    priceOld: null,    discountPercent: null, inStock: true },
  { model: "Aguazero 6210",  label: "Cecotec Bolero Aguazero 6210 Dark D 15c",        priceCurrent: 369,    priceOld: null,    discountPercent: null, inStock: true },
  { model: "CDWPF1201",      label: "COMFEE CDWPF1201PW-WE-EU 12c Blanco",            priceCurrent: 249.99, priceOld: 264.99,  discountPercent: 6,    inStock: true },
  { model: "CLVM605",        label: "Corbero CLVM605W Plus 12c Blanco",               priceCurrent: 239,    priceOld: 279,     discountPercent: 14,   inStock: true },
  { model: "HS622E10W",      label: "Hisense HS622E10W 13c Blanco Clase E",           priceCurrent: 249,    priceOld: 259,     discountPercent: 4,    inStock: true },
  { model: "3VF5012NP",      label: "Balay 3VF5012NP Integrable 60cm",                priceCurrent: 349,    priceOld: 369,     discountPercent: 5,    inStock: true },
  { model: "SMS4EMI06E",     label: "Bosch SMS4EMI06E Serie 4 Acero",                 priceCurrent: 599.99, priceOld: null,    discountPercent: null, inStock: true },
  { model: "3VS6361IP",      label: "Balay 3VS6361IP 14c Acero Antihuellas",          priceCurrent: 495,    priceOld: null,    discountPercent: null, inStock: true },
  { model: "3VN4030IA",      label: "Balay 3VN4030IA 45cm Acero Antihuellas",         priceCurrent: 397.74, priceOld: 408,     discountPercent: 3,    inStock: true },
  { model: "FFB64607ZM",     label: "AEG FFB64607ZM Serie 6000 SatelliteClean Inox",  priceCurrent: 442.99, priceOld: 523.08,  discountPercent: 15,   inStock: true },
  { model: "Aguazero 6900",  label: "Cecotec Bolero Aguazero 6900 Clase A Blanco",    priceCurrent: 489,    priceOld: null,    discountPercent: null, inStock: true },
  { model: "3VS506BP",       label: "Balay 3VS506BP 12c ExtraSilencio Blanco",        priceCurrent: 299,    priceOld: 479,     discountPercent: 38,   inStock: true },
  { model: "HS622E10X",      label: "Hisense HS622E10X 13c Inox Clase E (oferta)",    priceCurrent: 269.99, priceOld: 296.65,  discountPercent: 9,    inStock: true },
  { model: "SMS25AW05E",     label: "Bosch SMS25AW05E EcoSilence Blanco",             priceCurrent: 351,    priceOld: null,    discountPercent: null, inStock: true },
  { model: "3VS572BP",       label: "Balay 3VS572BP 13c Silencioso Blanco",           priceCurrent: 341,    priceOld: null,    discountPercent: null, inStock: true },
  { model: "3VS572IP",       label: "Balay 3VS572IP 13c Acero Antihuellas",           priceCurrent: 374.86, priceOld: null,    discountPercent: null, inStock: true },
  { model: "Aguazero 4201",  label: "Cecotec Bolero Aguazero 4201 Inox E 45cm",       priceCurrent: 289,    priceOld: 309,     discountPercent: 6,    inStock: true },
];

// Cecotec Aguazero 6620 Inox Clase C: "No disponible" en captura.
// Solo flip de inStock=false, no tocamos precio.
const SOLD_OUT_MODELS = [
  "Aguazero 6620 Inox", // Cecotec Bolero Aguazero 6620 Inox Clase C 15c
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

  console.log("🎯 sync-amazon-lavavajillas-prices: hecho");
}

main()
  .catch((e) => {
    console.error("❌ sync-amazon-lavavajillas-prices error:", e);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
