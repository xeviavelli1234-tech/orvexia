import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

  const realBrand = (await resolveBrand(meta.key, parsed.brand)) ?? parsed.label;
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
    const realBrand = await resolveBrand(meta.key, parsed.brand);
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

  const productsRaw = await prisma.product.findMany({
    where,
    include: {
      offers: {
        where: { inStock: true, priceCurrent: { gte: MIN_PRICE, lte: parsed.kind === "price" ? parsed.maxPrice : MAX_PRICE } },
        orderBy: { priceCurrent: "asc" },
      },
    },
    take: 60,
  });

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
    <main className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }} />

      <nav className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-wider text-white/40 mb-4">
        <Link href="/" className="hover:text-cyan-300">~/</Link>
        <span className="text-white/25">›</span>
        <Link href="/categorias" className="hover:text-cyan-300">categorias</Link>
        <span className="text-white/25">›</span>
        <Link href={`/categorias/${meta.slug}`} className="hover:text-cyan-300">{meta.slug}</Link>
        <span className="text-white/25">›</span>
        <span className="text-cyan-300">{filtro}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white">{titleH1}</h1>
        <p className="mt-3 text-white/70 max-w-3xl">{intro}</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {cards.map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 4} />
        ))}
      </section>
    </main>
  );
}
