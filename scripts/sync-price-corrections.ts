/**
 * sync-price-corrections.ts
 * Aplica correcciones puntuales de precio (multi-tienda) en la BD durante el build.
 * Mismo patrón que sync-tv-prices.ts pero genérico (cualquier tienda y categoría).
 *
 * Cada entrada localiza el producto por `slug` (preferido) o por `brand` + `nameContains`,
 * actualiza la Offer de la tienda indicada y registra el cambio en PriceHistory si el precio
 * varía respecto al actual.
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  console.log("⏭️  sync-price-corrections: no DATABASE_URL, skipping");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type Correction = {
  slug?: string;
  brand?: string;
  nameContains?: string;
  store: string;
  priceCurrent: number;
  priceOld?: number | null;
  discountPercent?: number | null;
  externalUrl?: string;
  inStock?: boolean;
};

const CORRECTIONS: Correction[] = [
  // 2026-04-26 — captura usuario: ECI Súper Tecnoprecios (23-26 abr)
  {
    brand: "Russell Hobbs",
    nameContains: "Colours Plus",
    store: "El Corte Inglés",
    priceCurrent: 33.6,
    priceOld: 63.0,
    discountPercent: 46,
    inStock: true,
  },
];

async function findProduct(c: Correction) {
  if (c.slug) {
    return prisma.product.findUnique({ where: { slug: c.slug }, select: { id: true, slug: true, name: true } });
  }
  const where: { brand?: { equals: string; mode: "insensitive" }; name?: { contains: string; mode: "insensitive" } } = {};
  if (c.brand) where.brand = { equals: c.brand, mode: "insensitive" };
  if (c.nameContains) where.name = { contains: c.nameContains, mode: "insensitive" };
  const matches = await prisma.product.findMany({ where, select: { id: true, slug: true, name: true }, take: 5 });
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    console.log(`⚠️  Múltiples coincidencias para "${c.brand} ${c.nameContains}" — afina con slug:`);
    for (const m of matches) console.log(`     · ${m.name} (${m.slug})`);
    return null;
  }
  return matches[0];
}

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const c of CORRECTIONS) {
    const product = await findProduct(c);
    if (!product) {
      console.log(`⚠️  ${c.slug ?? `${c.brand} ${c.nameContains}`}: producto no encontrado`);
      skipped++;
      continue;
    }

    const existing = await prisma.offer.findUnique({
      where: { productId_store: { productId: product.id, store: c.store } },
      select: { priceCurrent: true, priceOld: true, externalUrl: true },
    });

    if (!existing) {
      console.log(`⚠️  ${product.slug}: no existe Offer en "${c.store}" (no se puede crear sin externalUrl)`);
      skipped++;
      continue;
    }

    await prisma.offer.update({
      where: { productId_store: { productId: product.id, store: c.store } },
      data: {
        priceCurrent: c.priceCurrent,
        priceOld: c.priceOld ?? null,
        discountPercent: c.discountPercent ?? null,
        inStock: c.inStock ?? true,
        ...(c.externalUrl ? { externalUrl: c.externalUrl } : {}),
      },
    });

    if (existing.priceCurrent !== c.priceCurrent) {
      await prisma.priceHistory.create({
        data: { productId: product.id, store: c.store, price: c.priceCurrent },
      });
      const arrow = c.priceCurrent < existing.priceCurrent ? "📉" : "📈";
      console.log(
        `${arrow} ${product.slug} [${c.store}] ${existing.priceCurrent}€ → ${c.priceCurrent}€` +
          (c.priceOld ? ` (PVPR ${c.priceOld}€, -${c.discountPercent ?? "?"}%)` : "")
      );
    } else {
      console.log(`✅ ${product.slug} [${c.store}] sin cambio de precio (datos secundarios refrescados)`);
    }
    updated++;
  }

  console.log(`\n🎯 sync-price-corrections: ${updated} aplicadas, ${skipped} omitidas`);
}

main()
  .catch((e) => {
    console.error("❌ sync-price-corrections error:", e);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
