/**
 * update-price.ts
 * Update an existing Offer's price (and optionally priceOld / discount / stock / url),
 * registering the change in PriceHistory if the price actually changed.
 *
 * Usage:
 *   npx tsx scripts/update-price.ts \
 *     --search="Russell Hobbs Colours Plus" \
 *     --store="El Corte Inglés" \
 *     --price=33.60 \
 *     --price-old=63.00 \
 *     --discount=46
 *
 *   # By slug (preferred when known):
 *   npx tsx scripts/update-price.ts --slug="russell-hobbs-colours-plus-crema" --store=ECI --price=33.60
 *
 *   # Mark out of stock:
 *   npx tsx scripts/update-price.ts --slug=... --store=Amazon --in-stock=false
 *
 *   # Dry run (no writes):
 *   npx tsx scripts/update-price.ts --slug=... --store=... --price=... --dry-run
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

const DRY_RUN = process.argv.includes("--dry-run");

function normalizeStore(input: string): string {
  const s = input.toLowerCase().trim();
  if (s === "eci" || s.includes("corte")) return "El Corte Inglés";
  if (s.includes("pccomp")) return "PcComponentes";
  if (s.includes("fnac")) return "Fnac";
  if (s.includes("amazon")) return "Amazon";
  if (s.includes("mediamarkt")) return "MediaMarkt";
  return input;
}

async function findProduct(slug?: string, search?: string) {
  if (slug) {
    const p = await prisma.product.findUnique({ where: { slug } });
    if (!p) throw new Error(`No product with slug "${slug}"`);
    return p;
  }
  if (!search) throw new Error("Provide --slug or --search");

  const tokens = search.split(/\s+/).filter(Boolean);
  const matches = await prisma.product.findMany({
    where: { AND: tokens.map((t) => ({ name: { contains: t, mode: "insensitive" as const } })) },
    select: { id: true, slug: true, name: true, brand: true, category: true },
    take: 10,
  });
  if (matches.length === 0) throw new Error(`No products match "${search}"`);
  if (matches.length > 1) {
    console.log("Multiple matches — refine --search or use --slug:");
    for (const m of matches) console.log(`  · [${m.category}] ${m.name}  →  slug=${m.slug}`);
    throw new Error(`${matches.length} matches`);
  }
  return matches[0];
}

async function main() {
  const slug = arg("slug");
  const search = arg("search");
  const storeRaw = arg("store");
  const priceStr = arg("price");
  const priceOldStr = arg("price-old");
  const discountStr = arg("discount");
  const url = arg("url");
  const inStockStr = arg("in-stock");

  if (!storeRaw) throw new Error("Missing --store");
  const store = normalizeStore(storeRaw);

  const product = await findProduct(slug, search);
  console.log(`📦 ${product.name}  (slug: ${product.slug})`);

  const existing = await prisma.offer.findUnique({
    where: { productId_store: { productId: product.id, store } },
    select: { priceCurrent: true, priceOld: true, discountPercent: true, externalUrl: true, inStock: true },
  });

  if (!existing) {
    console.log(`⚠️  No existing Offer for store "${store}". Create with add-product script first, or pass --url to create here.`);
    if (!url) throw new Error("Offer not found and --url not provided to create one");
  }

  const priceCurrent = priceStr !== undefined ? parseFloat(priceStr) : existing?.priceCurrent;
  if (priceCurrent === undefined || !isFinite(priceCurrent)) throw new Error("Missing/invalid --price");

  const priceOld = priceOldStr !== undefined ? parseFloat(priceOldStr) : existing?.priceOld ?? null;
  let discountPercent: number | null = discountStr !== undefined ? parseInt(discountStr, 10) : existing?.discountPercent ?? null;
  if (priceOld && priceCurrent && discountPercent === null) {
    discountPercent = Math.round(((priceOld - priceCurrent) / priceOld) * 100);
  }
  const externalUrl = url ?? existing?.externalUrl ?? "";
  const inStock = inStockStr !== undefined ? inStockStr.toLowerCase() !== "false" : existing?.inStock ?? true;

  console.log(`🛒 ${store}`);
  console.log(`   precio:    ${existing?.priceCurrent ?? "—"} €  →  ${priceCurrent.toFixed(2)} €`);
  if (priceOld !== null) console.log(`   antes:     ${existing?.priceOld ?? "—"} €  →  ${priceOld.toFixed(2)} €`);
  if (discountPercent !== null) console.log(`   descuento: ${existing?.discountPercent ?? "—"}%  →  ${discountPercent}%`);
  console.log(`   stock:     ${existing?.inStock ?? "—"}  →  ${inStock}`);
  if (url) console.log(`   url:       ${existing?.externalUrl ?? "—"}  →  ${url}`);

  if (DRY_RUN) {
    console.log("🟡 --dry-run: no changes written");
    return;
  }

  await prisma.offer.upsert({
    where: { productId_store: { productId: product.id, store } },
    update: { priceCurrent, priceOld, discountPercent, inStock, ...(url ? { externalUrl: url } : {}) },
    create: { productId: product.id, store, priceCurrent, priceOld, discountPercent, inStock, externalUrl },
  });

  const prev = existing?.priceCurrent;
  if (prev === undefined || prev !== priceCurrent) {
    await prisma.priceHistory.create({ data: { productId: product.id, store, price: priceCurrent } });
    if (prev !== undefined) {
      const arrow = priceCurrent < prev ? "📉" : "📈";
      console.log(`${arrow} ${prev.toFixed(2)} € → ${priceCurrent.toFixed(2)} €  (registrado en PriceHistory)`);
    } else {
      console.log(`🆕 Registrado primer precio en PriceHistory`);
    }
  } else {
    console.log("ℹ️  Precio idéntico al actual: no se registra en PriceHistory");
  }

  console.log("✅ Listo");
}

main()
  .catch((e) => {
    console.error("❌", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
