import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCategoryBySlug, CATEGORY_SLUGS } from "@/lib/catalog/categories";
import ProductCard from "@/components/ProductCard";
import { safeData } from "@/lib/safe-data";

export const revalidate = 3600;

const MIN_PRICE = 20;
const MAX_PRICE = 5000;

export async function generateStaticParams() {
  return CATEGORY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const meta = getCategoryBySlug(slug);
  if (!meta) return { title: "Categoría no encontrada | Orvexia" };
  return {
    title: `${meta.label} al mejor precio ${new Date().getFullYear()} | Orvexia`,
    description: `Ranking de ${meta.label.toLowerCase()} ordenados por precio actual. Compara entre tiendas y compra al precio más bajo disponible hoy.`,
    alternates: { canonical: `/categorias/${meta.slug}/mejor-precio` },
  };
}

async function getProducts(meta: ReturnType<typeof getCategoryBySlug>) {
  if (!meta) return [];
  return prisma.product.findMany({
    where: {
      category: meta.key,
      offers: {
        some: { inStock: true, priceCurrent: { gte: MIN_PRICE, lte: MAX_PRICE } },
      },
    },
    include: {
      offers: {
        where: { inStock: true, priceCurrent: { gte: MIN_PRICE, lte: MAX_PRICE } },
        orderBy: { priceCurrent: "asc" },
      },
    },
    take: 80,
  });
}

export default async function MejorPrecioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = getCategoryBySlug(slug);
  if (!meta) notFound();

  const productsRaw = await safeData<Awaited<ReturnType<typeof getProducts>>>(
    () => getProducts(meta),
    [],
    `mejor-precio-${slug}`,
  );
  const products = productsRaw
    .map((p) => ({ ...p, _min: p.offers[0]?.priceCurrent ?? Infinity }))
    .filter((p) => Number.isFinite(p._min))
    .sort((a, b) => a._min - b._min)
    .slice(0, 60);

  if (products.length < 3) notFound();

  const cards = products.map((p) => ({
    id: p.id, slug: p.slug, name: p.name, brand: p.brand, category: p.category as string,
    description: p.description, image: p.image, images: (p.images ?? []) as string[],
    rating: p.rating, reviewCount: p.reviewCount,
    offers: p.offers.map((o) => ({
      store: o.store, priceCurrent: o.priceCurrent, priceOld: o.priceOld,
      discountPercent: o.discountPercent, externalUrl: o.externalUrl, inStock: o.inStock,
    })),
  }));

  const cheapest = products[0];
  const median = products[Math.floor(products.length / 2)]?._min ?? 0;

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: "https://www.orvexia.es/" },
      { "@type": "ListItem", position: 2, name: meta.label, item: `https://www.orvexia.es/categorias/${meta.slug}` },
      { "@type": "ListItem", position: 3, name: "Mejor precio", item: `https://www.orvexia.es/categorias/${meta.slug}/mejor-precio` },
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
        <span className="text-cyan-300">mejor-precio</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          {meta.icon} {meta.label} al mejor precio
        </h1>
        <p className="mt-3 text-white/70 max-w-3xl">
          Ranking de {products.length} {meta.label.toLowerCase()} ordenados por precio actual.
          {cheapest && (
            <> El más barato es <strong className="text-cyan-300">{cheapest.name}</strong> desde <strong>{cheapest._min.toFixed(2)}€</strong>.</>
          )}
          {median > 0 && <> Precio medio: {median.toFixed(0)}€.</>}
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {cards.map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 4} />
        ))}
      </section>

      <section className="mt-12 prose prose-invert max-w-3xl text-white/80">
        <h2 className="text-xl font-semibold text-white">¿Es buen momento para comprar?</h2>
        <p>
          Un buen precio no es solo el más bajo del ranking — depende del precio histórico de cada modelo.
          Entra en la ficha del producto que te interese y mira el gráfico de evolución: si está cerca de su
          mínimo histórico, es buen momento. Si acaba de subir tras una bajada, espera unos días.
        </p>
        <h2 className="text-xl font-semibold text-white">Más formas de buscar</h2>
        <ul>
          <li><Link href={`/categorias/${meta.slug}/ofertas-hoy`} className="text-cyan-300">Ver solo las {meta.label.toLowerCase()} en oferta hoy</Link></li>
          <li><Link href={`/categorias/${meta.slug}`} className="text-cyan-300">Filtros completos en la categoría</Link></li>
        </ul>
      </section>
    </main>
  );
}
