export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Category } from "@/app/generated/prisma/client";
import ProductPageClient from "./ProductPageClient";
import { buildAnalysis, getCategoryStats } from "@/lib/productAnalysis";
import {
  buildShippingDetails,
  buildReturnPolicy,
  detectItemCondition,
} from "@/lib/seo/store-policies";

const CATEGORY_LABELS: Record<string, string> = {
  TELEVISORES: "Televisores", LAVADORAS: "Lavadoras", FRIGORIFICOS: "Frigoríficos",
  LAVAVAJILLAS: "Lavavajillas", SECADORAS: "Secadoras", HORNOS: "Hornos",
  MICROONDAS: "Microondas", ASPIRADORAS: "Aspiradoras", CAFETERAS: "Cafeteras",
  AIRES_ACONDICIONADOS: "Aire acondicionado", OTROS: "Otros",
};

const CATEGORY_SLUGS: Record<string, string> = {
  TELEVISORES: "televisores", LAVADORAS: "lavadoras", FRIGORIFICOS: "frigorificos",
  LAVAVAJILLAS: "lavavajillas", SECADORAS: "secadoras", HORNOS: "hornos",
  MICROONDAS: "microondas", ASPIRADORAS: "aspiradoras", CAFETERAS: "cafeteras",
  AIRES_ACONDICIONADOS: "aires_acondicionados", OTROS: "otros",
};

const SPEC_PATTERNS: { regex: RegExp; icon: string; label: (m: RegExpMatchArray) => string }[] = [
  { regex: /(\d+)\s*pulgadas/i,          icon: "📐", label: (m) => `${m[1]}"` },
  { regex: /4K UHD/i,                    icon: "🖥️", label: () => "4K UHD" },
  { regex: /Full HD/i,                   icon: "🖥️", label: () => "Full HD" },
  { regex: /8K/i,                        icon: "🖥️", label: () => "8K" },
  { regex: /HDR\s*10\+?/i,              icon: "✨", label: () => "HDR10" },
  { regex: /Dolby Vision/i,              icon: "✨", label: () => "Dolby Vision" },
  { regex: /(\d+)\s*Hz/i,               icon: "⚡", label: (m) => `${m[1]} Hz" ` },
  { regex: /OLED/i,                      icon: "💡", label: () => "OLED" },
  { regex: /QLED/i,                      icon: "💡", label: () => "QLED" },
  { regex: /(\d+)\s*kg/i,               icon: "⚖️", label: (m) => `${m[1]} kg` },
  { regex: /(\d+)\s*rpm/i,              icon: "🌀", label: (m) => `${m[1]} rpm` },
  { regex: /Inverter/i,                  icon: "🔧", label: () => "Inverter" },
  { regex: /No\s*Frost/i,               icon: "❄️", label: () => "No Frost" },
  { regex: /Clase\s*([A-D][+]*)/i,      icon: "⚡", label: (m) => `Clase ${m[1]}` },
  { regex: /WiFi/i,                      icon: "📶", label: () => "WiFi" },
  { regex: /Bluetooth/i,                 icon: "🔵", label: () => "Bluetooth" },
  { regex: /Bomba de calor/i,            icon: "♨️", label: () => "Bomba calor" },
  { regex: /(\d+)\s*cubiertos/i,        icon: "🍽️", label: (m) => `${m[1]} cubiertos` },
  { regex: /(\d+)\s*l(?:itros)?/i,      icon: "📦", label: (m) => `${m[1]} L` },
  { regex: /Google\s*TV/i,              icon: "📺", label: () => "Google TV" },
  { regex: /Android\s*TV/i,             icon: "🤖", label: () => "Android TV" },
  { regex: /webOS/i,                     icon: "📺", label: () => "webOS" },
  { regex: /Tizen/i,                     icon: "📺", label: () => "Tizen" },
  { regex: /Alexa/i,                     icon: "🎙️", label: () => "Alexa" },
  { regex: /LiDAR/i,                     icon: "📡", label: () => "LiDAR" },
  { regex: /HEPA/i,                      icon: "🧹", label: () => "Filtro HEPA" },
  { regex: /Nespresso/i,                 icon: "☕", label: () => "Nespresso" },
  { regex: /(\d+)\s*bar/i,              icon: "💪", label: (m) => `${m[1]} bar` },
];

function extractSpecs(text: string) {
  return SPEC_PATTERNS
    .map(({ regex, icon, label }) => {
      const m = text.match(regex);
      return m ? { icon, text: label(m) } : null;
    })
    .filter(Boolean) as { icon: string; text: string }[];
}

function generateDescription(name: string, brand: string, category: string): string {
  const specs = extractSpecs(name);
  const specsText = specs.length > 0 ? ` Destaca por ${specs.slice(0, 3).map(s => s.text).join(", ")}.` : "";

  const categoryIntros: Record<string, string> = {
    TELEVISORES: `El ${name} es una televisión de ${brand} que ofrece una experiencia de visualización de calidad en tu hogar.${specsText} Ideal para ver series, películas y deportes con la mejor imagen posible.`,
    LAVADORAS: `La ${name} es una lavadora de ${brand} diseñada para ofrecer resultados de lavado excelentes con un consumo eficiente.${specsText} Una opción sólida para el día a día del hogar.`,
    FRIGORIFICOS: `El ${name} de ${brand} es un frigorífico pensado para conservar tus alimentos en perfectas condiciones durante más tiempo.${specsText} Combina capacidad, eficiencia y funcionalidad.`,
    LAVAVAJILLAS: `El ${name} de ${brand} es un lavavajillas que simplifica la limpieza del hogar con programas eficientes y bajo consumo de agua.${specsText} Una inversión que se nota en el día a día.`,
    SECADORAS: `La ${name} de ${brand} es una secadora que complementa perfectamente tu lavadora para tener ropa seca y lista en cualquier momento.${specsText} Especialmente útil en meses de lluvia o en hogares sin tendedero exterior.`,
    HORNOS: `El ${name} de ${brand} es un horno que eleva el nivel de tu cocina con funciones avanzadas y una cocción uniforme.${specsText} Perfecto tanto para recetas cotidianas como para elaboraciones más exigentes.`,
    MICROONDAS: `El ${name} de ${brand} es un microondas que va más allá del simple recalentado.${specsText} Versátil y práctico para el uso diario en cualquier cocina.`,
    ASPIRADORAS: `El ${name} de ${brand} es una aspiradora que mantiene tu hogar limpio con la mínima inversión de tiempo y esfuerzo.${specsText} Una solución eficaz para el mantenimiento diario.`,
    CAFETERAS: `La ${name} de ${brand} es una cafetera que te permite disfrutar de un café de calidad en casa cada mañana.${specsText} Una opción excelente para los amantes del buen café.`,
    AIRES_ACONDICIONADOS: `El ${name} de ${brand} es un aire acondicionado que mantiene tu hogar a la temperatura perfecta durante todo el año.${specsText} Eficiente, silencioso y con tecnología avanzada.`,
    OTROS: `El ${name} de ${brand} es un electrodoméstico que aporta comodidad y eficiencia a tu hogar.${specsText}`,
  };

  return categoryIntros[category] ?? categoryIntros["OTROS"];
}

async function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      offers: { orderBy: [{ inStock: "desc" }, { priceCurrent: "asc" }] },
      priceHistory: { orderBy: { recordedAt: "asc" }, take: 30 },
      reviews: { select: { rating: true } },
    },
  });
}

async function getRelated(category: string, excludeId: string) {
  return prisma.product.findMany({
    where: { category: category as Category, id: { not: excludeId } },
    include: { offers: { orderBy: [{ inStock: "desc" }, { priceCurrent: "asc" }], take: 1 } },
    orderBy: { rating: "desc" },
    take: 4,
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Producto no encontrado | Orvexia" };
  const offer = product.offers[0];
  return {
    title: `${product.name} | Orvexia`,
    description: `Compara el precio del ${product.name} de ${product.brand}. ${offer ? `Desde ${offer.priceCurrent}€ con precios actualizados en tiempo real.` : ""} Análisis, especificaciones y valoraciones.`,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [related, categoryStats] = await Promise.all([
    getRelated(product.category, product.id),
    getCategoryStats(product.category),
  ]);
  const specs = extractSpecs(`${product.name} ${product.description ?? ""}`);
  const description = generateDescription(product.name, product.brand, product.category);
  const catLabel = CATEGORY_LABELS[product.category] ?? "Electrodomésticos";
  const catSlug = CATEGORY_SLUGS[product.category] ?? "otros";

  // Análisis enriquecido (server-side)
  const reviewsAvg = product.reviews.length > 0
    ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
    : null;
  const analysis = buildAnalysis(
    {
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      rating: product.rating,
      reviewCount: product.reviewCount,
      offers: product.offers.map((o) => ({
        priceCurrent: o.priceCurrent,
        priceOld: o.priceOld,
        discountPercent: o.discountPercent,
        inStock: o.inStock,
        store: o.store,
      })),
      priceHistory: product.priceHistory.map((h) => ({ price: h.price, date: h.recordedAt.toISOString() })),
      reviewsAvg,
      reviewsTotal: product.reviews.length,
    },
    categoryStats,
  );

  const serialized = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
    image: product.image,
    images: product.images as string[],
    rating: product.rating,
    reviewCount: product.reviewCount,
    offers: product.offers.map((o) => ({
      store: o.store,
      priceCurrent: o.priceCurrent,
      priceOld: o.priceOld,
      discountPercent: o.discountPercent,
      externalUrl: o.externalUrl,
      inStock: o.inStock,
    })),
    priceHistory: product.priceHistory.map((h) => ({
      price: h.price,
      date: h.recordedAt.toISOString(),
    })),
  };

  const serializedRelated = related.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    image: p.image,
    images: p.images as string[],
    offer: p.offers[0] ? {
      priceCurrent: p.offers[0].priceCurrent,
      priceOld: p.offers[0].priceOld,
      discountPercent: p.offers[0].discountPercent,
    } : null,
    rating: p.rating,
  }));

  // ─── Structured data (Product + AggregateOffer + Offer enriquecido) ───────
  // Necesario para AI Overviews, Google Shopping orgánico y merchant listings.
  // Cada Offer incluye:
  //   • priceSpecification con IVA → Google muestra precio con IVA en SERP
  //   • priceValidUntil (+7d) → evita warning de Rich Results
  //   • itemCondition → distingue outlet/reacondicionado
  //   • shippingDetails + hasMerchantReturnPolicy → desbloquea badge envío/devolución
  const inStockOffers = product.offers.filter((o) => o.inStock && o.priceCurrent > 0);
  // Validez: los precios se sincronizan a diario, así que damos +7 días de margen.
  const priceValidUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  const productJsonLd = inStockOffers.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.image ?? undefined,
    description: description,
    brand: { "@type": "Brand", name: product.brand },
    sku: product.model || undefined,
    mpn: product.model || undefined,
    ...(reviewsAvg !== null && product.reviews.length > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: reviewsAvg.toFixed(2),
        reviewCount: product.reviews.length,
      },
    } : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: Math.min(...inStockOffers.map((o) => o.priceCurrent)).toFixed(2),
      highPrice: Math.max(...inStockOffers.map((o) => o.priceCurrent)).toFixed(2),
      offerCount: inStockOffers.length,
      availability: "https://schema.org/InStock",
      offers: inStockOffers.map((o) => {
        const condition = detectItemCondition(product.name, product.slug);
        const shipping = buildShippingDetails(o.store, o.priceCurrent);
        const returnPolicy = buildReturnPolicy(o.store);
        return {
          "@type": "Offer",
          price: o.priceCurrent.toFixed(2),
          priceCurrency: "EUR",
          priceValidUntil,
          priceSpecification: {
            "@type": "PriceSpecification",
            price: o.priceCurrent.toFixed(2),
            priceCurrency: "EUR",
            valueAddedTaxIncluded: true,
          },
          availability: "https://schema.org/InStock",
          itemCondition: `https://schema.org/${condition}`,
          seller: { "@type": "Organization", name: o.store },
          url: `https://www.orvexia.es/productos/${product.slug}`,
          ...(shipping ? { shippingDetails: shipping } : {}),
          ...(returnPolicy ? { hasMerchantReturnPolicy: returnPolicy } : {}),
        };
      }),
    },
  } : null;

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: "https://www.orvexia.es/" },
      { "@type": "ListItem", position: 2, name: "Categorías", item: "https://www.orvexia.es/categorias" },
      { "@type": "ListItem", position: 3, name: catLabel, item: `https://www.orvexia.es/categorias/${catSlug}` },
      { "@type": "ListItem", position: 4, name: product.name, item: `https://www.orvexia.es/productos/${product.slug}` },
    ],
  };

  return (
    <main className="min-h-screen">
      {productJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }} />

      {/* BREADCRUMB */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-wider text-white/40">
          <Link href="/" className="hover:text-cyan-300 transition-colors">~/</Link>
          <span aria-hidden className="text-white/25">›</span>
          <Link href="/categorias" className="hover:text-cyan-300 transition-colors">categorias</Link>
          <span aria-hidden className="text-white/25">›</span>
          <Link href={`/categorias/${catSlug}`} className="hover:text-cyan-300 transition-colors">{catSlug}</Link>
          <span aria-hidden className="text-white/25">›</span>
          <span className="text-cyan-300 font-medium truncate max-w-[200px] normal-case">{product.name.slice(0, 40)}...</span>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <ProductPageClient
        product={serialized}
        specs={specs}
        description={description}
        catLabel={catLabel}
        catSlug={catSlug}
        related={serializedRelated}
        analysis={analysis}
      />

    </main>
  );
}
