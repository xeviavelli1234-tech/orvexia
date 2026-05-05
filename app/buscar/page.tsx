export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

const CATEGORY_LABELS: Record<string, string> = {
  TELEVISORES: "Televisores", LAVADORAS: "Lavadoras", FRIGORIFICOS: "Frigoríficos",
  LAVAVAJILLAS: "Lavavajillas", SECADORAS: "Secadoras", HORNOS: "Hornos",
  MICROONDAS: "Microondas", ASPIRADORAS: "Aspiradoras", CAFETERAS: "Cafeteras",
  AIRES_ACONDICIONADOS: "Aire acondicionado", OTROS: "Otros",
};

const TRENDING_TERMS = [
  "Lavadora Samsung", 'TV 65"', "Frigorífico No Frost", "Lavavajillas Bosch",
  "Cafetera Nespresso", "Aspiradora Roomba",
];

async function searchProducts(q: string) {
  if (!q || q.trim().length < 2) return [];

  const term = q.trim();
  return prisma.product.findMany({
    where: {
      offers: { some: {} },
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { brand: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { model: { contains: term, mode: "insensitive" } },
      ],
    },
    include: { offers: { orderBy: { priceCurrent: "asc" } } },
    orderBy: { updatedAt: "desc" },
    take: 24,
  });
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const results = await searchProducts(q);

  return (
    <main className="min-h-screen bg-bg">
      {/* Header strip */}
      <section className="border-b border-border-subtle bg-bg-elevated">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7 sm:py-9">
          <div className="flex items-center gap-2 text-xs text-fg-subtle mb-4">
            <Link href="/" className="hover:text-fg transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-fg-muted font-medium">Buscar</span>
          </div>

          {q ? (
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5 text-brand-600">
                  Resultados de búsqueda
                </p>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                  &ldquo;{q}&rdquo;
                </h1>
                <p className="mt-2 text-sm text-fg-muted">
                  {results.length > 0
                    ? <><span className="font-bold text-fg tabular">{results.length}</span> producto{results.length !== 1 ? "s" : ""} encontrado{results.length !== 1 ? "s" : ""}</>
                    : "No encontramos resultados para esta búsqueda"}
                </p>
              </div>
              {results.length > 0 && (
                <Link
                  href="/ofertas-destacadas"
                  className="inline-flex items-center gap-1 text-xs font-bold px-4 h-9 rounded-full text-hot-700 border border-hot-100 bg-hot-50 hover:bg-hot-100 transition-all self-start sm:self-end"
                >
                  Ver todas las ofertas
                  <span aria-hidden>→</span>
                </Link>
              )}
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5 text-brand-600">
                Buscar
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                Encuentra cualquier electrodoméstico
              </h1>
              <p className="mt-2 text-sm text-fg-muted max-w-md">
                Usa el buscador del menú superior. Te mostramos los precios de las principales tiendas en tiempo real.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {!q ? (
          <div className="bg-bg-elevated border border-border rounded-2xl p-10 sm:p-14 text-center">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            </div>
            <p className="text-base font-bold text-fg mb-1.5">¿Qué estás buscando?</p>
            <p className="text-sm text-fg-muted mb-7">Prueba con alguna de estas búsquedas populares</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {TRENDING_TERMS.map((s) => (
                <Link
                  key={s}
                  href={`/buscar?q=${encodeURIComponent(s)}`}
                  className="px-4 h-9 inline-flex items-center rounded-full border border-border bg-bg-elevated text-sm text-fg-muted hover:text-brand-700 hover:border-brand-200 hover:bg-brand-50 transition-all"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="bg-bg-elevated border border-border rounded-2xl p-10 sm:p-14 text-center">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-bg-subtle border border-border items-center justify-center mb-4">
              <svg className="w-6 h-6 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M9 9h.01M15 9h.01" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 16c1-1 2-1.5 3-1.5s2 .5 3 1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-base font-bold text-fg mb-1.5">Sin resultados para &ldquo;{q}&rdquo;</p>
            <p className="text-sm text-fg-muted mb-7">Prueba con otro término o explora nuestras categorías</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {Object.entries(CATEGORY_LABELS).slice(0, 6).map(([key, label]) => (
                <Link
                  key={key}
                  href={`/categorias/${key.toLowerCase()}`}
                  className="px-4 h-9 inline-flex items-center rounded-full border border-border bg-bg-elevated text-sm text-fg-muted hover:text-brand-700 hover:border-brand-200 hover:bg-brand-50 transition-all"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Suspense>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {results.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i === 0} />
              ))}
            </div>
          </Suspense>
        )}
      </div>
    </main>
  );
}
