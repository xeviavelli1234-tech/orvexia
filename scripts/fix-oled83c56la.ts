/**
 * One-off: las 2 primeras imágenes del LG OLED83C56LA (outlet 83") están rotas.
 * Verifica cada URL del producto y borra las que devuelvan != 200.
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
const DRY_RUN = process.argv.includes("--dry-run");

async function check(url: string): Promise<{ status: number; reason?: string }> {
  // Si es un proxy productserve, extrae la URL real envuelta y comprueba esa.
  // El proxy devuelve 200 con un placeholder "no image" cuando la URL fuente da 404.
  let realUrl = url;
  if (url.includes("productserve.com") && url.includes("url=")) {
    try {
      const m = url.match(/[?&]url=([^&]+)/);
      if (m) {
        const decoded = decodeURIComponent(m[1]).replace(/^ssl%3A/i, "https://").replace(/^ssl:/i, "https://");
        realUrl = decoded.startsWith("http") ? decoded : `https://${decoded}`;
      }
    } catch { /* ignore */ }
  }

  try {
    const res = await fetch(realUrl, { method: "HEAD", redirect: "follow" });
    if (res.status !== 200) return { status: res.status, reason: realUrl !== url ? "wrapped url 404" : undefined };
    return { status: res.status };
  } catch {
    return { status: 0 };
  }
}

async function main() {
  const total = await prisma.product.count();
  const lgCount = await prisma.product.count({ where: { brand: { equals: "LG", mode: "insensitive" } } });
  console.log(`📊 Total productos: ${total}, LG: ${lgCount}\n`);

  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { name: { contains: "OLED83C56LA", mode: "insensitive" } },
        { name: { contains: "OLED83C56", mode: "insensitive" } },
        { name: { contains: "AI C5 83", mode: "insensitive" } },
        { slug: { contains: "oled83c56", mode: "insensitive" } },
        { model: { contains: "OLED83C56", mode: "insensitive" } },
      ],
    },
    select: { id: true, slug: true, name: true, image: true, images: true },
  });

  if (!product) {
    // Fallback: amplia
    const candidates = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: "OLED", mode: "insensitive" } },
          { name: { contains: "Outlet", mode: "insensitive" } },
          { slug: { contains: "outlet", mode: "insensitive" } },
        ],
      },
      select: { slug: true, name: true, brand: true },
      take: 30,
    });
    console.log("❌ Producto no encontrado. Candidatos:");
    candidates.forEach((c) => console.log(`   - [${c.brand}] ${c.slug}  |  ${c.name?.slice(0, 80)}`));
    return;
  }

  console.log(`📦 ${product.name}`);
  console.log(`   slug=${product.slug}`);
  console.log(`   ${product.images.length} imágenes:\n`);

  const checked: { url: string; status: number; keep: boolean; reason?: string }[] = [];
  for (let i = 0; i < product.images.length; i++) {
    const u = product.images[i];
    const r = await check(u);
    const keep = r.status === 200;
    checked.push({ url: u, status: r.status, keep, reason: r.reason });
    console.log(`   ${keep ? "✓" : "✗"} [${i}] ${r.status || "ERR"}${r.reason ? " (" + r.reason + ")" : ""} — ${u.slice(0, 100)}`);
  }

  const valid = checked.filter((c) => c.keep).map((c) => c.url);
  const removed = checked.length - valid.length;

  if (removed === 0) {
    console.log("\n✅ Todas las imágenes responden 200. Nada que hacer.");
    return;
  }

  const newImage = valid[0] ?? product.image;
  console.log(`\n🔧 Eliminando ${removed} imagen(es) rotas. Quedan ${valid.length}.`);
  if (!product.images.includes(newImage) && newImage !== product.image) {
    console.log(`   Imagen principal: actualizada`);
  }

  if (DRY_RUN) {
    console.log("\n(DRY-RUN) No se aplican cambios. Vuelve a ejecutar sin --dry-run.");
    return;
  }

  await prisma.product.update({
    where: { id: product.id },
    data: { images: valid, image: newImage },
  });
  console.log("\n✅ Actualizado.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
