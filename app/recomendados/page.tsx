import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import Link from "next/link";
import { RecomendadosClient } from "./RecomendadosClient";

const CATEGORY_ICONS: Record<string, string> = {
  TELEVISORES: "📺",
  LAVADORAS: "🧺",
  FRIGORIFICOS: "🧊",
  LAVAVAJILLAS: "🍽️",
  SECADORAS: "💨",
  HORNOS: "🔥",
  MICROONDAS: "📡",
  ASPIRADORAS: "🌀",
  CAFETERAS: "☕",
  AIRES_ACONDICIONADOS: "❄️",
  OTROS: "📦",
};

const CATEGORY_LABELS: Record<string, string> = {
  TELEVISORES: "Televisores",
  LAVADORAS: "Lavadoras",
  FRIGORIFICOS: "Frigoríficos",
  LAVAVAJILLAS: "Lavavajillas",
  SECADORAS: "Secadoras",
  HORNOS: "Hornos",
  MICROONDAS: "Microondas",
  ASPIRADORAS: "Aspiradoras",
  CAFETERAS: "Cafeteras",
  AIRES_ACONDICIONADOS: "Aire acondicionado",
  OTROS: "Otros",
};

async function getRecommendations(userId?: string) {
  const fallbackTopRated = async () =>
    prisma.product.findMany({
      where: {
        rating: { gte: 4.3 },
        reviewCount: { gte: 100 },
        offers: { some: {} },
      },
      include: { offers: { orderBy: { priceCurrent: "asc" } } },
      orderBy: { rating: "desc" },
      take: 12,
    });

  if (!userId) {
    const topRated = await fallbackTopRated();
    return { products: topRated };
  }

  const saved = await prisma.savedProduct.findMany({
    where: { userId },
    include: { product: true },
  });

  if (saved.length === 0) {
    const topRated = await fallbackTopRated();
    return { products: topRated };
  }

  const savedIds = new Set(saved.map((s) => s.productId));
  const counts = saved.reduce<Record<string, number>>((acc, sp) => {
    acc[sp.product.category] = (acc[sp.product.category] ?? 0) + 1;
    return acc;
  }, {});
  const sortedCats = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  const primary = sortedCats[0];
  const secondary = sortedCats.slice(1);

  type ProductWithOffers = Awaited<ReturnType<typeof prisma.product.findMany>>[number] & { offers: { store: string; priceCurrent: number; priceOld: number | null; discountPercent: number | null; externalUrl: string }[] };
  const recommended: ProductWithOffers[] = [];
  const pushUnique = (items: typeof recommended) => {
    for (const p of items)
      if (!recommended.find((r) => r.id === p.id) && !savedIds.has(p.id)) recommended.push(p);
  };

  if (primary) {
    const primaryBatch = await prisma.product.findMany({
      where: {
        category: primary as never,
        offers: { some: {} },
        id: { notIn: [...savedIds] },
      },
      include: { offers: { orderBy: { priceCurrent: "asc" } } },
      orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
      take: 8,
    });
    pushUnique(primaryBatch);
  }

  if (recommended.length < 12 && secondary.length > 0) {
    const secondaryBatch = await prisma.product.findMany({
      where: {
        category: { in: secondary as never[] },
        offers: { some: {} },
        id: { notIn: [...savedIds, ...recommended.map((r) => r.id)] },
      },
      include: { offers: { orderBy: { priceCurrent: "asc" } } },
      orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
      take: 12 - recommended.length,
    });
    pushUnique(secondaryBatch);
  }

  if (recommended.length < 12) {
    const fallback = await fallbackTopRated();
    pushUnique(fallback);
  }

  return { products: recommended.slice(0, 12) };
}

export const metadata = { title: "Recomendados · Orvexia" };

export default async function RecomendadosPage() {
  const session = await getSession();
  const { products } = await getRecommendations(session?.userId);

  const fallbackProducts = [
    { id: "f1", name: 'TV OLED 55" serie 2026', price: "1.199 €", tag: "OLED · 120Hz" },
    { id: "f2", name: "Robot aspirador lidar", price: "629 €", tag: "Fregado · Mapeo 3D" },
    { id: "f3", name: 'Portátil ligero 14"', price: "899 €", tag: "i7 14ª · 16GB" },
    { id: "f4", name: "Auriculares ANC", price: "249 €", tag: "LDAC · 40h" },
    { id: "f5", name: 'Monitor QD-OLED 34"', price: "899 €", tag: "165Hz · USB-C 90W" },
    { id: "f6", name: "Cafetera superautomática", price: "529 €", tag: "Molinillo · Vaporizador" },
  ];

  const productsForBg = products.length ? products : fallbackProducts;

  if (!session) {
    return (
      <main className="relative z-0 min-h-screen overflow-hidden bg-[#0F172A]">
        {/* Fondo estilo login: gradiente + grid + blobs */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 55%, #1D4ED8 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05] -z-5"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
            backgroundSize: "42px 42px",
          }}
        />
        <div className="pointer-events-none absolute -top-28 -right-24 w-[460px] h-[460px] rounded-full bg-[#3B82F6] opacity-[0.12] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 w-[360px] h-[360px] rounded-full bg-[#22C55E] opacity-[0.10] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 right-16 w-[280px] h-[280px] rounded-full bg-[#7C3AED] opacity-[0.10] blur-3xl" />

        {/* Tarjeta de acceso */}
        <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
          <div className="max-w-lg w-full bg-white border border-[#E2E8F0] rounded-3xl shadow-xl p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white text-xl">
              🔒
            </div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Recomendaciones personalizadas</h1>
            <p className="text-[#64748B] text-sm">
              Inicia sesión o crea una cuenta para ver recomendaciones basadas en tus productos guardados.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#2563EB] border border-[#2563EB] hover:bg-[#EFF6FF]"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const { products: productsForUser } = { products };
  const byCategory = await prisma.product.groupBy({
    by: ["category"],
    _count: { id: true },
    where: { offers: { some: {} } },
    orderBy: { _count: { id: "desc" } },
  });

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      {/* Hero */}
      <section
        className="relative overflow-hidden pt-16 pb-20 px-6 text-center"
        style={{ background: "linear-gradient(150deg,#0F172A 0%,#4C1D95 55%,#7C3AED 100%)" }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-purple-400 opacity-10 blur-3xl" />
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-indigo-300 opacity-10 blur-3xl" />
          <div className="absolute -bottom-16 left-0 right-0 h-24 bg-[#F8FAFC] rounded-t-[32px]" />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 text-xs font-semibold text-white/90">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-pulse" />
            Selección basada en precio y valoraciones
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Recomendados para ti
          </h1>
          <p className="text-purple-200 text-lg max-w-xl mx-auto leading-relaxed">
            Los productos con mejor relación calidad-precio según descuentos verificados y valoraciones de compradores reales.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-12">
        {/* Personalizados / mejor valorados */}
        {productsForUser.length > 0 && (
          <section aria-labelledby="top-rated-heading">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 rounded-full bg-gradient-to-b from-[#F59E0B] to-[#EAB308]" />
                <div>
                  <p className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-widest">Usuarios satisfechos</p>
                  <h2 id="top-rated-heading" className="text-xl font-bold text-[#0F172A]">
                    Recomendados para ti
                  </h2>
                </div>
              </div>
              <Link href="/popularidad" className="text-sm font-semibold text-[#2563EB] hover:underline">
                Ver ranking →
              </Link>
            </div>
            <RecomendadosClient initialProducts={productsForUser as never} />
          </section>
        )}

        {/* Por categoría */}
        {byCategory.length > 0 && (
          <section aria-labelledby="category-heading">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-[#2563EB] to-[#7C3AED]" />
              <div>
                <p className="text-[10px] font-bold text-[#2563EB] uppercase tracking-widest">Explorar</p>
                <h2 id="category-heading" className="text-xl font-bold text-[#0F172A]">
                  Por categoría
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {byCategory.map(({ category, _count }) => (
                <Link
                  key={category}
                  href={`/categorias/${category.toLowerCase()}`}
                  className="group bg-white rounded-2xl border border-[#E2E8F0] p-5 flex flex-col items-center text-center hover:border-[#2563EB]/30 hover:shadow-md transition-all duration-200"
                >
                  <span className="text-3xl mb-2">{CATEGORY_ICONS[category] ?? "📦"}</span>
                  <p className="text-sm font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                    {CATEGORY_LABELS[category] ?? category}
                  </p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {_count.id} producto{_count.id !== 1 ? "s" : ""}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section
          className="rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0F172A, #1E1B4B, #4C1D95)" }}
        >
          <div className="px-8 py-10 text-center">
            <p className="text-4xl mb-3">🔔</p>
            <h2 className="text-2xl font-extrabold text-white mb-2">¿No encuentras lo que buscas?</h2>
            <p className="text-white/70 mb-6 max-w-md mx-auto text-sm">
              Crea una cuenta y configura alertas de precio. Te avisamos cuando el producto que quieres baje de precio.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="bg-white text-[#4C1D95] font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#F5F3FF] transition-all"
              >
                Crear cuenta gratis
              </Link>
              <Link
                href="/buscar"
                className="text-white font-semibold px-6 py-3 rounded-xl border border-white/25 text-sm hover:bg-white/10 transition-all"
              >
                Buscar productos
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
