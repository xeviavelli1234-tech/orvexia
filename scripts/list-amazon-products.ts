import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

(async () => {
  const products = await prisma.product.findMany({
    where: { offers: { some: { store: "Amazon" } } },
    select: {
      id: true,
      slug: true,
      name: true,
      brand: true,
      category: true,
      image: true,
      rating: true,
      reviewCount: true,
      createdAt: true,
      offers: {
        where: { store: "Amazon" },
        select: { priceCurrent: true, discountPercent: true, priceOld: true, inStock: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("Total Amazon products:", products.length);

  const byCategory: Record<string, number> = {};
  for (const p of products) byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
  console.log("By category:", byCategory);

  console.log("\nAll:");
  for (const p of products) {
    const o = p.offers[0];
    const hasImg = p.image ? "📷" : "  ";
    const stock = o?.inStock === false ? "❌" : "✅";
    const disc = o?.discountPercent ? `-${o.discountPercent}%` : "    ";
    console.log(
      `${hasImg}${stock} [${p.category.padEnd(15)}] ${(p.brand || "").padEnd(12)} | ${String(o?.priceCurrent ?? "?").padStart(7)}€ ${disc} | rating=${p.rating ?? "-"}/${p.reviewCount ?? 0} | ${p.slug.slice(0, 75)}`,
    );
  }

  await prisma.$disconnect();
})();
