import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { CommunityPostType } from "@/app/generated/prisma/client";
import { VoteButton } from "@/components/community/VoteButton";
import { CommentForm } from "@/components/community/CommentForm";
import { DeleteCommentButton } from "@/components/community/DeleteCommentButton";
import { DeletePostButton } from "@/components/community/DeletePostButton";
import { RelativeTime } from "@/components/community/RelativeTime";
import { PostProductCard } from "@/components/community/PostProductCard";

export const runtime = "nodejs";

const TYPE_META: Record<
  CommunityPostType,
  { label: string; bg: string; color: string; accent: string; dot: string }
> = {
  DISCUSION: { label: "Discusión", bg: "#EFF6FF", color: "#2563EB", accent: "#2563EB", dot: "#2563EB" },
  PREGUNTA:  { label: "Pregunta",  bg: "#FEF3C7", color: "#B45309", accent: "#F59E0B", dot: "#F59E0B" },
  CHOLLO:    { label: "Chollo",    bg: "#DCFCE7", color: "#15803D", accent: "#16A34A", dot: "#16A34A" },
  CONSEJO:   { label: "Consejo",   bg: "#F3E8FF", color: "#6D28D9", accent: "#7C3AED", dot: "#7C3AED" },
};

function Avatar({
  user,
  size = 32,
}: {
  user: { name: string; avatarColor: string; avatarEmoji: string | null; avatarUrl: string | null };
  size?: number;
}) {
  const initials =
    user.name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
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


export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.communityPost.findUnique({ where: { id }, select: { title: true } });
  return {
    title: post ? `${post.title} · Comunidad · Orvexia` : "Publicación · Orvexia",
  };
}

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [post, session] = await Promise.all([
    prisma.communityPost.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, avatarColor: true, avatarEmoji: true, avatarUrl: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, avatarColor: true, avatarEmoji: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        votes: { select: { userId: true } },
        product: { select: { id: true, name: true, image: true, slug: true } },
      },
    }),
    getSession(),
  ]);

  if (!post) notFound();

  const currentUser = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true, avatarColor: true, avatarEmoji: true, avatarUrl: true },
      })
    : null;

  const meta = TYPE_META[post.type];
  const initialLiked = session ? post.votes.some((v) => v.userId === session.userId) : false;
  const initialCount = post.votes.length;

  const fullDate = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(post.createdAt);

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      {/* Top bar */}
      <div
        className="px-6 py-5 border-b border-white/5"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)" }}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link
            href="/comunidad"
            className="inline-flex items-center gap-1.5 text-sm text-blue-300 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Comunidad
          </Link>
          <span className="text-blue-800 text-sm">/</span>
          <span className="text-sm text-blue-200/60 truncate max-w-xs">{post.title}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Main column */}
          <div className="space-y-5">
            {/* Post card */}
            <article className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
              {/* Accent top bar */}
              <div className="h-1" style={{ backgroundColor: meta.accent }} />

              <div className="p-6 space-y-5">
                {/* Badge + title */}
                <div className="space-y-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold tracking-wide"
                    style={{ backgroundColor: meta.bg, color: meta.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
                    {meta.label}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] leading-tight">
                    {post.title}
                  </h1>
                </div>

                {/* Author row */}
                <div className="flex items-center gap-3 pb-4 border-b border-[#F1F5F9]">
                  <Avatar user={post.user} size={40} />
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">{post.user.name}</p>
                    <p className="text-xs text-[#94A3B8]">
                      <RelativeTime iso={post.createdAt.toISOString()} /> · {fullDate}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="text-[15px] text-[#334155] leading-relaxed whitespace-pre-line">
                  {post.content}
                </div>

                {/* Vote row */}
                <div className="flex items-center gap-3 pt-2 border-t border-[#F1F5F9]">
                  {session ? (
                    <VoteButton postId={post.id} initialLiked={initialLiked} initialCount={initialCount} />
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F1F5F9] text-[#94A3B8] text-sm font-semibold">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {initialCount}
                      </span>
                      <Link href="/login" className="text-xs text-[#2563EB] hover:underline font-medium">
                        Inicia sesión para votar
                      </Link>
                    </div>
                  )}
                  <span className="ml-auto text-xs text-[#94A3B8] flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {post.comments.length} comentarios
                  </span>
                </div>
              </div>
            </article>

            {/* Comments */}
            <section>
              <h2 className="text-sm font-bold text-[#475569] uppercase tracking-widest mb-4">
                {post.comments.length === 0
                  ? "Sin comentarios aún"
                  : `${post.comments.length} comentario${post.comments.length === 1 ? "" : "s"}`}
              </h2>

              {post.comments.length > 0 && (
                <div className="space-y-3 mb-5">
                  {post.comments.map((comment, i) => (
                    <div
                      key={comment.id}
                      className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex gap-3 hover:border-[#CBD5E1] transition-colors"
                    >
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        <Avatar user={comment.user} size={36} />
                        {i < post.comments.length - 1 && (
                          <div className="w-px flex-1 bg-[#F1F5F9] min-h-[12px]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-bold text-[#0F172A]">{comment.user.name}</span>
                          <RelativeTime iso={comment.createdAt.toISOString()} className="text-[11px] text-[#94A3B8]" />
                          {session?.userId === comment.userId && (
                            <DeleteCommentButton commentId={comment.id} postId={post.id} />
                          )}
                        </div>
                        <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-line">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment form */}
              {session ? (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar
                      user={{
                        name: currentUser?.name ?? session.name ?? "Tú",
                        avatarColor: currentUser?.avatarColor ?? "#2563EB",
                        avatarEmoji: currentUser?.avatarEmoji ?? null,
                        avatarUrl: currentUser?.avatarUrl ?? null,
                      }}
                      size={32}
                    />
                    <p className="text-sm font-semibold text-[#0F172A]">Añadir comentario</p>
                  </div>
                  <CommentForm postId={post.id} />
                </div>
              ) : (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 text-center">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-[#0F172A] mb-1">¿Tienes algo que aportar?</p>
                  <p className="text-xs text-[#64748B] mb-4">Inicia sesión para unirte a la conversación.</p>
                  <Link
                    href={`/login?next=/comunidad/${post.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#2563EB,#4F46E5)" }}
                  >
                    Iniciar sesión
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Product card */}
            {post.product && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#F1F5F9] flex items-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[11px] font-bold text-[#0284C7] uppercase tracking-widest">
                    Producto vinculado
                  </span>
                </div>
                <div className="p-4">
                  <PostProductCard product={post.product} />
                </div>
              </div>
            )}

            {/* About this post */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">
                Detalles del post
              </p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B]">Tipo</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ backgroundColor: meta.bg, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B]">Votos</span>
                  <span className="font-bold text-[#0F172A]">{initialCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B]">Comentarios</span>
                  <span className="font-bold text-[#0F172A]">{post.comments.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B]">Publicado</span>
                  <span className="font-semibold text-[#475569] text-xs text-right max-w-[120px]">
                    {new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(post.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Delete post (only author) */}
            {session?.userId === post.user.id && (
              <DeletePostButton postId={post.id} />
            )}

            {/* Back to community */}
            <Link
              href="/comunidad"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold text-[#475569] bg-white border border-[#E2E8F0] hover:border-[#2563EB]/30 hover:text-[#2563EB] transition"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Ver todas las publicaciones
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
