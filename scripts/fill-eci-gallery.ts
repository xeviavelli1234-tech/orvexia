/**
 * fill-eci-gallery.ts
 * Para cada producto ECI, sondea las URLs dam.elcorteingles.es/producto/www-{ID}-NN.jpg
 * (01..09) con HEAD requests y añade las imágenes encontradas al array images[].
 *
 * Usage:
 *   npx tsx scripts/fill-eci-gallery.ts            # dry-run
 *   npx tsx scripts/fill-eci-gallery.ts --confirm  # write
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: getDatabaseUrl() }) });

const CONFIRM = process.argv.includes("--confirm");
const MAX_SUFFIX = 9;
const BATCH = 10;

async function head(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(6000) });
    return r.status === 200;
  } catch {
    return false;
  }
}

async function discoverGallery(baseId: string): Promise<string[]> {
  // check 01..MAX_SUFFIX in parallel; stop at first gap to avoid spending on holes
  const urls: string[] = [];
  for (let i = 1; i <= MAX_SUFFIX; i++) {
    const suf = String(i).padStart(2, "0");
    const url = `https://dam.elcorteingles.es/producto/www-${baseId}-${suf}.jpg`;
    const ok = await head(url);
    if (!ok) break;
    urls.push(url);
  }
  return urls;
}

async function main() {
  const prods = await prisma.product.findMany({
    where: { slug: { startsWith: "eci-" } },
    select: { id: true, slug: true, image: true, images: true },
  });
  console.log(`ECI products: ${prods.length}`);

  let withGallery = 0;
  let totalNewImages = 0;
  const updates: { id: string; images: string[] }[] = [];

  for (let i = 0; i < prods.length; i += BATCH) {
    const slice = prods.slice(i, i + BATCH);
    const results = await Promise.all(slice.map(async p => {
      const m = (p.image || "").match(/\/producto\/www-(\d+)-00\.jpg/);
      if (!m) return null;
      const baseId = m[1];
      const extra = await discoverGallery(baseId);
      return { p, extra };
    }));

    for (const r of results) {
      if (!r || r.extra.length === 0) continue;
      const primary = r.p.image!;
      const merged = [primary, ...r.extra];
      withGallery++;
      totalNewImages += r.extra.length;
      updates.push({ id: r.p.id, images: merged });
      console.log(`+${r.extra.length} · ${r.p.slug.slice(0, 55)}`);
    }
  }

  console.log(`\n${withGallery}/${prods.length} productos con galería extendida · ${totalNewImages} imágenes nuevas en total.`);

  if (!CONFIRM) {
    console.log(`\nDRY RUN — pasa --confirm para escribir.`);
    return;
  }

  for (const u of updates) {
    await prisma.product.update({ where: { id: u.id }, data: { images: u.images } });
  }
  console.log(`\n✅ Actualizados ${updates.length} productos.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
