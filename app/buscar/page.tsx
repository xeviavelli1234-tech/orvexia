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
    <main className="min-h-screen bg-[#F8FAFC]">
      {/* Hero */}
      <section
        className="relative overflow-hidden pt-16 pb-20 px-6 text-center"
        style={{ background: "linear-gradient(150deg,#0F172A 0%,#1E3A8A 55%,#2563EB 100%)" }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-blue-400 opacity-10 blur-3xl" />
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-cyan-300 opacity-10 blur-3xl" />
          <div className="absolute -bottom-16 left-0 right-0 h-24 bg-[#F8FAFC] rounded-t-[32px]" />
        </div>
        <div className="relative max-w-3xl mx-auto">
          {q ? (
            <>
              <p className="text-blue-300 text-sm font-semibold uppercase tracking-widest mb-2">
                Resultados de búsqueda
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
                &ldquo;{q}&rdquo;
              </h1>
              <p className="text-blue-200 text-base">
                {results.length > 0
                  ? `${results.length} producto${results.length !== 1 ? "s" : ""} encontrado${results.length !== 1 ? "s" : ""}`
                  : "No encontramos resultados para esta búsqueda"}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
                Busca cualquier electrodoméstico
              </h1>
              <p className="text-blue-200 text-base">
                Escribe el nombre, marca o modelo en el buscador del menú superior
              </p>
            </>
          )}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {!q ? (
          /* Sin búsqueda — mostrar sugerencias */
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-lg font-semibold text-[#0F172A] mb-2">¿Qué estás buscando?</p>
            <p className="text-sm text-[#94A3B8] mb-8">Usa el buscador del menú para encontrar cualquier electrodoméstico</p>
            <div className="flex flex-wrap justify-center gap-3">
              {["Lavadora Samsung", 'TV 65"', "Frigorífico No Frost", "Lavavajillas Bosch", "Cafetera Nespresso", "Aspiradora Roomba"].map((s) => (
                <Link
                  key={s}
                  href={`/buscar?q=${encodeURIComponent(s)}`}
                  className="px-4 py-2 rounded-full border border-[#E2E8F0] bg-white text-sm text-[#475569] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          /* Sin resultados */
          <div className="text-center py-16 bg-white rounded-3xl border border-[#E2E8F0]">
            <p className="text-5xl mb-4">😕</p>
            <p className="text-lg font-semibold text-[#0F172A] mb-2">Sin resultados para &ldquo;{q}&rdquo;</p>
            <p className="text-sm text-[#94A3B8] mb-8">Prueba con otro término o explora nuestras categorías</p>
            <div className="flex flex-wrap justify-center gap-3">
              {Object.entries(CATEGORY_LABELS).slice(0, 6).map(([key, label]) => (
                <Link
                  key={key}
                  href={`/categorias/${key.toLowerCase()}`}
                  className="px-4 py-2 rounded-full border border-[#E2E8F0] bg-white text-sm text-[#475569] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          /* Resultados */
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold text-[#2563EB] uppercase tracking-widest mb-1">Búsqueda</p>
                <h2 className="text-xl font-bold text-[#0F172A]">
                  {results.length} resultado{results.length !== 1 ? "s" : ""} para &ldquo;{q}&rdquo;
                </h2>
              </div>
              <Link href="/ofertas-destacadas" className="text-sm font-semibold text-[#2563EB] hover:underline hidden sm:block">
                Ver todas las ofertas →
              </Link>
            </div>
            <Suspense>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-16">
                  {results.map((product, i) => (
                   <ProductCard key={product.id} product={product} priority={i === 0} />
                  ))}
                </div>
            </Suspense>
          </>
        )}
      </div>
    </main>
  );
}
