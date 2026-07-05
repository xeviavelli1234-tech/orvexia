import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { jsonLdScript } from "@/lib/json-ld";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  getCategoryBySlug,
  CATEGORY_SLUGS,
  PRICE_THRESHOLDS,
  brandToSlug,
} from "@/lib/catalog/categories";
import ProductCard from "@/components/ProductCard";
import { safeData } from "@/lib/safe-data";

export const revalidate = 3600;

const MIN_PRICE = 20;
const MAX_PRICE = 5000;
const MIN_PRODUCTS_TO_RENDER = 3;

// Pre-genera SOLO los filtros que sabemos que van a renderizar (precio máx
// definido por categoría). Las páginas de marca se generan on-demand desde
// el sitemap y se cachean tras la primera visita.
export async function generateStaticParams() {
  return CATEGORY_SLUGS.flatMap((slug) =>
    PRICE_THRESHOLDS[slug].map((p) => ({ slug, filtro: `menos-de-${p}` })),
  );
}

interface ParsedFilter {
  kind: "price";
  maxPrice: number;
  label: string;
}
interface ParsedBrand {
  kind: "brand";
  brand: string;
  label: string;
}

function parseFilter(raw: string): ParsedFilter | ParsedBrand | null {
  const m = raw.match(/^menos-de-(\d+)$/);
  if (m) {
    const price = parseInt(m[1], 10);
    if (price >= 50 && price <= MAX_PRICE) {
      return { kind: "price", maxPrice: price, label: `menos de ${price}€` };
    }
    return null;
  }
  // Si no es un patrón conocido, lo tratamos como marca (resolveremos al consultar).
  if (/^[a-z0-9][a-z0-9-]{1,30}$/.test(raw)) {
    return { kind: "brand", brand: raw, label: raw.replace(/-/g, " ") };
  }
  return null;
}

async function resolveBrand(categoryKey: Prisma.ProductWhereInput["category"], brandSlug: string) {
  const brands = await prisma.product.findMany({
    where: { category: categoryKey },
    select: { brand: true },
    distinct: ["brand"],
  });
  return brands.find((b) => brandToSlug(b.brand) === brandSlug)?.brand ?? null;
}

function queryFilteredProducts(where: Prisma.ProductWhereInput, maxOfferPrice: number) {
  return prisma.product.findMany({
    where,
    include: {
      offers: {
        where: { inStock: true, priceCurrent: { gte: MIN_PRICE, lte: maxOfferPrice } },
        orderBy: { priceCurrent: "asc" },
      },
    },
    take: 60,
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; filtro: string }>;
}): Promise<Metadata> {
  const { slug, filtro } = await params;
  const meta = getCategoryBySlug(slug);
  if (!meta) return { title: "No encontrado | Orvexia" };
  const parsed = parseFilter(filtro);
  if (!parsed) return { title: "No encontrado | Orvexia" };

  if (parsed.kind === "price") {
    return {
      title: `${meta.label} por menos de ${parsed.maxPrice}€ | Orvexia`,
      description: `Selección de ${meta.label.toLowerCase()} disponibles por menos de ${parsed.maxPrice}€. Precios actualizados y comparados entre tiendas.`,
      alternates: { canonical: `/categorias/${meta.slug}/${filtro}` },
    };
  }

  const realBrand = (await resolveBrand(meta.key, parsed.brand).catch(() => null)) ?? parsed.label;
  return {
    title: `${meta.label} ${realBrand} ${new Date().getFullYear()} | Orvexia`,
    description: `Compara los ${meta.label.toLowerCase()} de ${realBrand} disponibles, con precios actualizados y descuentos reales entre tiendas.`,
    alternates: { canonical: `/categorias/${meta.slug}/${filtro}` },
  };
}

export default async function FiltroPage({
  params,
}: {
  params: Promise<{ slug: string; filtro: string }>;
}) {
  const { slug, filtro } = await params;
  const meta = getCategoryBySlug(slug);
  if (!meta) notFound();

  const parsed = parseFilter(filtro);
  if (!parsed) notFound();

  let where: Prisma.ProductWhereInput;
  let titleH1 = "";
  let intro = "";
  let breadcrumbLabel = "";

  if (parsed.kind === "price") {
    where = {
      category: meta.key,
      offers: {
        some: { inStock: true, priceCurrent: { gte: MIN_PRICE, lte: parsed.maxPrice } },
      },
    };
    titleH1 = `${meta.icon} ${meta.label} por menos de ${parsed.maxPrice}€`;
    intro = `Encuentra ${meta.label.toLowerCase()} con precio inferior a ${parsed.maxPrice}€. La lista cruza el stock real de cada tienda con su precio actual; los productos sin oferta válida en este rango quedan fuera.`;
    breadcrumbLabel = `menos de ${parsed.maxPrice}€`;
  } else {
    const realBrand = await safeData<string | null>(
      () => resolveBrand(meta.key, parsed.brand),
      null,
      `filtro-brand-${slug}`,
    );
    if (!realBrand) notFound();
    where = {
      category: meta.key,
      brand: realBrand,
      offers: { some: { inStock: true, priceCurrent: { gte: MIN_PRICE, lte: MAX_PRICE } } },
    };
    titleH1 = `${meta.icon} ${meta.label} ${realBrand}`;
    intro = `Catálogo de ${meta.label.toLowerCase()} de ${realBrand} con precios comparados entre tiendas. Las ofertas se actualizan varias veces al día.`;
    breadcrumbLabel = realBrand;
  }

  const productsRaw = await safeData<Awaited<ReturnType<typeof queryFilteredProducts>>>(
    () => queryFilteredProducts(where, parsed.kind === "price" ? parsed.maxPrice : MAX_PRICE),
    [],
    `filtro-${slug}`,
  );

  const products = productsRaw
    .filter((p) => p.offers.length > 0)
    .sort((a, b) => (a.offers[0]?.priceCurrent ?? Infinity) - (b.offers[0]?.priceCurrent ?? Infinity));

  if (products.length < MIN_PRODUCTS_TO_RENDER) notFound();

  const cards = products.map((p) => ({
    id: p.id, slug: p.slug, name: p.name, brand: p.brand, category: p.category as string,
    description: p.description, image: p.image, images: (p.images ?? []) as string[],
    rating: p.rating, reviewCount: p.reviewCount,
    offers: p.offers.map((o) => ({
      store: o.store, priceCurrent: o.priceCurrent, priceOld: o.priceOld,
      discountPercent: o.discountPercent, externalUrl: o.externalUrl, inStock: o.inStock,
    })),
  }));

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: "https://www.orvexia.es/" },
      { "@type": "ListItem", position: 2, name: meta.label, item: `https://www.orvexia.es/categorias/${meta.slug}` },
      { "@type": "ListItem", position: 3, name: breadcrumbLabel, item: `https://www.orvexia.es/categorias/${meta.slug}/${filtro}` },
    ],
  };

  return (
    <main className="relative min-h-screen bg-[#050310] text-white/90">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbsJsonLd) }} />

      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[400px] w-[900px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.14), transparent 65%)" }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <nav aria-label="Miga de pan" className="mb-6 flex items-center gap-2 text-[11px] font-semibold text-white/40">
          <Link href="/" className="transition-colors hover:text-brand-200">Inicio</Link>
          <span aria-hidden className="text-white/20">›</span>
          <Link href="/categorias" className="transition-colors hover:text-brand-200">Categorías</Link>
          <span aria-hidden className="text-white/20">›</span>
          <Link href={`/categorias/${meta.slug}`} className="transition-colors hover:text-brand-200">{meta.label}</Link>
          <span aria-hidden className="text-white/20">›</span>
          <span className="text-brand-300">{breadcrumbLabel}</span>
        </nav>

        <header className="reveal mb-8">
          <h1
            className="font-extrabold tracking-tight text-white"
            style={{ fontSize: "clamp(1.9rem, 4vw, 2.7rem)", lineHeight: 1.08, letterSpacing: "-0.03em", textWrap: "balance" }}
          >
            {titleH1}
          </h1>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>{intro}</p>
        </header>

        <section className="reveal grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </section>
      </div>
    </main>
  );
}
