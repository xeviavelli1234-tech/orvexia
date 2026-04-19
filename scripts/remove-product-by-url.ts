import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DRY_RUN = process.argv.includes("--dry-run");

// Puedes cambiar esta URL o pasar --url=...
const DEFAULT_URL =
  "https://www.pccomponentes.com/origial-drycare-oridry8awd-8-kg-carga-frontal-secadora-con-bomba-de-calor-8-kg-d";

function getArg(name: string): string | null {
  const prefix = `--${name}=`;
  const value = process.argv.find((a) => a.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

function slugFromUrl(url: string): string {
  const pathname = new URL(url).pathname;
  return decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const url = getArg("url") ?? DEFAULT_URL;
  const slug = getArg("slug") ?? slugFromUrl(url);

  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });

  if (!product) {
    console.log(`No existe producto con slug "${slug}"`);
    return;
  }

  const counts = await Promise.all([
    prisma.offer.count({ where: { productId: product.id } }),
    prisma.priceHistory.count({ where: { productId: product.id } }),
    prisma.buySignal.count({ where: { productId: product.id } }),
    prisma.savedProduct.count({ where: { productId: product.id } }),
    prisma.priceAlert.count({ where: { productId: product.id } }),
    prisma.review.count({ where: { productId: product.id } }),
    prisma.communityPost.count({ where: { productId: product.id } }),
  ]);

  console.log(`Producto: ${product.name} (${product.slug})`);
  console.log(
    `Dependencias -> offers:${counts[0]} history:${counts[1]} buySignals:${counts[2]} saved:${counts[3]} alerts:${counts[4]} reviews:${counts[5]} posts:${counts[6]}`
  );

  if (DRY_RUN) {
    console.log("Dry-run: no se borró nada.");
    return;
  }

  await prisma.$transaction([
    prisma.offer.deleteMany({ where: { productId: product.id } }),
    prisma.priceHistory.deleteMany({ where: { productId: product.id } }),
    prisma.buySignal.deleteMany({ where: { productId: product.id } }),
    prisma.savedProduct.deleteMany({ where: { productId: product.id } }),
    prisma.priceAlert.deleteMany({ where: { productId: product.id } }),
    prisma.review.deleteMany({ where: { productId: product.id } }),
    prisma.communityPost.deleteMany({ where: { productId: product.id } }),
    prisma.product.delete({ where: { id: product.id } }),
  ]);

  console.log("Producto eliminado de la base de datos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
