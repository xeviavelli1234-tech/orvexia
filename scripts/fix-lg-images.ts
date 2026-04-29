/**
 * fix-lg-images.ts
 * El feed Awin LG nos da URLs www.lg.com que en muchos casos dan 404
 * (LG quitó assets en su CDN). En cambio, la imagen alternativa que viene
 * en images2.productserve.com (proxy/cache de Awin) sí responde.
 * Este script:
 *  1. Itera productos LG en BD
 *  2. Promueve cualquier URL productserve.com a la primera posición
 *  3. Verifica si la URL principal www.lg.com da 200 — si 404, la elimina
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const DRY_RUN = process.argv.includes("--dry-run");

async function check(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.status;
  } catch {
    return 0;
  }
}

async function main() {
  const products = await prisma.product.findMany({
    where: { brand: { equals: "LG", mode: "insensitive" } },
    select: { id: true, slug: true, image: true, images: true },
  });
  console.log(`📦 ${products.length} productos LG\n`);

  let fixed = 0;
  let skipped = 0;
  for (const p of products) {
    const orig = p.images;
    const productserve = orig.filter((u) => u.includes("productserve.com"));
    const lgcom = orig.filter((u) => u.includes("lg.com") && !u.includes("productserve"));

    // Verificar la URL lgcom principal
    const validLg: string[] = [];
    for (const u of lgcom) {
      const code = await check(u);
      if (code === 200) validLg.push(u);
      else console.log(`  ⚠️  404 ${u.slice(0, 90)}`);
    }

    // Nuevo orden: productserve primero, lgcom válidas después
    const merged = [...productserve, ...validLg];
    const newImages = merged.length > 0 ? merged : orig;
    const newImage = newImages[0] ?? p.image;

    const sameImages = orig.length === newImages.length && orig.every((u, i) => u === newImages[i]);
    const sameImage = p.image === newImage;
    if (sameImages && sameImage) { skipped++; continue; }

    console.log(`✅ ${p.slug.slice(0, 70)}: ${orig.length}→${newImages.length} imgs, principal ${p.image === newImage ? "(igual)" : "actualizada"}`);
    if (!DRY_RUN) {
      await prisma.product.update({
        where: { id: p.id },
        data: { images: newImages, image: newImage },
      });
    }
    fixed++;
  }
  console.log(`\n🎯 ${fixed} productos ${DRY_RUN ? "se actualizarían" : "actualizados"}, ${skipped} sin cambios`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
