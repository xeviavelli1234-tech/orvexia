import { unstable_cache } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { safeData } from "@/lib/safe-data";

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
  const byCategory = await safeData<Awaited<ReturnType<typeof getByCategory>>>(
    () => getByCategory(),
    [],
    "recomendados-by-category",
  );
  if (byCategory.length === 0) return null;

  return (
    <section aria-labelledby="category-heading">
      <div className="reveal mb-6">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">
          Catálogo
        </p>
        <h2 id="category-heading" className="text-2xl font-extrabold tracking-tight text-white">
          Por categoría
        </h2>
      </div>
      <div className="reveal grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {byCategory.map(({ category, _count }) => (
          <Link
            key={category}
            href={`/categorias/${category.toLowerCase()}`}
            className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 flex flex-col items-center text-center hover:border-brand-400/40 hover:shadow-[0_24px_60px_-24px_rgba(99,102,241,0.55)] hover:-translate-y-1 transition-all duration-300"
          >
            <span className="text-3xl mb-2 transition-transform duration-300 group-hover:scale-110">
              {CATEGORY_ICONS[category] ?? "📦"}
            </span>
            <p className="text-sm font-bold text-fg group-hover:text-brand-200 transition-colors">
              {CATEGORY_LABELS[category] ?? category}
            </p>
            <p className="mt-1 text-[11px] tabular text-white/40">
              {_count.id} producto{_count.id !== 1 ? "s" : ""}
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
