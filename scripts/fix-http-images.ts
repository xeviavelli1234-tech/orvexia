import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: getDatabaseUrl() }) });

async function main() {
  const rows = await prisma.$queryRaw<{ id: string; image: string | null; images: string[] }[]>`
    SELECT id, image, images FROM "Product"
    WHERE image LIKE 'http://%' OR EXISTS (SELECT 1 FROM unnest(images) x WHERE x LIKE 'http://%')
  `;
  console.log(`Rows to fix: ${rows.length}`);
  for (const p of rows) {
    const fixedImage = p.image?.replace(/^http:\/\//, "https://") ?? null;
    const fixedImages = p.images.map(u => u.replace(/^http:\/\//, "https://"));
    await prisma.product.update({ where: { id: p.id }, data: { image: fixedImage, images: fixedImages } });
  }
  console.log(`✅ Fixed ${rows.length} products`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
