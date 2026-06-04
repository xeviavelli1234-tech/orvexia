import { unstable_cache } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RecomendadosClient } from "../RecomendadosClient";
import { safeData } from "@/lib/safe-data";

/**
 * Sección "Selección curada" — antes vivía dentro de page.tsx y bloqueaba
 * el render con sus 1–3 queries secuenciales. Aislada en un async Server
 * Component para que `<Suspense>` la pueda streamear de forma independiente
 * del resto de la página.
 */

type ProductWithOffers = Awaited<
  ReturnType<typeof prisma.product.findMany>
>[number] & {
  offers: {
    store: string;
    priceCurrent: number;
    priceOld: number | null;
    discountPercent: number | null;
    externalUrl: string;
  }[];
};

// Top-rated global: no depende del usuario → cacheable.
// 120 s es suficiente: las ratings/reviews cambian en escalas de horas/días,
// no por segundo. Tag "top-rated" para invalidación manual si hace falta.
const fallbackTopRated = unstable_cache(
  async () =>
    prisma.product.findMany({
      where: {
        rating: { gte: 4.3 },
        reviewCount: { gte: 100 },
        offers: { some: {} },
      },
      include: {
        offers: { orderBy: [{ inStock: "desc" }, { priceCurrent: "asc" }] },
      },
      orderBy: { rating: "desc" },
      take: 12,
    }),
  ["recomendados:top-rated"],
  { revalidate: 120, tags: ["top-rated", "products"] },
);

async function getRecommendations(userId: string | undefined) {
  if (!userId) return fallbackTopRated();

  const saved = await prisma.savedProduct.findMany({
    where: { userId },
    include: { product: true },
  });
  if (saved.length === 0) return fallbackTopRated();

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

  const recommended: ProductWithOffers[] = [];
  const pushUnique = (items: ProductWithOffers[]) => {
    for (const p of items)
      if (
        !recommended.find((r) => r.id === p.id) &&
        !savedIds.has(p.id)
      )
        recommended.push(p);
  };

  if (primary) {
    const primaryBatch = await prisma.product.findMany({
      where: {
        category: primary as never,
        offers: { some: {} },
        id: { notIn: [...savedIds] },
      },
      include: {
        offers: { orderBy: [{ inStock: "desc" }, { priceCurrent: "asc" }] },
      },
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
      include: {
        offers: { orderBy: [{ inStock: "desc" }, { priceCurrent: "asc" }] },
      },
      orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
      take: 12 - recommended.length,
    });
    pushUnique(secondaryBatch);
  }

  if (recommended.length < 12) {
    const fallback = await fallbackTopRated();
    pushUnique(fallback);
  }

  return recommended.slice(0, 12);
}

export default async function TopRatedSection({
  userId,
}: {
  userId: string | undefined;
}) {
  const products = await safeData<Awaited<ReturnType<typeof getRecommendations>>>(
    () => getRecommendations(userId),
    [],
    "recomendados-top-rated",
  );
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="top-rated-heading">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-wider text-amber-300 mb-1">
            ▸ /engine.output
          </p>
          <h2
            id="top-rated-heading"
            className="text-2xl font-bold text-white"
          >
            Selección curada
          </h2>
        </div>
        <Link
          href="/popularidad"
          className="font-mono-ui text-[11px] uppercase tracking-wider text-cyan-300 hover:text-cyan-200 transition-colors"
        >
          ver ranking →
        </Link>
      </div>
      <RecomendadosClient initialProducts={products as never} />
    </section>
  );
}

// Skeleton para el Suspense fallback — mismo footprint visual.
export function TopRatedSkeleton() {
  return (
    <section aria-hidden="true">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-white/[0.06]" />
          <div className="h-7 w-44 rounded bg-white/[0.06]" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-64 rounded-2xl border border-white/[0.06] bg-white/[0.02] animate-pulse"
          />
        ))}
      </div>
    </section>
  );
}
