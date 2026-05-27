import { unstable_cache } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

/**
 * Sección "Por categoría" — antes en page.tsx. Aislada para que pueda
 * cargar en paralelo con TopRatedSection bajo dos <Suspense> distintos.
 */

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

// Conteo por categoría: cambia muy poco (productos nuevos puntuales).
// 5 min de caché y un tag para invalidar tras imports masivos.
const getByCategory = unstable_cache(
  async () =>
    prisma.product.groupBy({
      by: ["category"],
      _count: { id: true },
      where: { offers: { some: {} } },
      orderBy: { _count: { id: "desc" } },
    }),
  ["recomendados:by-category"],
  { revalidate: 300, tags: ["catalog:by-category", "products"] },
);

export default async function CategoriesSection() {
  const byCategory = await getByCategory();
  if (byCategory.length === 0) return null;

  return (
    <section aria-labelledby="category-heading">
      <div className="mb-6">
        <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300 mb-1">
          ▸ /catalog
        </p>
        <h2 id="category-heading" className="text-2xl font-bold text-white">
          Por categoría
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {byCategory.map(({ category, _count }) => (
          <Link
            key={category}
            href={`/categorias/${category.toLowerCase()}`}
            className="group bg-bg-elevated rounded-2xl border border-white/[0.08] p-5 flex flex-col items-center text-center hover:border-cyan-400/35 hover:shadow-[0_0_24px_-6px_rgba(94,234,212,0.35)] hover:-translate-y-0.5 transition-all duration-200"
          >
            <span className="text-3xl mb-2">
              {CATEGORY_ICONS[category] ?? "📦"}
            </span>
            <p className="text-sm font-bold text-fg group-hover:text-cyan-300 transition-colors">
              {CATEGORY_LABELS[category] ?? category}
            </p>
            <p className="font-mono-ui text-[10px] uppercase tracking-wider text-white/40 mt-1 tabular">
              {_count.id} item{_count.id !== 1 ? "s" : ""}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CategoriesSkeleton() {
  return (
    <section aria-hidden="true">
      <div className="mb-6 space-y-2">
        <div className="h-3 w-20 rounded bg-white/[0.06]" />
        <div className="h-7 w-44 rounded bg-white/[0.06]" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-2xl border border-white/[0.06] bg-white/[0.02] animate-pulse"
          />
        ))}
      </div>
    </section>
  );
}
