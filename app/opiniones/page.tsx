import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { RelativeTime } from "@/components/community/RelativeTime";
import { ProductModalButton } from "@/components/ProductModalButton";

export const runtime = "nodejs";
export const metadata = {
  title: "Opiniones y Reseñas · Orvexia",
  description: "Lee las opiniones reales de compradores sobre electrodomésticos en Orvexia.",
};

/* ── Helpers ──────────────────────────────────────────────────────────── */

function Avatar({
  user, size = 32,
}: {
  user: { name: string; avatarColor: string; avatarEmoji: string | null; avatarUrl: string | null };
  size?: number;
}) {
  const initials = user.name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  if (user.avatarUrl)
    return (
      <div className="rounded-full overflow-hidden shrink-0" style={{ width: size, height: size }}>
        <img src={user.avatarUrl} alt={user.name} style={{ width: size, height: size, objectFit: "cover" }} />
      </div>
    );
  return (
    <span
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: user.avatarColor, fontSize: size * 0.38 }}
    >
      {user.avatarEmoji || initials}
    </span>
  );
}

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(1, Math.max(0, rating - (star - 1)));
        const id = `s${star}r${Math.round(rating * 10)}`;
        return (
          <svg key={star} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient id={id}>
                <stop offset={`${fill * 100}%`} stopColor="#F59E0B" />
                <stop offset={`${fill * 100}%`} stopColor="#E2E8F0" />
              </linearGradient>
            </defs>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={`url(#${id})`}
            />
          </svg>
        );
      })}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

const VALID_RATINGS = [1, 2, 3, 4, 5];

export default async function OpinionesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const ratingRaw = typeof sp.rating === "string" ? parseInt(sp.rating) : undefined;
  const rating = ratingRaw && VALID_RATINGS.includes(ratingRaw) ? ratingRaw : undefined;
  const orden = typeof sp.orden === "string" && sp.orden === "valoracion" ? "valoracion" : "reciente";
  const productoSlug = typeof sp.producto === "string" ? sp.producto : undefined;

  // Resolve product slug to id if filtering by product
  const filteredProduct = productoSlug
    ? await prisma.product.findUnique({ where: { slug: productoSlug }, select: { id: true, name: true, brand: true, image: true, slug: true } })
    : null;

  const whereClause = {
    ...(rating ? { rating } : {}),
    ...(filteredProduct ? { productId: filteredProduct.id } : {}),
  };

  const [reviews, session, totalReviews, aggAvg, groupByProduct] = await Promise.all([
    prisma.review.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, avatarUrl: true } },
        product: { select: { id: true, name: true, slug: true, image: true, brand: true } },
      },
      orderBy: orden === "valoracion"
        ? [{ rating: "desc" }, { createdAt: "desc" }]
        : { createdAt: "desc" },
      take: 100,
    }),
    getSession(),
    prisma.review.count(filteredProduct ? { where: { productId: filteredProduct.id } } : undefined),
    prisma.review.aggregate({ _avg: { rating: true }, where: filteredProduct ? { productId: filteredProduct.id } : undefined }),
    prisma.review.groupBy({ by: ["productId"], _avg: { rating: true }, _count: { _all: true }, orderBy: { _avg: { rating: "desc" } }, take: 5 }),
  ]);

  // Top rated products (sidebar)
  const topProductIds = groupByProduct.map((g) => g.productId);
  const topProducts = await prisma.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true, slug: true, image: true, brand: true },
  });
  const topProductsWithStats = groupByProduct.map((g) => ({
    product: topProducts.find((p) => p.id === g.productId)!,
    avg: g._avg.rating ?? 0,
    count: g._count._all,
  })).filter((t) => t.product);

  const avgDisplay = aggAvg._avg.rating ? aggAvg._avg.rating.toFixed(1) : null;
  const totalProductsReviewed = (await prisma.review.groupBy({ by: ["productId"] })).length;

  const ordenHref = (o: string) => {
    const params = new URLSearchParams();
    if (rating) params.set("rating", String(rating));
    if (o !== "reciente") params.set("orden", o);
    if (productoSlug) params.set("producto", productoSlug);
    const qs = params.toString();
    return `/opiniones${qs ? `?${qs}` : ""}`;
  };

  const ratingHref = (r: number | undefined) => {
    const params = new URLSearchParams();
    if (r) params.set("rating", String(r));
    if (orden !== "reciente") params.set("orden", orden);
    if (productoSlug) params.set("producto", productoSlug);
    const qs = params.toString();
    return `/opiniones${qs ? `?${qs}` : ""}`;
  };

  const clearProductHref = () => {
    const params = new URLSearchParams();
    if (rating) params.set("rating", String(rating));
    if (orden !== "reciente") params.set("orden", orden);
    const qs = params.toString();
    return `/opiniones${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="min-h-screen bg-[#F0F4F8]">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)" }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-amber-400 opacity-[0.05] blur-3xl" />
          <div className="absolute top-10 right-20 w-64 h-64 rounded-full bg-yellow-300 opacity-[0.04] blur-3xl" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <span className="text-amber-400 text-sm">⭐</span>
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest">Opiniones Orvexia</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">
                Opiniones &amp; Reseñas
              </h1>
              <p className="text-blue-200/70 text-sm max-w-lg leading-relaxed">
                Lo que dicen compradores reales sobre los productos. Sin filtros, sin patrocinios.
              </p>

              {/* Stats */}
              <div className="flex items-center gap-5 mt-5 flex-wrap">
                {avgDisplay && (
                  <div className="flex items-center gap-2">
                    <Stars rating={parseFloat(avgDisplay)} size={15} />
                    <span className="text-white font-bold text-sm">{avgDisplay}</span>
                    <span className="text-blue-300/60 text-xs">media global</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs text-blue-300/80">
                    <span className="font-bold text-white">{totalReviews}</span> reseñas
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs text-blue-300/80">
                    <span className="font-bold text-white">{totalProductsReviewed}</span> productos valorados
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/comunidad"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Ir al foro
            </Link>
          </div>
        </div>
      </section>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

          {/* ── Feed ──────────────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Product filter banner */}
            {filteredProduct && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                {filteredProduct.image && (
                  <img src={filteredProduct.image} alt={filteredProduct.name} className="w-10 h-10 object-contain rounded-lg bg-white border border-amber-100 p-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Filtrando por producto</p>
                  <p className="text-sm font-bold text-[#0F172A] truncate">{filteredProduct.name}</p>
                </div>
                <Link
                  href={clearProductHref()}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 transition"
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Quitar filtro
                </Link>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Rating filter */}
              <div className="flex flex-wrap gap-1.5">
                <Link
                  href={ratingHref(undefined)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    !rating ? "bg-[#1E293B] text-white" : "bg-white border border-[#E2E8F0] text-[#475569] hover:border-[#1E293B]/30"
                  }`}
                >
                  Todas
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${!rating ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>
                    {totalReviews}
                  </span>
                </Link>
                {[5, 4, 3, 2, 1].map((star) => (
                  <Link
                    key={star}
                    href={ratingHref(star)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      rating === star ? "bg-amber-500 text-white" : "bg-white border border-[#E2E8F0] text-[#475569] hover:border-amber-300"
                    }`}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" />
                    </svg>
                    {star}
                  </Link>
                ))}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-full p-0.5">
                {[{ label: "Reciente", value: "reciente" }, { label: "Mejor valorado", value: "valoracion" }].map((o) => (
                  <Link
                    key={o.value}
                    href={ordenHref(o.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      orden === o.value ? "bg-[#1E293B] text-white" : "text-[#64748B] hover:text-[#1E293B]"
                    }`}
                  >
                    {o.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Reviews list */}
            {reviews.length === 0 ? (
              <div className="text-center py-24 bg-white border border-[#E2E8F0] rounded-2xl">
                <div className="text-4xl mb-4">⭐</div>
                <h2 className="text-lg font-bold text-[#0F172A] mb-2">Sin reseñas todavía</h2>
                <p className="text-[#64748B] text-sm mb-6 max-w-xs mx-auto">
                  {filteredProduct
                    ? `No hay reseñas de ${filteredProduct.name} todavía.`
                    : rating
                    ? `No hay reseñas de ${rating} estrella${rating !== 1 ? "s" : ""} aún.`
                    : "Sé el primero en dejar tu opinión."}
                </p>
                <Link href="/buscar" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#2563EB,#4F46E5)" }}>
                  Buscar productos
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="group bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden hover:border-[#94A3B8]/50 hover:shadow-md transition-all duration-200">
                    {/* Top accent bar — amber gradient */}
                    <div className="h-[3px]" style={{
                      background: `linear-gradient(90deg, #F59E0B ${(review.rating / 5) * 100}%, #E2E8F0 ${(review.rating / 5) * 100}%)`
                    }} />

                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Product thumbnail */}
                        <ProductModalButton
                          slug={review.product.slug}
                          aria-label={`Ver ${review.product.name}`}
                          className="shrink-0 hidden sm:block"
                        >
                          {review.product.image ? (
                            <img
                              src={review.product.image}
                              alt={review.product.name}
                              className="w-16 h-16 rounded-xl object-contain bg-[#F8FAFC] border border-[#E2E8F0] p-1 hover:border-[#2563EB]/30 transition-colors"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-2xl">
                              📦
                            </div>
                          )}
                        </ProductModalButton>

                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Product name */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-widest mb-0.5">
                                {review.product.brand}
                              </p>
                              <ProductModalButton slug={review.product.slug} aria-label={`Ver ${review.product.name}`}>
                                <span className="text-sm font-bold text-[#0F172A] hover:text-[#2563EB] transition-colors line-clamp-1 text-left block">
                                  {review.product.name}
                                </span>
                              </ProductModalButton>
                            </div>
                            {/* Stars + rating */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Stars rating={review.rating} size={14} />
                              <span className="text-xs font-bold text-[#0F172A]">{review.rating}.0</span>
                            </div>
                          </div>

                          {/* Review content */}
                          {review.title && (
                            <p className="text-sm font-bold text-[#0F172A] leading-snug">{review.title}</p>
                          )}
                          <p className="text-[13px] text-[#475569] leading-relaxed line-clamp-3">
                            {review.content}
                          </p>

                          {/* Author + date */}
                          <div className="flex items-center gap-2 pt-1">
                            <Avatar user={review.user} size={20} />
                            <span className="text-xs font-semibold text-[#475569]">{review.user.name}</span>
                            <span className="text-[#CBD5E1] text-xs">·</span>
                            <RelativeTime iso={review.createdAt.toISOString()} className="text-[11px] text-[#94A3B8]" />
                            {session?.userId === review.userId && (
                              <span className="ml-auto text-[10px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full">
                                Tu reseña
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Sidebar ──────────────────────────────────────────────── */}
          <aside className="space-y-4">
            {/* CTA */}
            <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg,#1E293B,#1E3A5F)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⭐</span>
                <p className="text-sm font-bold">¿Tienes un producto?</p>
              </div>
              <p className="text-xs text-blue-200/70 mb-4 leading-relaxed">
                Deja tu opinión y ayuda a otros compradores a tomar mejores decisiones.
              </p>
              <Link
                href="/buscar"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}
              >
                Buscar y reseñar
              </Link>
            </div>

            {/* Global rating summary */}
            {avgDisplay && totalReviews > 0 && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#F1F5F9]">
                  <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">Resumen global</p>
                </div>
                <div className="p-4 flex flex-col items-center gap-2">
                  <span className="text-4xl font-extrabold text-[#0F172A]">{avgDisplay}</span>
                  <Stars rating={parseFloat(avgDisplay)} size={20} />
                  <p className="text-xs text-[#94A3B8]">sobre {totalReviews} reseñas</p>
                  {/* Distribution */}
                  <div className="w-full mt-2 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviews.filter((r) => r.rating === star).length;
                      const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                      return (
                        <Link key={star} href={ratingHref(star)} className="flex items-center gap-2 group/bar">
                          <span className="text-xs text-[#64748B] w-3 shrink-0">{star}</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#F59E0B" />
                          </svg>
                          <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full transition-all group-hover/bar:bg-amber-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-[#94A3B8] w-4 shrink-0 text-right">{count}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Top rated products */}
            {topProductsWithStats.length > 0 && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#F1F5F9]">
                  <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">Mejor valorados</p>
                </div>
                <div className="divide-y divide-[#F8FAFC]">
                  {topProductsWithStats.map(({ product, avg, count }, i) => (
                    <ProductModalButton
                      key={product.id}
                      slug={product.slug}
                      aria-label={`Ver ${product.name}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors w-full text-left"
                    >
                      <span className="text-xs font-bold text-[#94A3B8] w-4 shrink-0">#{i + 1}</span>
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-9 h-9 rounded-lg object-contain bg-[#F8FAFC] border border-[#E2E8F0] p-0.5 shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-[#F1F5F9] shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#0F172A] line-clamp-1">{product.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Stars rating={avg} size={10} />
                          <span className="text-[10px] text-[#94A3B8]">{avg.toFixed(1)} · {count} op.</span>
                        </div>
                      </div>
                    </ProductModalButton>
                  ))}
                </div>
              </div>
            )}

            {/* Link to forum */}
            <Link
              href="/comunidad"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold text-[#475569] bg-white border border-[#E2E8F0] hover:border-[#2563EB]/30 hover:text-[#2563EB] transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Ver foro y discusiones
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
