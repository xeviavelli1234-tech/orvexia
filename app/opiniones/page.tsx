import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { RelativeTime } from "@/components/community/RelativeTime";
import { ProductModalButton } from "@/components/ProductModalButton";
import { safeData } from "@/lib/safe-data";
import { SectionChip } from "@/app/_components/SectionPrimitives";

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
                <stop offset={`${fill * 100}%`} stopColor="var(--warn-500)" />
                <stop offset={`${fill * 100}%`} stopColor="rgba(255,255,255,0.14)" />
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

async function loadOpiniones(opts: {
  productoSlug?: string;
  rating?: number;
  orden: "reciente" | "valoracion";
}) {
  // Resolve product slug to id if filtering by product
  const filteredProduct = opts.productoSlug
    ? await prisma.product.findUnique({ where: { slug: opts.productoSlug }, select: { id: true, name: true, brand: true, image: true, slug: true } })
    : null;

  const whereClause = {
    ...(opts.rating ? { rating: opts.rating } : {}),
    ...(filteredProduct ? { productId: filteredProduct.id } : {}),
  };

  const [reviews, totalReviews, aggAvg, groupByProduct] = await Promise.all([
    prisma.review.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, avatarUrl: true } },
        product: { select: { id: true, name: true, slug: true, image: true, brand: true } },
      },
      orderBy: opts.orden === "valoracion"
        ? [{ rating: "desc" }, { createdAt: "desc" }]
        : { createdAt: "desc" },
      take: 100,
    }),
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

  const totalProductsReviewed = (await prisma.review.groupBy({ by: ["productId"] })).length;

  return { filteredProduct, reviews, totalReviews, aggAvg, topProductsWithStats, totalProductsReviewed };
}

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

  // getSession() solo verifica el JWT (sin BD): sobrevive a un corte de BD.
  const session = await getSession();
  const { filteredProduct, reviews, totalReviews, aggAvg, topProductsWithStats, totalProductsReviewed } =
    await safeData<Awaited<ReturnType<typeof loadOpiniones>>>(
      () => loadOpiniones({ productoSlug, rating, orden }),
      {
        filteredProduct: null,
        reviews: [],
        totalReviews: 0,
        aggAvg: { _avg: { rating: null } },
        topProductsWithStats: [],
        totalProductsReviewed: 0,
      },
      "opiniones",
    );

  const avgDisplay = aggAvg._avg.rating ? aggAvg._avg.rating.toFixed(1) : null;

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
    <main className="min-h-screen bg-[#050310] text-white/90">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.05]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[380px] w-[900px] -translate-x-1/2 rounded-full halo-breathe"
          style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.16), transparent 70%)" }}
        />

        <div className="reveal relative mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <div className="mb-4 flex justify-start">
                <SectionChip label="Opiniones verificadas" />
              </div>
              <h1
                className="mb-2 font-extrabold tracking-tight text-white"
                style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)", lineHeight: 1.04, letterSpacing: "-0.035em", textWrap: "balance" }}
              >
                Opiniones &amp; Reseñas
              </h1>
              <p className="max-w-lg text-sm leading-relaxed text-white/55" style={{ textWrap: "pretty" }}>
                Lo que dicen compradores reales sobre los productos. Sin filtros, sin patrocinios.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                {avgDisplay && (
                  <span className="inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4">
                    <Stars rating={parseFloat(avgDisplay)} size={13} />
                    <span className="text-[13px] font-extrabold tabular text-white">{avgDisplay}</span>
                    <span className="text-[11px] text-white/45">media</span>
                  </span>
                )}
                <span className="inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4">
                  <span className="h-1 w-1 rounded-full bg-brand-300" />
                  <span className="text-[13px] font-extrabold tabular text-white">{totalReviews.toLocaleString("es-ES")}</span>
                  <span className="text-[11px] text-white/45">reseñas</span>
                </span>
                <span className="inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4">
                  <span className="h-1 w-1 rounded-full bg-brand-300" />
                  <span className="text-[13px] font-extrabold tabular text-white">{totalProductsReviewed}</span>
                  <span className="text-[11px] text-white/45">productos</span>
                </span>
              </div>
            </div>

            <Link
              href="/comunidad"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
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
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">

          {/* ── Feed ──────────────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Product filter banner */}
            {filteredProduct && (
              <div className="flex items-center gap-3 rounded-2xl border border-brand-400/25 bg-brand-400/[0.07] px-4 py-3">
                {filteredProduct.image && (
                  <img src={filteredProduct.image} alt={filteredProduct.name} className="h-10 w-10 shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.04] object-contain p-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-300">Filtrando por producto</p>
                  <p className="truncate text-sm font-bold text-white">{filteredProduct.name}</p>
                </div>
                <Link
                  href={clearProductHref()}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-brand-400/30 bg-brand-400/10 px-3 py-1.5 text-xs font-semibold text-brand-200 transition hover:bg-brand-400/20"
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Quitar filtro
                </Link>
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Rating filter */}
              <div className="flex flex-wrap gap-1.5">
                <Link
                  href={ratingHref(undefined)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    !rating
                      ? "border border-brand-400/50 bg-brand-400/15 text-brand-200"
                      : "border border-white/[0.1] bg-white/[0.025] text-white/60 hover:border-white/25 hover:text-white"
                  }`}
                >
                  Todas
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular ${!rating ? "bg-brand-400/20 text-brand-100" : "bg-white/[0.05] text-white/45"}`}>
                    {totalReviews}
                  </span>
                </Link>
                {[5, 4, 3, 2, 1].map((star) => (
                  <Link
                    key={star}
                    href={ratingHref(star)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      rating === star
                        ? "border border-brand-400/50 bg-brand-400/15 text-brand-200"
                        : "border border-white/[0.1] bg-white/[0.025] text-white/60 hover:border-white/25 hover:text-white"
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
              <div className="flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.025] p-0.5">
                {[{ label: "Reciente", value: "reciente" }, { label: "Mejor valorado", value: "valoracion" }].map((o) => (
                  <Link
                    key={o.value}
                    href={ordenHref(o.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      orden === o.value ? "bg-brand-500/90 text-white" : "text-white/55 hover:text-white"
                    }`}
                  >
                    {o.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Reviews list */}
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] py-24 text-center">
                <div className="mb-4 text-4xl">⭐</div>
                <h2 className="mb-2 text-lg font-bold text-white">Sin reseñas todavía</h2>
                <p className="mx-auto mb-6 max-w-xs text-sm text-white/55">
                  {filteredProduct
                    ? `No hay reseñas de ${filteredProduct.name} todavía.`
                    : rating
                    ? `No hay reseñas de ${rating} estrella${rating !== 1 ? "s" : ""} aún.`
                    : "Sé el primero en dejar tu opinión."}
                </p>
                <Link
                  href="/buscar"
                  className="shine-on-hover inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-500 px-6 text-sm font-bold text-white transition-all hover:bg-brand-400 active:scale-[0.97]"
                  style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
                >
                  Buscar productos
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] transition-all duration-200 hover:border-brand-400/30 hover:shadow-[0_18px_44px_-22px_rgba(99,102,241,0.45)]">
                    {/* Top accent bar — proporcional a la valoración */}
                    <div className="h-[3px]" style={{
                      background: `linear-gradient(90deg, #818CF8 ${(review.rating / 5) * 100}%, rgba(255,255,255,0.06) ${(review.rating / 5) * 100}%)`
                    }} />

                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Product thumbnail */}
                        <ProductModalButton
                          slug={review.product.slug}
                          aria-label={`Ver ${review.product.name}`}
                          className="hidden shrink-0 sm:block"
                        >
                          {review.product.image ? (
                            <img
                              src={review.product.image}
                              alt={review.product.name}
                              className="h-16 w-16 rounded-xl border border-white/[0.08] bg-white/[0.04] object-contain p-1 transition-colors hover:border-brand-400/40"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-2xl">
                              📦
                            </div>
                          )}
                        </ProductModalButton>

                        <div className="min-w-0 flex-1 space-y-2">
                          {/* Product name */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                                {review.product.brand}
                              </p>
                              <ProductModalButton slug={review.product.slug} aria-label={`Ver ${review.product.name}`}>
                                <span className="block text-left text-sm font-bold text-white line-clamp-1 transition-colors hover:text-brand-200">
                                  {review.product.name}
                                </span>
                              </ProductModalButton>
                            </div>
                            {/* Stars + rating */}
                            <div className="flex shrink-0 items-center gap-1.5">
                              <Stars rating={review.rating} size={14} />
                              <span className="text-xs font-bold tabular text-white">{review.rating}.0</span>
                            </div>
                          </div>

                          {/* Review content */}
                          {review.title && (
                            <p className="text-sm font-bold leading-snug text-white/90">{review.title}</p>
                          )}
                          <p className="text-[13px] leading-relaxed text-white/60 line-clamp-3">
                            {review.content}
                          </p>

                          {/* Author + date */}
                          <div className="flex items-center gap-2 pt-1">
                            <Avatar user={review.user} size={20} />
                            <span className="text-xs font-semibold text-white/65">{review.user.name}</span>
                            <span className="text-xs text-white/25">·</span>
                            <RelativeTime iso={review.createdAt.toISOString()} className="text-[11px] text-white/40" />
                            {session?.userId === review.userId && (
                              <span className="ml-auto rounded-full border border-brand-400/30 bg-brand-400/10 px-2 py-0.5 text-[10px] font-bold text-brand-200">
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
            <div
              className="relative overflow-hidden rounded-2xl border border-brand-400/20 p-5 text-white"
              style={{ background: "linear-gradient(160deg, #100d26 0%, #0a0819 55%, #070614 100%)" }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-14 left-1/2 h-32 w-56 -translate-x-1/2 rounded-full"
                style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.2), transparent 70%)" }}
              />
              <div className="relative mb-2 flex items-center gap-2">
                <span className="text-xl">⭐</span>
                <p className="text-sm font-bold">¿Tienes un producto?</p>
              </div>
              <p className="relative mb-4 text-xs leading-relaxed text-white/55">
                Deja tu opinión y ayuda a otros compradores a tomar mejores decisiones.
              </p>
              <Link
                href="/buscar"
                className="shine-on-hover relative flex h-11 items-center justify-center gap-2 rounded-full bg-brand-500 px-4 text-sm font-bold text-white transition-all hover:bg-brand-400 active:scale-[0.97]"
                style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
              >
                Buscar y reseñar
              </Link>
            </div>

            {/* Global rating summary */}
            {avgDisplay && totalReviews > 0 && (
              <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                <div className="border-b border-white/[0.06] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">Resumen global</p>
                </div>
                <div className="flex flex-col items-center gap-2 p-4">
                  <span className="text-4xl font-extrabold tabular text-white">{avgDisplay}</span>
                  <Stars rating={parseFloat(avgDisplay)} size={20} />
                  <p className="text-xs text-white/45">sobre {totalReviews} reseñas</p>
                  {/* Distribution */}
                  <div className="mt-2 w-full space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviews.filter((r) => r.rating === star).length;
                      const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                      return (
                        <Link key={star} href={ratingHref(star)} className="group/bar flex items-center gap-2">
                          <span className="w-3 shrink-0 text-xs tabular text-white/55">{star}</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="var(--warn-500)" />
                          </svg>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: "linear-gradient(90deg, #6366F1, #A5B4FC)" }}
                            />
                          </div>
                          <span className="w-4 shrink-0 text-right text-[10px] tabular text-white/45">{count}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Top rated products */}
            {topProductsWithStats.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                <div className="border-b border-white/[0.06] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">Mejor valorados</p>
                </div>
                <div className="divide-y divide-white/[0.05]">
                  {topProductsWithStats.map(({ product, avg, count }, i) => (
                    <ProductModalButton
                      key={product.id}
                      slug={product.slug}
                      aria-label={`Ver ${product.name}`}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="w-4 shrink-0 text-xs font-bold tabular text-white/40">#{i + 1}</span>
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="h-9 w-9 shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.04] object-contain p-0.5" />
                      ) : (
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-white/[0.04]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white/85 line-clamp-1">{product.name}</p>
                        <div className="mt-0.5 flex items-center gap-1">
                          <Stars rating={avg} size={10} />
                          <span className="text-[10px] tabular text-white/45">{avg.toFixed(1)} · {count} op.</span>
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
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/70 transition-all hover:border-brand-400/40 hover:text-brand-200"
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
