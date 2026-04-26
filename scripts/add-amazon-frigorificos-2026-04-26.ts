/**
 * Añade 10 frigoríficos a la categoría FRIGORIFICOS, tienda Amazon, según
 * capturas amazon.es del 2026-04-26.
 *
 * ASINs verificados vía búsqueda. Imágenes desde el endpoint público
 * images-na.ssl-images-amazon.com/images/P/<ASIN> (160x160 thumbnail) cuando
 * existe; algunos ASINs sólo sirven 1x1 GIF en /P/ — para esos uso CDN
 * MediaMarkt o dejo placeholder.
 *
 * Uso:
 *   npx tsx scripts/add-amazon-frigorificos-2026-04-26.ts
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  console.log("⏭️  no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const STORE = "Amazon";

type Item = {
  asin: string;
  name: string;
  brand: string;
  model: string;
  description: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  image: string | null;
};

const ITEMS: Item[] = [
  {
    asin: "B0BYHMVWGZ",
    name: "CHiQ FBM228NE4DE No Frost Combi - Frigorífico independiente con congelador 231 L, sin escarcha, dispensador de agua, 170 cm",
    brand: "CHiQ",
    model: "FBM228NE4DE",
    description:
      "Frigorífico combi CHiQ de 231 L de capacidad (161 L nevera + 70 L congelador), tecnología No Frost, dispensador de agua, flujo de aire múltiple, función fast freeze, altura 170 cm. Clase de eficiencia energética E.",
    priceCurrent: 369.99,
    priceOld: null,
    discountPercent: null,
    image:
      "https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MP_168017629?x=800&y=800&format=jpg",
  },
  {
    asin: "B0FTDV9JGW",
    name: "Midea Frigorífico Combi Blanco 262 L | 55 cm x 177 cm | Nevera Combi con Congelador 65 L Low Frost - Bajo Consumo, Puertas Reversibles, 39 dB",
    brand: "Midea",
    model: "MDRB394FGE01ES",
    description:
      "Frigorífico combi Midea de 262 L (197 L nevera + 65 L congelador), tecnología Low Frost, puertas reversibles, bajo nivel sonoro de 39 dB. Dimensiones 55 x 177 cm. Clase E.",
    priceCurrent: 299.99,
    priceOld: null,
    discountPercent: null,
    image: null,
  },
  {
    asin: "B0G2Z33K4K",
    name: "Candy CNCQ2T518EG City Fresco 300 - Frigorífico Combi Verde, 54,5x182,5 cm, Total No Frost Circle+, 4 Estantes, 4 Balconeras, Cajón Fresh 0ºC, Control Digital Interno, Puerta Reversible",
    brand: "Candy",
    model: "CNCQ2T518EG",
    description:
      "Frigorífico combi Candy City Fresco 300 con tecnología Total No Frost Circle+, 4 estantes, 4 balconeras, cajón Fresh 0ºC, control digital interno, puerta reversible. Color verde. Dimensiones 54,5x182,5 cm. Clase E.",
    priceCurrent: 382.69,
    priceOld: 419.0,
    discountPercent: 9,
    image:
      "https://images-na.ssl-images-amazon.com/images/P/B0G2Z33K4K.01._SL500_.jpg",
  },
  {
    asin: "B0F351DLPY",
    name: "Svan SC185602ENF - Frigorífico Combi 2 Puertas Blanco 293 L No Frost, Multi AirFlow, Puerta Reversible, Bajo Nivel Sonoro",
    brand: "Svan",
    model: "SC185602ENF",
    description:
      "Frigorífico combi Svan de 293 L con tecnología No Frost, sistema Multi AirFlow para distribución uniforme del frío, puerta reversible y bajo nivel sonoro. Color blanco. Clase E.",
    priceCurrent: 314.99,
    priceOld: 379.9,
    discountPercent: 17,
    image:
      "https://images-na.ssl-images-amazon.com/images/P/B0F351DLPY.01._SL500_.jpg",
  },
  {
    asin: "B0F1P57B4Y",
    name: "Nilson NC185500E - Frigorífico Combi 2 Puertas Blanco 262 L, Puerta Reversible, Bajo Nivel Sonoro, Tecnología Cíclica",
    brand: "Nilson",
    model: "NC185500E",
    description:
      "Frigorífico combi Nilson de 262 L con tecnología cíclica, puerta reversible, bajo nivel sonoro. Dimensiones 180 x 55 cm. Color blanco. Clase E.",
    priceCurrent: 289.9,
    priceOld: null,
    discountPercent: null,
    image:
      "https://images-na.ssl-images-amazon.com/images/P/B0F1P57B4Y.01._SL500_.jpg",
  },
  {
    asin: "B0BPZKV8YT",
    name: "Cecotec Mini Nevera Bolero MiniCooling 4L Habana Light Blue - Funcionamiento 12V-220V, Compatible coche y caravanas, Función enfriamiento y calentamiento, Rango temperatura 5-65º",
    brand: "Cecotec",
    model: "Bolero MiniCooling 4L Habana",
    description:
      "Mini nevera Cecotec Bolero MiniCooling 4L compatible con corriente de 12V (coche/caravana) y 220V. Función enfriamiento y calentamiento, rango de temperatura 5-65ºC. Color Light Blue. Capacidad 4 litros, ideal para transporte fácil.",
    priceCurrent: 42.9,
    priceOld: null,
    discountPercent: null,
    image:
      "https://images-na.ssl-images-amazon.com/images/P/B0BPZKV8YT.01._SL500_.jpg",
  },
  {
    asin: "B0DN5WW6KW",
    name: "Comfee RCD93BL2EURT(E) - Refrigerador Bajo Encimera 93 L Retro Independiente con Compartimento Enfriador, Termostatos Ajustables, Luz LED, Negro",
    brand: "Comfee",
    model: "RCD93BL2EURT",
    description:
      "Frigorífico bajo encimera Comfee de estilo retro, 93 L de capacidad, compartimento enfriador, termostatos ajustables, iluminación LED. Color negro. Clase E.",
    priceCurrent: 169.99,
    priceOld: 189.99,
    discountPercent: 11,
    image:
      "https://images-na.ssl-images-amazon.com/images/P/B0DN5WW6KW.01._SL500_.jpg",
  },
  {
    asin: "B0CYH72M4S",
    name: "Candy CHASD4351EBC - Frigorífico Mini Bajo Encimera, Ancho 44,5 cm, Altura 51 cm, Capacidad 43 L, 2 Estantes en la Puerta, Control Interno Mecánico, Iluminación LED, 37 dB, Negro",
    brand: "Candy",
    model: "CHASD4351EBC",
    description:
      "Mini frigorífico Candy de 43 L bajo encimera, dimensiones compactas 44,5 x 51 cm. Control mecánico de temperatura, 2 estantes en la puerta, iluminación LED, nivel sonoro 37 dB. Color negro. Clase E.",
    priceCurrent: 99.0,
    priceOld: 129.0,
    discountPercent: 23,
    image:
      "https://images-na.ssl-images-amazon.com/images/P/B0CYH72M4S.01._SL500_.jpg",
  },
  {
    asin: "B0CK6FYLJ9",
    name: "CHiQ Frigorífico Minibar 46L con Compresor - Botellero, Compartimento Congelador, Control de Temperatura regulable, Puerta Reversible, Negro",
    brand: "CHiQ",
    model: "Minibar 46L",
    description:
      "Minibar CHiQ de 46 L con compresor incorporado, botellero, compartimento congelador, control de temperatura regulable, puerta reversible y bajo nivel de ruido. Color negro. Clase E.",
    priceCurrent: 104.99,
    priceOld: null,
    discountPercent: null,
    image: null,
  },
  {
    asin: "B0DJ8ZCPK7",
    name: "Svan SR145501E - Frigorífico Refrigerador Blanco 242 L, Puerta Reversible, Bajo Nivel Sonoro, Tecnología Cíclica",
    brand: "Svan",
    model: "SR145501E",
    description:
      "Frigorífico Svan de 1 puerta, 242 L de capacidad, congelador interno, puerta reversible, tecnología cíclica, bajo nivel sonoro. Dimensiones 55,5 x 143 cm. Color blanco. Clase E.",
    priceCurrent: 288.57,
    priceOld: null,
    discountPercent: null,
    image:
      "https://images-na.ssl-images-amazon.com/images/P/B0DJ8ZCPK7.01._SL500_.jpg",
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

async function main() {
  let inserted = 0;
  let updated = 0;

  for (const it of ITEMS) {
    const slug = `amazon-${it.asin.toLowerCase()}-${slugify(it.name)}`;
    const externalUrl = `https://www.amazon.es/dp/${it.asin}`;
    const images = it.image ? [it.image] : [];

    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        image: it.image,
        images,
      },
      create: {
        slug,
        name: it.name,
        category: "FRIGORIFICOS",
        brand: it.brand,
        model: it.model,
        description: it.description,
        image: it.image,
        images,
      },
    });

    const before = await prisma.offer.findUnique({
      where: { productId_store: { productId: product.id, store: STORE } },
      select: { priceCurrent: true },
    });

    await prisma.offer.upsert({
      where: { productId_store: { productId: product.id, store: STORE } },
      update: {
        priceCurrent: it.priceCurrent,
        priceOld: it.priceOld,
        discountPercent: it.discountPercent,
        externalUrl,
        inStock: true,
      },
      create: {
        productId: product.id,
        store: STORE,
        priceCurrent: it.priceCurrent,
        priceOld: it.priceOld,
        discountPercent: it.discountPercent,
        externalUrl,
        inStock: true,
      },
    });

    if (!before) {
      await prisma.priceHistory.create({
        data: { productId: product.id, store: STORE, price: it.priceCurrent },
      });
      inserted++;
      console.log(`✅ insertado: ${it.brand} ${it.model} ${it.priceCurrent}€`);
    } else {
      if (before.priceCurrent !== it.priceCurrent) {
        await prisma.priceHistory.create({
          data: { productId: product.id, store: STORE, price: it.priceCurrent },
        });
      }
      updated++;
      console.log(`🔄 actualizado: ${it.brand} ${it.model} ${it.priceCurrent}€`);
    }
  }

  console.log(
    `\n🎯 add-amazon-frigorificos: ${inserted} insertados, ${updated} actualizados`,
  );
}

main()
  .catch((e) => {
    console.error("❌ error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
