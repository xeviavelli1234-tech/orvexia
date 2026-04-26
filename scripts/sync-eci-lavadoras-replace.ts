import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.log("⏭️  sync-eci-lavadoras-replace: no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const STORE = "El Corte Inglés";
const STORE_SLUG = "eci";

// Modelos agotados en ECI (visto en captura 2026-04-26). El producto vive en BD
// con el modelo dentro del nombre, así que lo localizamos por substring.
const SOLD_OUT_MODELS = ["WAN28287ES", "LFE6G54H4B", "WUU28T66ES", "WUU28T8XES"];

// Sustitutos elegidos del feed AWIN (mismo merchant, in_stock=1, dedup por modelo).
type NewItem = {
  aw: string;
  name: string;
  brand: string;
  model: string;
  image: string;
  description: string;
  externalUrl: string;
  priceCurrent: number;
  priceOld: number;
  discountPercent: number;
};

const NEW_ITEMS: NewItem[] = [
  {
    aw: "44531643339",
    name: "Bosch - Lavadora Bosch, Serie 6, 10 kg / 1.400 rpm - WGG254Z5ES (Reacondicionado Grado C).",
    brand: "Bosch",
    model: "WGG254Z5ES",
    image: "https://dam.elcorteingles.es/producto/www-001052810327677-00.jpg",
    description:
      "Lavadora Bosch Serie 6 de carga frontal, 10 kg, 1400 rpm. Motor EcoSilence con garantía de 10 años, tambor VarioDrum, tecnología ActiveWater, función AntiManchas y programa Rápido 15/30 min. Display LED touch. Clase A. Reacondicionado Grado C: producto con uso, sin embalaje original, sin desperfectos estéticos.",
    externalUrl:
      "https://www.awin1.com/pclick.php?p=44531643339&a=2854543&m=13075",
    priceCurrent: 499,
    priceOld: 799,
    discountPercent: 38,
  },
  {
    aw: "44149868303",
    name: "AEG - Lavadora AEG 9 kg / 1400 rpm Vapor, cajón UniversalDose - LFR7394O4V (Reacondicionado Grado D).",
    brand: "AEG",
    model: "LFR7394O4V",
    image: "https://dam.elcorteingles.es/producto/www-001052810321969-00.jpg",
    description:
      "Lavadora AEG de carga frontal, 9 kg, 1400 rpm. Programa de refresco con vapor, cajón UniversalDose para cápsulas PODS, programa MixLoad y función PreciseWash que optimiza agua y energía hasta un 40%. Tambor Care, sistema Aqua-Control y display LCD. Reacondicionado Grado D: producto usado con golpe frontal en la parte de abajo, totalmente funcional.",
    externalUrl:
      "https://www.awin1.com/pclick.php?p=44149868303&a=2854543&m=13075",
    priceCurrent: 529,
    priceOld: 919,
    discountPercent: 42,
  },
  {
    aw: "44437097399",
    name: "Bosch - Lavadora Bosch 9 kg/ 1.400 rpm, motor EcoSilence - WUU28T6KES (Reacondicionado Grado C).",
    brand: "Bosch",
    model: "WUU28T6KES",
    image: "https://dam.elcorteingles.es/producto/www-001052810321381-00.jpg",
    description:
      "Lavadora Bosch de carga frontal, 9 kg, 1400 rpm. Motor EcoSilence con garantía de 10 años, ActiveWater Plus, función SpeedPerfect, tambor VarioDrum y display LED Touch. Bloqueo seguridad niños y Aqua Protection. Reacondicionado Grado C: producto sin uso, sin embalaje original, daño estético poco apreciable.",
    externalUrl:
      "https://www.awin1.com/pclick.php?p=44437097399&a=2854543&m=13075",
    priceCurrent: 499,
    priceOld: 838,
    discountPercent: 40,
  },
  {
    aw: "44450209052",
    name: "Bosch - Lavadora Bosch 8 kg./1400 rpm, EcoSilence - WUU28T63ES (Reacondicionado Grado C).",
    brand: "Bosch",
    model: "WUU28T63ES",
    image: "https://dam.elcorteingles.es/producto/www-001052810327347-00.jpg",
    description:
      "Lavadora Bosch de carga frontal, 8 kg, 1400 rpm. Motor EcoSilence, sistema ActiveWater, tambor VarioDrum con palas asimétricas, paneles antivibración y bloqueo seguridad niños. Display LED Touch. Consumo 47 l/ciclo y 46 kWh/100 ciclos. Reacondicionado Grado C: producto con leve uso, sin embalaje original.",
    externalUrl:
      "https://www.awin1.com/pclick.php?p=44450209052&a=2854543&m=13075",
    priceCurrent: 429,
    priceOld: 699,
    discountPercent: 39,
  },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function markSoldOut(): Promise<{ ok: number; missing: number }> {
  let ok = 0;
  let missing = 0;

  for (const model of SOLD_OUT_MODELS) {
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

async function upsertNew(): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const item of NEW_ITEMS) {
    const slug = `${STORE_SLUG}-${item.aw}-${slugify(item.name)}`;

    const existing = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        // No tocamos imagen/descr para no pisar enriquecidos manuales.
      },
      create: {
        slug,
        name: item.name,
        category: "LAVADORAS",
        brand: item.brand,
        model: item.model,
        image: item.image,
        images: [item.image],
        description: item.description,
      },
    });

    const offer = await prisma.offer.findUnique({
      where: { productId_store: { productId: product.id, store: STORE } },
      select: { priceCurrent: true },
    });

    await prisma.offer.upsert({
      where: { productId_store: { productId: product.id, store: STORE } },
      update: {
        priceCurrent: item.priceCurrent,
        priceOld: item.priceOld,
        discountPercent: item.discountPercent,
        externalUrl: item.externalUrl,
        inStock: true,
      },
      create: {
        productId: product.id,
        store: STORE,
        priceCurrent: item.priceCurrent,
        priceOld: item.priceOld,
        discountPercent: item.discountPercent,
        externalUrl: item.externalUrl,
        inStock: true,
      },
    });

    if (!offer) {
      await prisma.priceHistory.create({
        data: { productId: product.id, store: STORE, price: item.priceCurrent },
      });
    } else if (offer.priceCurrent !== item.priceCurrent) {
      await prisma.priceHistory.create({
        data: { productId: product.id, store: STORE, price: item.priceCurrent },
      });
    }

    if (!existing) {
      console.log(`✅ ${item.model}: insertado (${item.priceCurrent}€, -${item.discountPercent}%)`);
      inserted++;
    } else {
      console.log(`✓  ${item.model}: actualizado (${item.priceCurrent}€, -${item.discountPercent}%)`);
      updated++;
    }
  }

  return { inserted, updated };
}

async function main() {
  console.log("🔻 Marcando agotados...");
  const so = await markSoldOut();
  console.log(`   ${so.ok} ofertas tocadas, ${so.missing} modelos no encontrados\n`);

  console.log("🔺 Insertando/actualizando sustitutos...");
  const up = await upsertNew();
  console.log(
    `   ${up.inserted} nuevos, ${up.updated} ya existían\n` +
      `🎯 sync-eci-lavadoras-replace: hecho`,
  );
}

main()
  .catch((e) => {
    console.error("❌ sync-eci-lavadoras-replace error:", e);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
