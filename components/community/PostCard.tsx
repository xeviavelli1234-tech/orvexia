import Link from "next/link";
import { CommentForm } from "@/components/community/CommentForm";
import type { CommunityFeedItem } from "@/lib/db/community";
import { toggleCommunityVote } from "@/app/actions/community";

function Avatar({
  name,
  color,
  emoji,
  size = 38,
}: {
  name: string;
  color?: string | null;
  emoji?: string | null;
  size?: number;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  const bg = color || "#2563EB";
  return (
    <span
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0 select-none"
      style={{ width: size, height: size, background: bg, fontSize: emoji ? size * 0.45 : size * 0.35 }}
      aria-hidden="true"
    >
      {emoji || initials}
    </span>
  );
}

function TypePill({ type }: { type: CommunityFeedItem["type"] }) {
  const map = {
    DISCUSION: { label: "Discusión", bg: "#EEF2FF", color: "#4338CA" },
    PREGUNTA: { label: "Pregunta", bg: "#ECFDF3", color: "#15803D" },
    CHOLLO: { label: "Chollo", bg: "#FEF2F2", color: "#DC2626" },
    CONSEJO: { label: "Consejo", bg: "#ECFEFF", color: "#0EA5E9" },
  } as const;
  const style = map[type] ?? map.DISCUSION;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  );
}

const typeHint: Record<CommunityFeedItem["type"], string> = {
  PREGUNTA: "Ayuda respondiendo y gana reputación útil.",
  CHOLLO: "Verifica el precio o comparte una alternativa.",
  DISCUSION: "Comparte tu experiencia para reducir la duda.",
  CONSEJO: "Añade contexto rápido para otros compradores.",
};

export function PostCard({
  post,
  isLoggedIn,
}: {
  post: CommunityFeedItem;
  isLoggedIn: boolean;
}) {
  const liked = !!post.votes?.length;

  return (
    <article className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-5 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={post.user.name} color={post.user.avatarColor} emoji={post.user.avatarEmoji} />
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">{post.user.name}</p>
            <p className="text-xs text-[#94A3B8]">
              {new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(post.createdAt)}
            </p>
          </div>
        </div>
        <TypePill type={post.type} />
      </header>

      <div className="space-y-2">
        <h3 className="text-lg font-bold text-[#0F172A]">{post.title}</h3>
        <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-line">{post.content}</p>
        {post.product && (
          <div className="flex flex-wrap gap-2 items-center">
            <Link
              href={`/buscar?query=${encodeURIComponent(post.product.name)}`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] hover:border-[#CBD5E1] transition-colors"
            >
              <span aria-hidden="true">🔍</span>
              {post.product.name}
            </Link>
            <Link
              href={`/dashboard?productId=${post.product.id}`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#EEF2FF] border border-[#E0E7FF] text-xs font-semibold text-[#4338CA] hover:border-[#C7D2FE] transition-colors"
            >
              <span aria-hidden="true">🔔</span>
              Crear alerta
            </Link>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[11px] font-semibold text-[#166534]">
              Producto vinculado
            </span>
          </div>
        )}
        <p className="text-xs text-[#94A3B8]">{typeHint[post.type]}</p>
      </div>

      <div className="flex items-center gap-3 text-[13px] text-[#475569]">
        <form action={toggleCommunityVote.bind(null, post.id)}>
          <button
            type="submit"
            disabled={!isLoggedIn}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition ${
              liked
                ? "border-[#2563EB] bg-[#EEF2FF] text-[#1D4ED8]"
                : "border-[#E2E8F0] hover:border-[#CBD5E1]"
            } ${!isLoggedIn ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            <span aria-hidden="true">👍</span>
            {liked ? "Te gusta" : "Me gusta"}
            <span className="text-xs text-[#64748B]">({post._count.votes})</span>
          </button>
        </form>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC]">
          <span aria-hidden="true">💬</span>
          {post._count.comments} comentarios
        </div>
      </div>

      <div className="space-y-3 pt-1">
        {post.comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar name={comment.user.name} color={comment.user.avatarColor} emoji={comment.user.avatarEmoji} size={32} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#0F172A]">{comment.user.name}</p>
                <span className="text-[11px] text-[#94A3B8]">
                  {new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(comment.createdAt)}
                </span>
              </div>
              <p className="text-sm text-[#475569] leading-relaxed">{comment.content}</p>
            </div>
          </div>
        ))}

        {isLoggedIn ? (
          <CommentForm postId={post.id} />
        ) : (
          <p className="text-sm text-[#64748B]">
            <Link href="/login" className="text-[#2563EB] font-semibold hover:underline">
              Inicia sesión
            </Link>{" "}
            para comentar.
          </p>
        )}
      </div>
    </article>
  );
}
