import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY_LAVADORAS = process.argv.includes("--lavadoras");
const STORE = "PcComponentes";
const MAX_IMAGES = 12;
const MANUAL_IMAGES_BY_SLUG: Record<string, string[]> = {
  "samsung-ww80cgc04dthec-lavadora-carga-frontal-8kg-a-blanca": [
    "https://thumb.pccomponentes.com/w-530-530/articles/1079/10791760/1741-samsung-ww80cgc04dthec-lavadora-carga-frontal-8kg-a-blanca.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1079/10791760/2588-samsung-ww80cgc04dthec-lavadora-carga-frontal-8kg-a-blanca-comprar.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1079/10791760/3347-samsung-ww80cgc04dthec-lavadora-carga-frontal-8kg-a-blanca-mejor-precio.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1079/10791760/482-samsung-ww80cgc04dthec-lavadora-carga-frontal-8kg-a-blanca-especificaciones.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1079/10791760/5598-samsung-ww80cgc04dthec-lavadora-carga-frontal-8kg-a-blanca-caracteristicas.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1079/10791760/6380-samsung-ww80cgc04dthec-lavadora-carga-frontal-8kg-a-blanca-opiniones.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1079/10791760/7750-samsung-ww80cgc04dthec-lavadora-carga-frontal-8kg-a-blanca-review.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1079/10791760/8427-samsung-ww80cgc04dthec-lavadora-carga-frontal-8kg-a-blanca-foto.jpg",
  ],
  "lavadora-lg-8-kg-a-f2x50s8tlb-con-ai-direct-drive-y-turbowash-360o": [
    "https://thumb.pccomponentes.com/w-530-530/articles/1102/11020619/1850-lavadora-lg-8-kg-a-f2x50s8tlb-con-ai-direct-drive-y-turbowash-360o.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1102/11020619/2368-lavadora-lg-8-kg-a-f2x50s8tlb-con-ai-direct-drive-y-turbowash-360o-comprar.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1102/11020619/383-lavadora-lg-8-kg-a-f2x50s8tlb-con-ai-direct-drive-y-turbowash-360o-mejor-precio.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1102/11020619/4895-lavadora-lg-8-kg-a-f2x50s8tlb-con-ai-direct-drive-y-turbowash-360o-especificaciones.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1102/11020619/5556-lavadora-lg-8-kg-a-f2x50s8tlb-con-ai-direct-drive-y-turbowash-360o-caracteristicas.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1102/11020619/6330-lavadora-lg-8-kg-a-f2x50s8tlb-con-ai-direct-drive-y-turbowash-360o-opiniones.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1102/11020619/7543-lavadora-lg-8-kg-a-f2x50s8tlb-con-ai-direct-drive-y-turbowash-360o-review.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1102/11020619/8752-lavadora-lg-8-kg-a-f2x50s8tlb-con-ai-direct-drive-y-turbowash-360o-foto.jpg",
  ],
  "lavadora-corbero-clh9404mk-9-kg-carga-frontal-1400-rpm-a-blanca-y-negra-inverter-vapor-touch-control": [
    "https://thumb.pccomponentes.com/w-530-530/articles/1095/10955511/lavadora-corbero-clh9404mk-9-kg-carga-frontal-1400-rpm-a-blanca-y-negra-inverter-vapor-touch-control.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1095/10955511/lavadora-corbero-clh9404mk-9-kg-carga-frontal-1400-rpm-a-blanca-y-negra-inverter-vapor-touch-control-comprar.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1095/10955511/lavadora-corbero-clh9404mk-9-kg-carga-frontal-1400-rpm-a-blanca-y-negra-inverter-vapor-touch-control-mejor-precio.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1095/10955511/lavadora-corbero-clh9404mk-9-kg-carga-frontal-1400-rpm-a-blanca-y-negra-inverter-vapor-touch-control-especificaciones.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1095/10955511/lavadora-corbero-clh9404mk-9-kg-carga-frontal-1400-rpm-a-blanca-y-negra-inverter-vapor-touch-control-caracteristicas.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1095/10955511/lavadora-corbero-clh9404mk-9-kg-carga-frontal-1400-rpm-a-blanca-y-negra-inverter-vapor-touch-control-opiniones.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1095/10955511/lavadora-corbero-clh9404mk-9-kg-carga-frontal-1400-rpm-a-blanca-y-negra-inverter-vapor-touch-control-review.jpg",
    "https://thumb.pccomponentes.com/w-530-530/articles/1095/10955511/lavadora-corbero-clh9404mk-9-kg-carga-frontal-1400-rpm-a-blanca-y-negra-inverter-vapor-touch-control-foto.jpg",
  ],
};

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw.replace(/\\\//g, "/").replace(/\\u002F/g, "/");
  if (cleaned.startsWith("//")) return `https:${cleaned}`;
  return cleaned;
}

function isRealProductImage(url: string): boolean {
  return /thumb\.pccomponentes\.com|static\.pccomponentes\.com/i.test(url) && /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url);
}

function isPlaceholder(url: string): boolean {
  return /\/appliances-bg\.png$/i.test(url) || /\/logos\/pccomponentes\.png$/i.test(url);
}

function extractImageUrls(text: string): string[] {
  const direct = [...text.matchAll(/https?:\/\/[^"'\\\s<>]+/gi)]
    .map((m) => normalizeUrl(m[0]))
    .filter((u): u is string => Boolean(u));

  const fromContent = [...text.matchAll(/content=["']([^"']+)["']/gi)]
    .map((m) => normalizeUrl(m[1]))
    .filter((u): u is string => Boolean(u));

  const encoded = [...text.matchAll(/https%3A%2F%2Fthumb\.pccomponentes\.com%2F[^"'\\\s<>]+/gi)]
    .map((m) => {
      try {
        return normalizeUrl(decodeURIComponent(m[0]));
      } catch {
        return null;
      }
    })
    .filter((u): u is string => Boolean(u));

  const hits = [...direct, ...fromContent, ...encoded].filter(isRealProductImage);
  return uniq(hits).slice(0, MAX_IMAGES);
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function findThumbImagesViaSearch(slug: string): Promise<string[]> {
  const queries = [
    `https://duckduckgo.com/html/?q=site%3Athumb.pccomponentes.com+${encodeURIComponent(slug)}`,
    `https://www.bing.com/search?q=site%3Athumb.pccomponentes.com+${encodeURIComponent(slug)}`,
  ];

  const results: string[] = [];
  for (const q of queries) {
    const txt = await fetchText(q);
    if (!txt) continue;
    const imgs = extractImageUrls(txt).filter((u) => u.includes("thumb.pccomponentes.com"));
    results.push(...imgs);
    if (results.length >= 3) break;
  }

  return uniq(results).slice(0, MAX_IMAGES);
}

function extractImagesNearSlug(text: string, slug: string): string[] {
  const plainSlug = slug.toLowerCase();
  const slugNoDash = plainSlug.replace(/-/g, "");
  const tokens = plainSlug.split("-").filter((t) => t.length >= 4).slice(0, 6);
  const out: string[] = [];

  for (const m of text.matchAll(/https?:\/\/thumb\.pccomponentes\.com\/[^"'\\\s<>]+/gi)) {
    const url = normalizeUrl(m[0]);
    if (!url || !isRealProductImage(url)) continue;

    const idx = m.index ?? -1;
    if (idx < 0) continue;
    const start = Math.max(0, idx - 2500);
    const end = Math.min(text.length, idx + 2500);
    const chunk = text.slice(start, end).toLowerCase();

    const tokenHits = tokens.filter((t) => chunk.includes(t)).length;
    const looksRelated =
      chunk.includes(plainSlug) ||
      chunk.includes(slugNoDash) ||
      tokenHits >= 3 ||
      tokens.some((t) => url.toLowerCase().includes(t));

    if (looksRelated) out.push(url);
  }

  return uniq(out).slice(0, MAX_IMAGES);
}

async function findImagesFromPcListings(slug: string): Promise<string[]> {
  const q = encodeURIComponent(slug.replace(/-/g, " "));
  const candidates = [
    "https://www.pccomponentes.com/lavadoras/corbero",
    "https://www.pccomponentes.com/lavadoras",
    `https://www.pccomponentes.com/buscar/?query=${q}`,
    `https://www.pccomponentes.fr/recherche/?query=${q}`,
    `https://r.jina.ai/http://www.pccomponentes.com/buscar/?query=${q}`,
    `https://r.jina.ai/http://www.pccomponentes.com/lavadoras/corbero`,
  ];

  for (const c of candidates) {
    const txt = await fetchText(c);
    if (!txt) continue;
    const near = extractImagesNearSlug(txt, slug);
    if (near.length) return near;
  }
  return [];
}

function buildCandidates(url: string): string[] {
  const clean = url.replace(/\?refurbished\b/i, "");
  const withAmpQuery = clean.includes("?") ? `${clean}&output=amp` : `${clean}?output=amp`;
  const withAmpPath = clean.endsWith("/") ? `${clean}amp` : `${clean}/amp`;
  const fr = clean.replace("www.pccomponentes.com", "www.pccomponentes.fr");
  const frAmpQuery = fr.includes("?") ? `${fr}&output=amp` : `${fr}?output=amp`;
  const frAmpPath = fr.endsWith("/") ? `${fr}amp` : `${fr}/amp`;
  const jina = `https://r.jina.ai/http://${clean.replace(/^https?:\/\//i, "")}`;
  const jinaAmpQuery = `https://r.jina.ai/http://${withAmpQuery.replace(/^https?:\/\//i, "")}`;
  const jinaAmpPath = `https://r.jina.ai/http://${withAmpPath.replace(/^https?:\/\//i, "")}`;
  const jinaFr = `https://r.jina.ai/http://${fr.replace(/^https?:\/\//i, "")}`;
  const jinaFrAmpQuery = `https://r.jina.ai/http://${frAmpQuery.replace(/^https?:\/\//i, "")}`;
  const jinaFrAmpPath = `https://r.jina.ai/http://${frAmpPath.replace(/^https?:\/\//i, "")}`;

  return uniq([
    clean,
    withAmpQuery,
    withAmpPath,
    fr,
    frAmpQuery,
    frAmpPath,
    jina,
    jinaAmpQuery,
    jinaAmpPath,
    jinaFr,
    jinaFrAmpQuery,
    jinaFrAmpPath,
  ]);
}

function buildSearchCandidates(slug: string): string[] {
  const q = encodeURIComponent(slug.replace(/-/g, " "));
  const es = `https://www.pccomponentes.com/buscar/?query=${q}`;
  const fr = `https://www.pccomponentes.fr/recherche/?query=${q}`;
  const jinaEs = `https://r.jina.ai/http://${es.replace(/^https?:\/\//i, "")}`;
  const jinaFr = `https://r.jina.ai/http://${fr.replace(/^https?:\/\//i, "")}`;
  return [es, fr, jinaEs, jinaFr];
}

async function resolveRealImagesFromExternalUrl(externalUrl: string, slug: string): Promise<string[]> {
  const candidates = buildCandidates(externalUrl);

  for (const u of candidates) {
    const txt = await fetchText(u);
    if (!txt) continue;

    if (/just a moment|cdn-cgi\/challenge-platform|enable javascript and cookies/i.test(txt)) {
      continue;
    }

    const imgs = extractImageUrls(txt);
    if (imgs.length) return imgs;
  }

  for (const u of buildSearchCandidates(slug)) {
    const txt = await fetchText(u);
    if (!txt) continue;
    const imgs = extractImageUrls(txt);
    if (imgs.length) return imgs;
  }

  return [];
}

async function filterReachableImages(urls: string[]): Promise<string[]> {
  const ok: string[] = [];
  for (const u of urls) {
    try {
      const res = await fetch(u, {
        method: "HEAD",
        headers: { "User-Agent": "Mozilla/5.0" },
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });
      const ct = res.headers.get("content-type") ?? "";
      if (res.ok && /image\/(jpeg|jpg|png|webp|avif)/i.test(ct)) {
        ok.push(u);
      }
    } catch {
      // ignore invalid candidate
    }
  }
  return uniq(ok).slice(0, MAX_IMAGES);
}

async function main() {
  const offers = await prisma.offer.findMany({
    where: {
      store: { contains: "pccomponentes", mode: "insensitive" },
      ...(ONLY_LAVADORAS ? { product: { category: "LAVADORAS" } } : {}),
    },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          image: true,
          images: true,
          category: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  console.log(`Analizando ${offers.length} productos de ${STORE}${ONLY_LAVADORAS ? " (lavadoras)" : ""}...`);

  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const offer of offers) {
    const existingReal = (offer.product.images ?? []).filter((u) => isRealProductImage(u) && !isPlaceholder(u));
    if (existingReal.length >= 2) {
      console.log(`[ok] ${offer.product.slug} ya tiene ${existingReal.length} imágenes reales`);
      unchanged++;
      continue;
    }

    try {
      const foundRaw = await resolveRealImagesFromExternalUrl(offer.externalUrl, offer.product.slug);
      const found = await filterReachableImages(foundRaw);
      const manualRaw = MANUAL_IMAGES_BY_SLUG[offer.product.slug] ?? [];
      const manual = manualRaw.length ? await filterReachableImages(manualRaw) : [];
      const searchFound = !found.length && !manual.length ? await findThumbImagesViaSearch(offer.product.slug) : [];
      const listingFound =
        !found.length && !manual.length && !searchFound.length
          ? await findImagesFromPcListings(offer.product.slug)
          : [];
      const chosen = found.length ? found : manual.length ? manual : searchFound.length ? searchFound : listingFound;

      if (!chosen.length) {
        console.log(`[err] ${offer.product.slug}: sin imágenes reales desde URL`);
        failed++;
        continue;
      }

      const newImages = chosen.slice(0, MAX_IMAGES);
      const newImage = newImages[0] ?? null;

      if (!DRY_RUN) {
        await prisma.product.update({
          where: { id: offer.product.id },
          data: { image: newImage, images: newImages },
        });
      }

      console.log(
        `[chg] ${offer.product.slug}: ${existingReal.length} -> ${newImages.length} imágenes${
          found.length ? "" : manual.length ? " (manual)" : searchFound.length ? " (search)" : " (listing)"
        }`
      );
      updated++;
    } catch (e) {
      console.log(`[err] ${offer.product.slug}: ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }
  }

  console.log(`\nResultado: ${updated} actualizados | ${unchanged} sin cambios | ${failed} errores`);
  if (DRY_RUN) console.log("Dry-run: no se guardaron cambios.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
