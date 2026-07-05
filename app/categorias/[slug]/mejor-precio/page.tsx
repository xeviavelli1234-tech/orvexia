import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { jsonLdScript } from "@/lib/json-ld";
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
          <span className="text-brand-300">Mejor precio</span>
        </nav>

        <header className="reveal mb-8">
          <h1
            className="font-extrabold tracking-tight text-white"
            style={{ fontSize: "clamp(1.9rem, 4vw, 2.7rem)", lineHeight: 1.08, letterSpacing: "-0.03em", textWrap: "balance" }}
          >
            {meta.icon} {meta.label} al mejor precio
          </h1>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>
            Ranking de {products.length} {meta.label.toLowerCase()} ordenados por precio actual.
            {cheapest && (
              <> El más barato es <strong className="font-semibold text-brand-200">{cheapest.name}</strong> desde <strong className="font-semibold text-white">{cheapest._min.toFixed(2)}€</strong>.</>
            )}
            {median > 0 && <> Precio medio: {median.toFixed(0)}€.</>}
          </p>
        </header>

        <section className="reveal grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </section>

        <div aria-hidden className="divider-glow mx-auto mt-12 max-w-3xl" />

        <section className="reveal mt-10 max-w-3xl space-y-4">
          <h2 className="text-xl font-extrabold tracking-tight text-white">¿Es buen momento para comprar?</h2>
          <p className="text-sm leading-relaxed text-white/55">
            Un buen precio no es solo el más bajo del ranking — depende del precio histórico de cada modelo.
            Entra en la ficha del producto que te interese y mira el gráfico de evolución: si está cerca de su
            mínimo histórico, es buen momento. Si acaba de subir tras una bajada, espera unos días.
          </p>
          <h2 className="pt-2 text-xl font-extrabold tracking-tight text-white">Más formas de buscar</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-white/55">
            <li><Link href={`/categorias/${meta.slug}/ofertas-hoy`} className="font-semibold text-brand-300 underline decoration-dotted underline-offset-2 hover:text-brand-200">Ver solo las {meta.label.toLowerCase()} en oferta hoy</Link></li>
            <li><Link href={`/categorias/${meta.slug}`} className="font-semibold text-brand-300 underline decoration-dotted underline-offset-2 hover:text-brand-200">Filtros completos en la categoría</Link></li>
          </ul>
        </section>
      </div>
    </main>
  );
}
