import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { jsonLdScript } from "@/lib/json-ld";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCategoryBySlug, CATEGORY_SLUGS } from "@/lib/catalog/categories";
import ProductCard from "@/components/ProductCard";
import { safeData } from "@/lib/safe-data";

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

  const products = await safeData<Awaited<ReturnType<typeof getOffersToday>>>(
    () => getOffersToday(meta),
    [],
    `ofertas-hoy-${slug}`,
  );
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
          <span className="text-brand-300">Ofertas de hoy</span>
        </nav>

        <header className="reveal mb-8">
          <h1
            className="font-extrabold tracking-tight text-white"
            style={{ fontSize: "clamp(1.9rem, 4vw, 2.7rem)", lineHeight: 1.08, letterSpacing: "-0.03em", textWrap: "balance" }}
          >
            {meta.icon} Ofertas de {meta.label.toLowerCase()} hoy
          </h1>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>
            {products.length} {meta.label.toLowerCase()} con descuento activo a fecha de {todayLabel}.
            Hasta un <strong className="font-semibold text-brand-200">{maxDiscount}% menos</strong> frente al precio anterior.
            Los precios se actualizan cada pocas horas desde las tiendas oficiales.
          </p>
        </header>

        <section className="reveal grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </section>

        <div aria-hidden className="divider-glow mx-auto mt-12 max-w-3xl" />

        <section className="reveal mt-10 max-w-3xl space-y-4">
          <h2 className="text-xl font-extrabold tracking-tight text-white">¿Cómo elegimos las ofertas?</h2>
          <p className="text-sm leading-relaxed text-white/55">
            Solo mostramos {meta.label.toLowerCase()} con descuento real y disponibilidad en stock.
            Cruzamos el precio actual con el histórico de cada producto para descartar falsos chollos
            (subidas seguidas de bajadas). Si tienes dudas sobre si un precio es bueno, abre la ficha
            del producto y revisa el gráfico de evolución de los últimos 30 días.
          </p>
          <h2 className="pt-2 text-xl font-extrabold tracking-tight text-white">Otras formas de buscar</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-white/55">
            <li><Link href={`/categorias/${meta.slug}/mejor-precio`} className="font-semibold text-brand-300 underline decoration-dotted underline-offset-2 hover:text-brand-200">{meta.label} ordenados por mejor precio</Link></li>
            <li><Link href={`/categorias/${meta.slug}`} className="font-semibold text-brand-300 underline decoration-dotted underline-offset-2 hover:text-brand-200">Ver toda la categoría de {meta.label.toLowerCase()}</Link></li>
            <li><Link href="/bajadas-recientes" className="font-semibold text-brand-300 underline decoration-dotted underline-offset-2 hover:text-brand-200">Bajadas de precio recientes en todas las categorías</Link></li>
          </ul>
        </section>
      </div>
    </main>
  );
}
