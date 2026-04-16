import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const slug = "svan-frigorifico-combi-sc185602enf";
  const images = [
    "https://m.media-amazon.com/images/I/41fNQoOFX0L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61uBS7C6PwL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/51NQSoQW4gL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/611flZF55xL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/515w5iCHV+L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/51E03mlVE4L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61nwHpVos8L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/71Jxm+YtPzL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/611vIOo912L._AC_SL1500_.jpg",
  ];

  const product = await prisma.product.upsert({
    where: { slug },
    update: { image: images[0], images, rating: 3.8, reviewCount: 16 },
    create: {
      slug,
      name: "Svan Frigorífico Combi 2 Puertas Blanco SC185602ENF",
      category: "FRIGORIFICOS",
      brand: "Svan",
      model: "SC185602ENF",
      image: images[0],
      images,
      rating: 3.8,
      reviewCount: 16,
      description:
        "Capacidad 293 Litros, No Frost, Multi AirFlow, Puerta Reversible, Bajo Nivel Sonoro, Eficiencia Energética Clase E.",
    },
  });

  // ── Oferta ──────────────────────────────────────────────────────────────
  const store = "Amazon";
  const priceCurrent = 315.00;
  const inStock = true; // ← cambia a false cuando esté agotado

  // Comprobar precio anterior para registrar cambio en PriceHistory
  const ofertaActual = await prisma.offer.findUnique({
    where: { productId_store: { productId: product.id, store } },
    select: { priceCurrent: true },
  });

  await prisma.offer.upsert({
    where: { productId_store: { productId: product.id, store } },
    update: { priceCurrent, priceOld: 379.90, discountPercent: 17, externalUrl: "https://amzn.to/3PR0V8z", inStock },
    create: { productId: product.id, store, priceCurrent, priceOld: 379.90, discountPercent: 17, externalUrl: "https://amzn.to/3PR0V8z", inStock },
  });

  // Registrar en PriceHistory si el precio cambió (o es nuevo)
  const precioAnterior = ofertaActual?.priceCurrent;
  if (precioAnterior === undefined || precioAnterior !== priceCurrent) {
    await prisma.priceHistory.create({
      data: { productId: product.id, store, price: priceCurrent },
    });
    if (precioAnterior !== undefined) {
      console.log(`📈 Precio cambiado: ${precioAnterior.toFixed(2)} € → ${priceCurrent.toFixed(2)} € (registrado en historial)`);
    }
  }

  console.log(`✅ Añadido: ${product.name} — ${priceCurrent.toFixed(2)} € en ${store} | inStock: ${inStock}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
