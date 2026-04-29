/**
 * repair-lg-broken.ts
 * Repara iterativamente productos LG con imagen rota:
 *  1. Detecta productos donde la imagen principal es <2KB (placeholder).
 *  2. Verifica el og:image de la página oficial.
 *  3. Si og:image carga ≥5KB → actualiza la imagen.
 *  4. Si og:image también falla → borra el producto (LG quitó el asset).
 * No re-importa productos nuevos; ejecuta import-lg.ts después si quieres
 * reponer huecos.
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const DRY_RUN = process.argv.includes("--dry-run");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchOgImage(awinUrl: string): Promise<string | null> {
  try {
    const r = await fetch(awinUrl, { redirect: "follow", headers: { "User-Agent": UA } });
    if (!r.ok) return null;
    const html = await r.text();
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return m?.[1] ?? null;
  } catch { return null; }
}

async function imageSize(url: string): Promise<number> {
  try {
    const r = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!r.ok) return 0;
    return parseInt(r.headers.get("content-length") ?? "0", 10);
  } catch { return 0; }
}

async function main() {
  const products = await prisma.product.findMany({
    where: { brand: "LG", offers: { some: { store: "LG" } } },
    include: { offers: { where: { store: "LG" }, take: 1 } },
  });

  let fixed = 0, deleted = 0, ok = 0;

  for (const p of products) {
    const offer = p.offers[0];
    if (!offer) continue;

    const main = p.image;
    if (!main) continue;
    const size = await imageSize(main);
    if (size >= 5000) { ok++; continue; }

    process.stdout.write(`🔍 ${p.name.slice(0, 55)}... `);
    const og = await fetchOgImage(offer.externalUrl);
    if (og && (await imageSize(og)) >= 5000) {
      console.log(`🔧 og:image OK`);
      if (!DRY_RUN) {
        const newImages = [og, ...p.images.filter((u) => u !== og && !u.includes("productserve.com"))].slice(0, 8);
        await prisma.product.update({ where: { id: p.id }, data: { image: og, images: newImages } });
      }
      fixed++;
    } else {
      const awId = p.slug.match(/^lg-(\d+)-/)?.[1] ?? "?";
      console.log(`🗑️  borrando aw_product_id=${awId} (sin imagen recuperable)`);
      if (!DRY_RUN) await prisma.product.delete({ where: { id: p.id } });
      deleted++;
    }
  }

  console.log(`\n📊 ${ok} ya OK · ${fixed} reparados · ${deleted} borrados`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
