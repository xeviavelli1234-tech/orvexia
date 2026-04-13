import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { CommunityPostType } from "@/app/generated/prisma/client";
import { RelativeTime } from "@/components/community/RelativeTime";
import { CardVoteButton } from "@/components/community/CardVoteButton";

export const runtime = "nodejs";

export const metadata = {
  title: "Comunidad · Orvexia",
  description: "Foro de la comunidad Orvexia: comparte experiencias, dudas, chollos y consejos sobre electrodomésticos.",
};

const TYPE_META: Record<
  CommunityPostType,
  { label: string; bg: string; color: string; dot: string; accent: string; icon: string }
> = {
  DISCUSION: { label: "Discusión", bg: "#EFF6FF", color: "#2563EB", dot: "#2563EB", accent: "#2563EB", icon: "💬" },
  PREGUNTA:  { label: "Pregunta",  bg: "#FEF3C7", color: "#B45309", dot: "#F59E0B", accent: "#F59E0B", icon: "❓" },
  CHOLLO:    { label: "Chollo",    bg: "#DCFCE7", color: "#15803D", dot: "#16A34A", accent: "#16A34A", icon: "🏷️" },
  CONSEJO:   { label: "Consejo",   bg: "#F3E8FF", color: "#6D28D9", dot: "#7C3AED", accent: "#7C3AED", icon: "💡" },
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

  const where = tipo ? { type: tipo } : {};

  const [posts, session, counts, totalUsers] = await Promise.all([
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
    getSession(),
    prisma.communityPost.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.user.count(),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.type, c._count._all]));
  const totalCount = Object.values(countMap).reduce((a, b) => a + b, 0);
  const totalComments = await prisma.communityComment.count();

  // Latest active thread (most recently commented)
  const latestActivity = await prisma.communityComment.findFirst({
    orderBy: { createdAt: "desc" },
    include: { post: { select: { id: true, title: true } }, user: { select: { name: true, avatarColor: true, avatarEmoji: true, avatarUrl: true } } },
  });

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
    <main className="min-h-screen bg-[#F0F4F8]">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)" }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-blue-500 opacity-[0.07] blur-3xl" />
          <div className="absolute top-10 right-20 w-64 h-64 rounded-full bg-violet-400 opacity-[0.06] blur-3xl" />
          <div className="absolute -bottom-12 left-1/3 w-80 h-80 rounded-full bg-sky-400 opacity-[0.05] blur-3xl" />
          {/* Decorative grid lines */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold text-blue-300 uppercase tracking-widest">
                  Comunidad Orvexia
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">
                Foro &amp; Discusiones
              </h1>
              <p className="text-blue-200/70 text-sm max-w-lg leading-relaxed">
                Comparte tu experiencia, resuelve dudas, descubre chollos y da consejos sobre electrodomésticos.
              </p>

              {/* Stats row */}
              <div className="flex items-center gap-5 mt-5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs text-blue-300/80">
                    <span className="font-bold text-white">{totalCount}</span> posts
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs text-blue-300/80">
                    <span className="font-bold text-white">{totalUsers}</span> miembros
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs text-blue-300/80">
                    <span className="font-bold text-white">{totalComments}</span> respuestas
                  </span>
                </div>
              </div>
            </div>

            {session ? (
              <Link
                href="/comunidad/nueva"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white shrink-0 transition hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)", boxShadow: "0 4px 24px rgba(79,70,229,0.4)" }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <path d="M7.5 1.5v12M1.5 7.5h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Nueva publicación
              </Link>
            ) : (
              <Link
                href="/login?next=/comunidad/nueva"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition shrink-0"
              >
                Nueva publicación
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

          {/* ── Feed column ────────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Controls bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Filter tabs */}
              <div className="flex flex-wrap gap-1.5">
                {FILTER_TABS.map((tab) => {
                  const isActive = tipo === tab.value;
                  const meta = tab.value ? TYPE_META[tab.value] : null;
                  return (
                    <Link
                      key={tab.label}
                      href={tab.href}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-[#1E293B] text-white shadow-sm"
                          : "bg-white border border-[#E2E8F0] text-[#475569] hover:border-[#1E293B]/30 hover:text-[#1E293B]"
                      }`}
                    >
                      {meta && (
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.dot }} />
                      )}
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${isActive ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>
                          {tab.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Sort tabs */}
              <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-full p-0.5">
                {[
                  { label: "Reciente", value: "reciente" },
                  { label: "Popular",  value: "popular"  },
                ].map((o) => (
                  <Link
                    key={o.value}
                    href={ordenHref(o.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      orden === o.value
                        ? "bg-[#1E293B] text-white"
                        : "text-[#64748B] hover:text-[#1E293B]"
                    }`}
                  >
                    {o.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Posts */}
            {posts.length === 0 ? (
              <div className="text-center py-24 bg-white border border-[#E2E8F0] rounded-2xl">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl">
                  {tipo ? TYPE_META[tipo].icon : "💬"}
                </div>
                <h2 className="text-lg font-bold text-[#0F172A] mb-2">
                  {tipo ? `Aún no hay publicaciones de tipo ${TYPE_META[tipo].label}` : "Sin publicaciones todavía"}
                </h2>
                <p className="text-[#64748B] text-sm mb-6 max-w-xs mx-auto leading-relaxed">
                  Sé el primero en compartir algo con la comunidad.
                </p>
                <Link
                  href={session ? "/comunidad/nueva" : "/login?next=/comunidad/nueva"}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#2563EB,#4F46E5)" }}
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
                      className="group flex bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden hover:border-[#94A3B8]/50 hover:shadow-md transition-all duration-200"
                    >
                      {/* Left accent */}
                      <div className="w-[3px] shrink-0" style={{ backgroundColor: meta.accent }} />

                      <div className="flex-1 px-5 py-4 min-w-0">
                        <div className="flex items-start gap-4">
                          {/* Vote column */}
                          <div className="hidden sm:flex flex-col items-center gap-1 pt-0.5 shrink-0 w-9">
                            <CardVoteButton
                              postId={post.id}
                              initialLiked={initialLiked}
                              initialCount={post._count.votes}
                              loggedIn={!!session}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                                style={{ backgroundColor: meta.bg, color: meta.color }}
                              >
                                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: meta.dot }} />
                                {meta.label}
                              </span>
                              {isHot && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-500 border border-orange-100">
                                  🔥 Popular
                                </span>
                              )}
                              {post.product && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-600 border border-sky-100">
                                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  {post.product.name.length > 22 ? post.product.name.slice(0, 22) + "…" : post.product.name}
                                </span>
                              )}
                              {!hasActivity && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-500 border border-violet-100">
                                  Sin respuestas
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h2 className="text-[15px] font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors leading-snug line-clamp-2">
                              {post.title}
                            </h2>

                            {/* Excerpt */}
                            <p className="text-[13px] text-[#64748B] line-clamp-2 leading-relaxed">
                              {post.content}
                            </p>

                            {/* Meta row */}
                            <div className="flex items-center gap-3 pt-0.5 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <Avatar user={post.user} size={18} />
                                <span className="text-xs font-semibold text-[#475569]">{post.user.name}</span>
                              </div>
                              <span className="text-[#CBD5E1] text-xs">·</span>
                              <RelativeTime iso={post.createdAt.toISOString()} className="text-[11px] text-[#94A3B8]" />
                              <span className="text-[#CBD5E1] text-xs">·</span>
                              <span className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {post._count.comments} respuesta{post._count.comments !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>

                          {/* Product thumbnail */}
                          {post.product?.image && (
                            <div className="hidden sm:block shrink-0">
                              <img
                                src={post.product.image}
                                alt={post.product.name}
                                className="w-14 h-14 rounded-xl object-contain bg-[#F8FAFC] border border-[#E2E8F0] p-1"
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
                className="rounded-2xl p-5 text-white"
                style={{ background: "linear-gradient(135deg, #1E293B, #1E3A5F)" }}
              >
                <p className="text-sm font-bold mb-1">¡Comparte tu experiencia!</p>
                <p className="text-xs text-blue-200/70 mb-4 leading-relaxed">
                  Tu opinión ayuda a miles de compradores a tomar mejores decisiones.
                </p>
                <Link
                  href="/comunidad/nueva"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                    <path d="M7.5 1.5v12M1.5 7.5h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Nueva publicación
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl p-5 bg-white border border-[#E2E8F0]">
                <p className="text-sm font-bold text-[#0F172A] mb-1">Únete a la conversación</p>
                <p className="text-xs text-[#64748B] mb-4 leading-relaxed">
                  Inicia sesión para publicar, comentar y votar las mejores publicaciones.
                </p>
                <div className="flex gap-2">
                  <Link href="/login" className="flex-1 flex items-center justify-center px-3 py-2 rounded-xl text-xs font-bold text-[#475569] border border-[#E2E8F0] hover:border-[#2563EB]/30 hover:text-[#2563EB] transition">
                    Iniciar sesión
                  </Link>
                  <Link href="/registro" className="flex-1 flex items-center justify-center px-3 py-2 rounded-xl text-xs font-bold text-white transition hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg,#2563EB,#4F46E5)" }}>
                    Registrarse
                  </Link>
                </div>
              </div>
            )}

            {/* Categories breakdown */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#F1F5F9]">
                <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">Categorías</p>
              </div>
              <div className="divide-y divide-[#F8FAFC]">
                {(Object.entries(TYPE_META) as [CommunityPostType, typeof TYPE_META[CommunityPostType]][]).map(([key, meta]) => {
                  const count = countMap[key] ?? 0;
                  const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                  return (
                    <Link
                      key={key}
                      href={`/comunidad?tipo=${key}`}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors ${tipo === key ? "bg-[#F8FAFC]" : ""}`}
                    >
                      <span className="text-base">{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-[#0F172A]">{meta.label}</span>
                          <span className="text-[11px] font-bold text-[#94A3B8]">{count}</span>
                        </div>
                        <div className="h-1 bg-[#F1F5F9] rounded-full overflow-hidden">
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
              <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#F1F5F9]">
                  <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">Actividad reciente</p>
                </div>
                <Link href={`/comunidad/${latestActivity.post.id}`} className="flex items-start gap-3 p-4 hover:bg-[#F8FAFC] transition-colors">
                  <Avatar user={latestActivity.user} size={30} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#0F172A] line-clamp-1">{latestActivity.user.name} comentó en</p>
                    <p className="text-xs text-[#2563EB] line-clamp-2 mt-0.5 font-medium">{latestActivity.post.title}</p>
                    <RelativeTime iso={latestActivity.createdAt.toISOString()} className="text-[11px] text-[#94A3B8] mt-1 block" />
                  </div>
                </Link>
              </div>
            )}

            {/* Link to opiniones */}
            <Link
              href="/opiniones"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold bg-white border border-[#E2E8F0] hover:border-amber-300 hover:text-amber-600 text-[#475569] transition group"
            >
              <span className="text-lg">⭐</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[#0F172A] group-hover:text-amber-600 transition-colors">Opiniones &amp; Reseñas</p>
                <p className="text-[11px] text-[#94A3B8]">Lo que dicen los compradores</p>
              </div>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[#CBD5E1] group-hover:text-amber-400 transition-colors">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>

            {/* Tips for posting */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#F1F5F9]">
                <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">Guía para publicar</p>
              </div>
              <ul className="divide-y divide-[#F8FAFC]">
                {[
                  { icon: "💬", text: "Discusión — debate sobre marcas, modelos o tendencias" },
                  { icon: "❓", text: "Pregunta — consulta dudas técnicas o de compra" },
                  { icon: "🏷️", text: "Chollo — comparte ofertas irresistibles con precio y tienda" },
                  { icon: "💡", text: "Consejo — trucos y recomendaciones de uso o mantenimiento" },
                ].map((tip) => (
                  <li key={tip.icon} className="flex items-start gap-2.5 px-4 py-3">
                    <span className="text-sm shrink-0 mt-0.5">{tip.icon}</span>
                    <p className="text-[12px] text-[#64748B] leading-relaxed">{tip.text}</p>
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
