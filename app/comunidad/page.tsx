import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { CommunityPostType, type Prisma } from "@/app/generated/prisma/client";
import { RelativeTime } from "@/components/community/RelativeTime";
import { CardVoteButton } from "@/components/community/CardVoteButton";
import { safeData } from "@/lib/safe-data";
import { SectionChip } from "@/app/_components/SectionPrimitives";

export const runtime = "nodejs";

export const metadata = {
  title: "Comunidad · Orvexia",
  description: "Foro de la comunidad Orvexia: comparte experiencias, dudas, chollos y consejos sobre electrodomésticos.",
};

// Colores por categoría (informativos, en tonos translúcidos sobre fondo
// oscuro). El esmeralda queda reservado a «Chollo» (ahorro).
const TYPE_META: Record<
  CommunityPostType,
  { label: string; bg: string; color: string; dot: string; accent: string; icon: string }
> = {
  DISCUSION: { label: "Discusión", bg: "rgba(129,140,248,0.12)", color: "#C7D2FE", dot: "#818CF8", accent: "#818CF8", icon: "💬" },
  PREGUNTA:  { label: "Pregunta",  bg: "rgba(251,191,36,0.12)",  color: "#FCD34D", dot: "#FBBF24", accent: "#FBBF24", icon: "❓" },
  CHOLLO:    { label: "Chollo",    bg: "rgba(52,211,153,0.12)",  color: "#6EE7B7", dot: "#34D399", accent: "#34D399", icon: "🏷️" },
  CONSEJO:   { label: "Consejo",   bg: "rgba(167,139,250,0.12)", color: "#C4B5FD", dot: "#A78BFA", accent: "#A78BFA", icon: "💡" },
};

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

const VALID_TYPES = ["DISCUSION", "PREGUNTA", "CHOLLO", "CONSEJO"] as const;

async function loadCommunity(
  where: Prisma.CommunityPostWhereInput,
  orden: "popular" | "reciente",
) {
  const [posts, counts, totalUsers] = await Promise.all([
    prisma.communityPost.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, avatarUrl: true } },
        product: { select: { id: true, name: true, image: true, slug: true } },
        _count: { select: { comments: true, votes: true } },
        votes: { select: { userId: true } },
      },
      orderBy: orden === "popular"
        ? [{ votes: { _count: "desc" } }, { createdAt: "desc" }]
        : { createdAt: "desc" },
      take: 50,
    }),
    prisma.communityPost.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.user.count(),
  ]);
  const totalComments = await prisma.communityComment.count();
  // Latest active thread (most recently commented)
  const latestActivity = await prisma.communityComment.findFirst({
    orderBy: { createdAt: "desc" },
    include: { post: { select: { id: true, title: true } }, user: { select: { name: true, avatarColor: true, avatarEmoji: true, avatarUrl: true } } },
  });
  return { posts, counts, totalUsers, totalComments, latestActivity };
}

export default async function ComunidadPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const tipoRaw = typeof sp.tipo === "string" ? sp.tipo : undefined;
  const tipo = tipoRaw && VALID_TYPES.includes(tipoRaw as CommunityPostType)
    ? (tipoRaw as CommunityPostType)
    : undefined;

  const orderRaw = typeof sp.orden === "string" ? sp.orden : "reciente";
  const orden = orderRaw === "popular" ? "popular" : "reciente";

  const where: Prisma.CommunityPostWhereInput = tipo ? { type: tipo } : {};

  // La sesión no depende de la BD (solo verifica el JWT), así que la leemos
  // aparte para que el estado de login sobreviva aunque la BD falle.
  const session = await getSession();
  const { posts, counts, totalUsers, totalComments, latestActivity } = await safeData<
    Awaited<ReturnType<typeof loadCommunity>>
  >(
    () => loadCommunity(where, orden),
    { posts: [], counts: [], totalUsers: 0, totalComments: 0, latestActivity: null },
    "comunidad",
  );

  const countMap = Object.fromEntries(counts.map((c) => [c.type, c._count._all]));
  const totalCount = Object.values(countMap).reduce((a, b) => a + b, 0);

  const FILTER_TABS: Array<{ label: string; value: CommunityPostType | undefined; href: string; count?: number }> = [
    { label: "Todos",     value: undefined,   href: orden === "popular" ? "/comunidad?orden=popular" : "/comunidad",                              count: totalCount },
    { label: "Discusión", value: "DISCUSION", href: `/comunidad?tipo=DISCUSION${orden === "popular" ? "&orden=popular" : ""}`, count: countMap["DISCUSION"] },
    { label: "Pregunta",  value: "PREGUNTA",  href: `/comunidad?tipo=PREGUNTA${orden === "popular"  ? "&orden=popular" : ""}`,  count: countMap["PREGUNTA"] },
    { label: "Chollo",    value: "CHOLLO",    href: `/comunidad?tipo=CHOLLO${orden === "popular"    ? "&orden=popular" : ""}`,    count: countMap["CHOLLO"] },
    { label: "Consejo",   value: "CONSEJO",   href: `/comunidad?tipo=CONSEJO${orden === "popular"   ? "&orden=popular" : ""}`,   count: countMap["CONSEJO"] },
  ];

  const ordenHref = (o: string) => {
    const params = new URLSearchParams();
    if (tipo) params.set("tipo", tipo);
    if (o !== "reciente") params.set("orden", o);
    const qs = params.toString();
    return `/comunidad${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="min-h-screen bg-[#050310] text-white/90">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
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
                <SectionChip label="Comunidad" />
              </div>
              <h1
                className="mb-2 font-extrabold tracking-tight text-white"
                style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)", lineHeight: 1.04, letterSpacing: "-0.035em", textWrap: "balance" }}
              >
                Foro &amp; Discusiones
              </h1>
              <p className="max-w-lg text-sm leading-relaxed text-white/55" style={{ textWrap: "pretty" }}>
                Comparte tu experiencia, resuelve dudas, descubre chollos y da consejos sobre electrodomésticos.
              </p>

              {/* Stats row */}
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                {[
                  { v: totalCount, l: "posts" },
                  { v: totalUsers, l: "miembros" },
                  { v: totalComments, l: "respuestas" },
                ].map((s) => (
                  <span key={s.l} className="inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4">
                    <span className="h-1 w-1 rounded-full bg-brand-300" />
                    <span className="text-[13px] font-extrabold tabular text-white">{s.v}</span>
                    <span className="text-[11px] text-white/45">{s.l}</span>
                  </span>
                ))}
              </div>
            </div>

            {session ? (
              <Link
                href="/comunidad/nueva"
                className="shine-on-hover inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 hover:shadow-[0_0_48px_-4px_rgba(129,140,248,0.9)] active:scale-[0.97]"
                style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <path d="M7.5 1.5v12M1.5 7.5h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Nueva publicación
              </Link>
            ) : (
              <Link
                href="/login?next=/comunidad/nueva"
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
              >
                Nueva publicación
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">

          {/* ── Feed column ────────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Controls bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Filter tabs */}
              <div className="flex flex-wrap gap-1.5">
                {FILTER_TABS.map((tab) => {
                  const isActive = tipo === tab.value;
                  const meta = tab.value ? TYPE_META[tab.value] : null;
                  return (
                    <Link
                      key={tab.label}
                      href={tab.href}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        isActive
                          ? "border border-brand-400/50 bg-brand-400/15 text-brand-200 shadow-[0_0_14px_-4px_rgba(129,140,248,0.5)]"
                          : "border border-white/[0.1] bg-white/[0.025] text-white/60 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      {meta && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.dot }} />
                      )}
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular ${isActive ? "bg-brand-400/20 text-brand-100" : "bg-white/[0.05] text-white/45"}`}>
                          {tab.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Sort tabs */}
              <div className="flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.025] p-0.5">
                {[
                  { label: "Reciente", value: "reciente" },
                  { label: "Popular",  value: "popular"  },
                ].map((o) => (
                  <Link
                    key={o.value}
                    href={ordenHref(o.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      orden === o.value
                        ? "bg-brand-500/90 text-white"
                        : "text-white/55 hover:text-white"
                    }`}
                  >
                    {o.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Posts */}
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] py-24 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-400/25 bg-brand-400/10 text-2xl">
                  {tipo ? TYPE_META[tipo].icon : "💬"}
                </div>
                <h2 className="mb-2 text-lg font-bold text-white">
                  {tipo ? `Aún no hay publicaciones de tipo ${TYPE_META[tipo].label}` : "Sin publicaciones todavía"}
                </h2>
                <p className="mx-auto mb-6 max-w-xs text-sm leading-relaxed text-white/55">
                  Sé el primero en compartir algo con la comunidad.
                </p>
                <Link
                  href={session ? "/comunidad/nueva" : "/login?next=/comunidad/nueva"}
                  className="shine-on-hover inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-500 px-6 text-sm font-bold text-white transition-all hover:bg-brand-400 active:scale-[0.97]"
                  style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
                >
                  {session ? "Crear publicación" : "Iniciar sesión para publicar"}
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => {
                  const meta = TYPE_META[post.type];
                  const isHot = post._count.votes >= 3;
                  const hasActivity = post._count.comments > 0;
                  const initialLiked = session
                    ? post.votes.some((v) => v.userId === session.userId)
                    : false;
                  return (
                    <Link
                      key={post.id}
                      href={`/comunidad/${post.id}`}
                      className="group flex overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] transition-all duration-200 hover:border-brand-400/30 hover:shadow-[0_18px_44px_-22px_rgba(99,102,241,0.45)]"
                    >
                      {/* Left accent */}
                      <div className="w-[3px] shrink-0" style={{ backgroundColor: meta.accent }} />

                      <div className="min-w-0 flex-1 px-5 py-4">
                        <div className="flex items-start gap-4">
                          {/* Vote column */}
                          <div className="hidden w-9 shrink-0 flex-col items-center gap-1 pt-0.5 sm:flex">
                            <CardVoteButton
                              postId={post.id}
                              initialLiked={initialLiked}
                              initialCount={post._count.votes}
                              loggedIn={!!session}
                            />
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1 space-y-2">
                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                                style={{ backgroundColor: meta.bg, color: meta.color }}
                              >
                                <span className="h-1 w-1 rounded-full" style={{ backgroundColor: meta.dot }} />
                                {meta.label}
                              </span>
                              {isHot && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                                  🔥 Popular
                                </span>
                              )}
                              {post.product && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-brand-400/25 bg-brand-400/10 px-2 py-0.5 text-[11px] font-semibold text-brand-200">
                                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  {post.product.name.length > 22 ? post.product.name.slice(0, 22) + "…" : post.product.name}
                                </span>
                              )}
                              {!hasActivity && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold text-white/45">
                                  Sin respuestas
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h2 className="text-[15px] font-bold leading-snug text-white line-clamp-2 transition-colors group-hover:text-brand-200">
                              {post.title}
                            </h2>

                            {/* Excerpt */}
                            <p className="text-[13px] leading-relaxed text-white/55 line-clamp-2">
                              {post.content}
                            </p>

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-3 pt-0.5">
                              <div className="flex items-center gap-1.5">
                                <Avatar user={post.user} size={18} />
                                <span className="text-xs font-semibold text-white/65">{post.user.name}</span>
                              </div>
                              <span className="text-xs text-white/25">·</span>
                              <RelativeTime iso={post.createdAt.toISOString()} className="text-[11px] text-white/40" />
                              <span className="text-xs text-white/25">·</span>
                              <span className="flex items-center gap-1 text-[11px] text-white/40">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {post._count.comments} respuesta{post._count.comments !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>

                          {/* Product thumbnail */}
                          {post.product?.image && (
                            <div className="hidden shrink-0 sm:block">
                              <img
                                src={post.product.image}
                                alt={post.product.name}
                                className="h-14 w-14 rounded-xl border border-white/[0.08] bg-white/[0.04] object-contain p-1"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Sidebar ────────────────────────────────────────────────── */}
          <aside className="space-y-4">
            {/* CTA card */}
            {session ? (
              <div
                className="relative overflow-hidden rounded-2xl border border-brand-400/20 p-5 text-white"
                style={{ background: "linear-gradient(160deg, #100d26 0%, #0a0819 55%, #070614 100%)" }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-14 left-1/2 h-32 w-56 -translate-x-1/2 rounded-full"
                  style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.2), transparent 70%)" }}
                />
                <p className="relative mb-1 text-sm font-bold">¡Comparte tu experiencia!</p>
                <p className="relative mb-4 text-xs leading-relaxed text-white/55">
                  Tu opinión ayuda a miles de compradores a tomar mejores decisiones.
                </p>
                <Link
                  href="/comunidad/nueva"
                  className="shine-on-hover relative flex h-11 items-center justify-center gap-2 rounded-full bg-brand-500 px-4 text-sm font-bold text-white transition-all hover:bg-brand-400 active:scale-[0.97]"
                  style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                    <path d="M7.5 1.5v12M1.5 7.5h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Nueva publicación
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                <p className="mb-1 text-sm font-bold text-white">Únete a la conversación</p>
                <p className="mb-4 text-xs leading-relaxed text-white/55">
                  Inicia sesión para publicar, comentar y votar las mejores publicaciones.
                </p>
                <div className="flex gap-2">
                  <Link href="/login" className="flex flex-1 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-3 py-2 text-xs font-bold text-white/70 transition-all hover:border-white/30 hover:text-white">
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/registro"
                    className="shine-on-hover flex flex-1 items-center justify-center rounded-full bg-brand-500 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-brand-400 active:scale-[0.97]"
                    style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
                  >
                    Registrarse
                  </Link>
                </div>
              </div>
            )}

            {/* Categories breakdown */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
              <div className="border-b border-white/[0.06] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">Categorías</p>
              </div>
              <div className="divide-y divide-white/[0.05]">
                {(Object.entries(TYPE_META) as [CommunityPostType, typeof TYPE_META[CommunityPostType]][]).map(([key, meta]) => {
                  const count = countMap[key] ?? 0;
                  const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                  return (
                    <Link
                      key={key}
                      href={`/comunidad?tipo=${key}`}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03] ${tipo === key ? "bg-white/[0.03]" : ""}`}
                    >
                      <span className="text-base">{meta.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-semibold text-white/85">{meta.label}</span>
                          <span className="text-[11px] font-bold tabular text-white/45">{count}</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: meta.dot }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Latest activity */}
            {latestActivity && (
              <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                <div className="border-b border-white/[0.06] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">Actividad reciente</p>
                </div>
                <Link href={`/comunidad/${latestActivity.post.id}`} className="flex items-start gap-3 p-4 transition-colors hover:bg-white/[0.03]">
                  <Avatar user={latestActivity.user} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white/85 line-clamp-1">{latestActivity.user.name} comentó en</p>
                    <p className="mt-0.5 text-xs font-medium text-brand-200 line-clamp-2">{latestActivity.post.title}</p>
                    <RelativeTime iso={latestActivity.createdAt.toISOString()} className="mt-1 block text-[11px] text-white/40" />
                  </div>
                </Link>
              </div>
            )}

            {/* Link to opiniones */}
            <Link
              href="/opiniones"
              className="group flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm font-semibold transition-all hover:border-brand-400/30"
            >
              <span className="text-lg">⭐</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white transition-colors group-hover:text-brand-200">Opiniones &amp; Reseñas</p>
                <p className="text-[11px] text-white/45">Lo que dicen los compradores</p>
              </div>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-white/30 transition-colors group-hover:text-brand-300">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>

            {/* Tips for posting */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
              <div className="border-b border-white/[0.06] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">Guía para publicar</p>
              </div>
              <ul className="divide-y divide-white/[0.05]">
                {[
                  { icon: "💬", text: "Discusión — debate sobre marcas, modelos o tendencias" },
                  { icon: "❓", text: "Pregunta — consulta dudas técnicas o de compra" },
                  { icon: "🏷️", text: "Chollo — comparte ofertas irresistibles con precio y tienda" },
                  { icon: "💡", text: "Consejo — trucos y recomendaciones de uso o mantenimiento" },
                ].map((tip) => (
                  <li key={tip.icon} className="flex items-start gap-2.5 px-4 py-3">
                    <span className="mt-0.5 shrink-0 text-sm">{tip.icon}</span>
                    <p className="text-[12px] leading-relaxed text-white/55">{tip.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
