import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCategoryBySlug, CATEGORY_SLUGS } from "@/lib/catalog/categories";
import ProductCard from "@/components/ProductCard";

export const revalidate = 3600;

export async function generateStaticParams() {
  return CATEGORY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const meta = getCategoryBySlug(slug);
  if (!meta) return { title: "Categoría no encontrada | Orvexia" };
  return {
    title: `Ofertas de ${meta.label} hoy ${new Date().getFullYear()} | Orvexia`,
    description: `Las mejores ofertas en ${meta.label.toLowerCase()} con descuento real, actualizadas hoy. Compara precios entre tiendas y compra al mejor precio.`,
    alternates: { canonical: `/categorias/${meta.slug}/ofertas-hoy` },
  };
}

async function getOffersToday(meta: ReturnType<typeof getCategoryBySlug>) {
  if (!meta) return [];
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const products = await prisma.product.findMany({
    where: {
      category: meta.key,
      offers: {
        some: {
          inStock: true,
          OR: [
            { discountPercent: { gt: 0 } },
            { priceOld: { gt: 0 } },
            { updatedAt: { gte: since } },
          ],
        },
      },
    },
    include: {
      offers: {
        where: { inStock: true },
        orderBy: [{ discountPercent: "desc" }, { priceCurrent: "asc" }],
      },
    },
    take: 60,
  });
  return products
    .map((p) => ({
      ...p,
      _best: p.offers.find((o) => (o.discountPercent ?? 0) > 0) ?? p.offers[0],
    }))
    .filter((p) => p._best)
    .sort((a, b) => (b._best?.discountPercent ?? 0) - (a._best?.discountPercent ?? 0));
}

export default async function OfertasHoyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = getCategoryBySlug(slug);
  if (!meta) notFound();

  const products = await getOffersToday(meta);
  if (products.length < 3) notFound();

  const cards = products.slice(0, 40).map((p) => ({
    id: p.id, slug: p.slug, name: p.name, brand: p.brand, category: p.category as string,
    description: p.description, image: p.image, images: (p.images ?? []) as string[],
    rating: p.rating, reviewCount: p.reviewCount,
    offers: p.offers.map((o) => ({
      store: o.store, priceCurrent: o.priceCurrent, priceOld: o.priceOld,
      discountPercent: o.discountPercent, externalUrl: o.externalUrl, inStock: o.inStock,
    })),
  }));

  const todayLabel = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const maxDiscount = Math.max(...products.map((p) => p._best?.discountPercent ?? 0));

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: "https://www.orvexia.es/" },
      { "@type": "ListItem", position: 2, name: meta.label, item: `https://www.orvexia.es/categorias/${meta.slug}` },
      { "@type": "ListItem", position: 3, name: "Ofertas de hoy", item: `https://www.orvexia.es/categorias/${meta.slug}/ofertas-hoy` },
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
        <span className="text-cyan-300">ofertas-hoy</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          {meta.icon} Ofertas de {meta.label.toLowerCase()} hoy
        </h1>
        <p className="mt-3 text-white/70 max-w-3xl">
          {products.length} {meta.label.toLowerCase()} con descuento activo a fecha de {todayLabel}.
          Hasta un <strong className="text-cyan-300">{maxDiscount}% menos</strong> frente al precio anterior.
          Los precios se actualizan cada pocas horas desde las tiendas oficiales.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {cards.map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 4} />
        ))}
      </section>

      <section className="mt-12 prose prose-invert max-w-3xl text-white/80">
        <h2 className="text-xl font-semibold text-white">¿Cómo elegimos las ofertas?</h2>
        <p>
          Solo mostramos {meta.label.toLowerCase()} con descuento real y disponibilidad en stock.
          Cruzamos el precio actual con el histórico de cada producto para descartar falsos chollos
          (subidas seguidas de bajadas). Si tienes dudas sobre si un precio es bueno, abre la ficha
          del producto y revisa el gráfico de evolución de los últimos 30 días.
        </p>
        <h2 className="text-xl font-semibold text-white">Otras formas de buscar</h2>
        <ul>
          <li><Link href={`/categorias/${meta.slug}/mejor-precio`} className="text-cyan-300">{meta.label} ordenados por mejor precio</Link></li>
          <li><Link href={`/categorias/${meta.slug}`} className="text-cyan-300">Ver toda la categoría de {meta.label.toLowerCase()}</Link></li>
          <li><Link href="/bajadas-recientes" className="text-cyan-300">Bajadas de precio recientes en todas las categorías</Link></li>
        </ul>
      </section>
    </main>
  );
}
