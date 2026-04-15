import { PrismaClient as PrismaLocal } from "../app/generated/prisma/client";
import { PrismaClient as PrismaProd } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const localAdapter = new PrismaPg({ connectionString: "postgresql://postgres:4563@localhost:5432/comparacion?schema=public" });
const prodAdapter = new PrismaPg({ connectionString: process.env.PROD_DATABASE_URL! });

const local = new PrismaLocal({ adapter: localAdapter });
const prod = new PrismaProd({ adapter: prodAdapter });

async function main() {
  console.log("📦 Leyendo productos de local...");
  const products = await local.product.findMany({ include: { offers: true } });
  console.log(`✅ ${products.length} productos encontrados`);

  for (const product of products) {
    const { offers, id, ...productData } = product;
    try {
      await prod.product.upsert({
        where: { slug: product.slug },
        update: { ...productData },
        create: {
          ...productData,
          offers: {
            create: offers.map(({ id, productId, ...offer }) => offer),
          },
        },
      });
      console.log(`✅ ${product.name}`);
    } catch (e) {
      console.log(`⚠️  ${product.name}: ${e}`);
    }
  }

  console.log("🎉 Migración completada");
}

main()
  .catch(console.error)
  .finally(async () => {
    await local.$disconnect();
    await prod.$disconnect();
  });
