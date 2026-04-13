"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ReviewUser {
  id: string;
  name: string;
  avatarColor: string;
  avatarEmoji: string | null;
  avatarUrl: string | null;
}

interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: ReviewUser;
}

interface DistEntry {
  star: number;
  count: number;
}

interface ReviewsData {
  reviews: Review[];
  avg: number | null;
  total: number;
  dist: DistEntry[];
  myReviewId: string | null;
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({
  user,
  size = 32,
}: {
  user: { name: string; avatarColor: string; avatarEmoji: string | null; avatarUrl: string | null };
  size?: number;
}) {
  const initials = user.name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  if (user.avatarUrl) {
    return (
      <div
        className="rounded-full overflow-hidden shrink-0"
        style={{ width: size, height: size }}
      >
        <img
          src={user.avatarUrl}
          alt={user.name}
          style={{ width: size, height: size, objectFit: "cover" }}
        />
      </div>
    );
  }

  return (
    <span
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{
        width: size,
        height: size,
        background: user.avatarColor,
        fontSize: size * 0.38,
      }}
    >
      {user.avatarEmoji || initials}
    </span>
  );
}

// ── Stars Display ──────────────────────────────────────────────────────────────

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(1, Math.max(0, rating - (star - 1)));
        return (
          <svg key={star} width={size} height={size} viewBox="0 0 24 24">
            <defs>
              <linearGradient id={`sf-${star}-${size}`}>
                <stop offset={`${fill * 100}%`} stopColor="#F59E0B" />
                <stop offset={`${fill * 100}%`} stopColor="#E2E8F0" />
              </linearGradient>
            </defs>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={`url(#sf-${star}-${size})`}
            />
          </svg>
        );
      })}
    </div>
  );
}

// ── Interactive Star Picker ────────────────────────────────────────────────────

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110 focus:outline-none"
            aria-label={`${star} estrellas`}
          >
            <svg width={28} height={28} viewBox="0 0 24 24">
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={active ? "#F59E0B" : "#E2E8F0"}
                stroke={active ? "#D97706" : "#CBD5E1"}
                strokeWidth={0.5}
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

// ── Relative time ──────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "hoy";
  if (days === 1) return "hace 1 día";
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months === 1) return "hace 1 mes";
  if (months < 12) return `hace ${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? "hace 1 año" : `hace ${years} años`;
}

// ── Review Form ────────────────────────────────────────────────────────────────

interface ReviewFormProps {
  productId: string;
  initial?: { id?: string; rating: number; title: string; content: string };
  onSave: (review: Review) => void;
  onCancel?: () => void;
}

function ReviewForm({ productId, initial, onSave, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = rating > 0 && content.trim().length >= 10;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || undefined,
          content: content.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al guardar la reseña");
        return;
      }

      const data = await res.json();
      onSave(data.review);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#F0F7FF] rounded-2xl border border-[#DBEAFE] p-5 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#0F172A]">
          {initial?.id ? "Editar tu reseña" : "Escribe tu reseña"}
        </p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Star picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[#475569]">Valoración *</label>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[#475569]">Título (opcional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Resume tu experiencia en una frase"
          className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition"
        />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[#475569]">
          Reseña * <span className="text-[#94A3B8]">({content.length}/1000, mín. 10)</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          minLength={10}
          maxLength={1000}
          rows={4}
          placeholder="Cuéntanos tu experiencia con este producto..."
          className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition resize-none"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={!valid || submitting}
        className="self-end bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#CBD5E1] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:cursor-not-allowed"
      >
        {submitting ? "Guardando..." : initial?.id ? "Actualizar reseña" : "Publicar reseña"}
      </button>
    </form>
  );
}

// ── Review Card ────────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  isOwn,
  onEdit,
  onDelete,
}: {
  review: Review;
  isOwn: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/reviews?id=${review.id}`, { method: "DELETE" });
      if (res.ok) onDelete();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all ${
        isOwn
          ? "border-[#2563EB]/30 bg-[#F0F7FF]"
          : "border-[#E2E8F0] bg-white"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar user={review.user} size={36} />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[#0F172A] leading-tight">
              {review.user.name}
              {isOwn && (
                <span className="ml-1.5 text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded-full">
                  Tu reseña
                </span>
              )}
            </span>
            <span className="text-xs text-[#94A3B8]">{relativeTime(review.createdAt)}</span>
          </div>
        </div>
        <Stars rating={review.rating} size={14} />
      </div>

      {/* Content */}
      {review.title && (
        <p className="text-sm font-semibold text-[#0F172A] leading-snug">{review.title}</p>
      )}
      <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-line">{review.content}</p>

      {/* Own review actions */}
      {isOwn && (
        <div className="flex items-center gap-2 pt-1 border-t border-[#DBEAFE]">
          <button
            onClick={onEdit}
            className="text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
          >
            Editar
          </button>
          <span className="text-[#CBD5E1] text-xs">·</span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ReviewSection({ productId }: { productId: string }) {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews?productId=${productId}`);
      if (res.ok) setData(await res.json());
    } catch {
      // ignore
    }
  }, [productId]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      // Check auth
      try {
        const res = await fetch("/api/profile");
        setLoggedIn(res.ok);
      } catch {
        setLoggedIn(false);
      }
      await fetchReviews();
      setLoading(false);
    }
    init();
  }, [fetchReviews]);

  function handleSave(review: Review) {
    setEditing(false);
    // Optimistically refresh
    fetchReviews();
  }

  function handleDelete() {
    fetchReviews();
  }

  if (loading) {
    return (
      <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
        <div className="h-6 w-32 bg-[#F1F5F9] rounded-lg animate-pulse mb-4" />
        <div className="h-24 bg-[#F1F5F9] rounded-2xl animate-pulse" />
      </div>
    );
  }

  const myReview = data?.reviews.find((r) => r.id === data.myReviewId);
  const otherReviews = data?.reviews.filter((r) => r.id !== data.myReviewId) ?? [];
  const maxDist = data ? Math.max(...data.dist.map((d) => d.count), 1) : 1;

  return (
    <div className="mt-6 pt-6 border-t border-[#E2E8F0] flex flex-col gap-5">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#0F172A]">Reseñas de la comunidad</h3>
        {data && data.total > 0 && (
          <span className="text-xs text-[#64748B]">{data.total} {data.total === 1 ? "reseña" : "reseñas"}</span>
        )}
      </div>

      {/* Average + distribution */}
      {data && data.total > 0 && data.avg !== null && (
        <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-4 flex flex-col sm:flex-row items-center gap-5">
          {/* Big average */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-5xl font-bold text-[#0F172A] leading-none">
              {data.avg.toFixed(1)}
            </span>
            <Stars rating={data.avg} size={18} />
            <span className="text-xs text-[#94A3B8] mt-0.5">de 5 estrellas</span>
          </div>

          {/* Distribution bars */}
          <div className="flex-1 flex flex-col gap-1.5 w-full">
            {[5, 4, 3, 2, 1].map((star) => {
              const entry = data.dist.find((d) => d.star === star)!;
              const pct = maxDist > 0 ? (entry.count / maxDist) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-[#64748B] w-4 text-right shrink-0">{star}</span>
                  <svg width={12} height={12} viewBox="0 0 24 24" className="shrink-0">
                    <path
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                      fill="#F59E0B"
                    />
                  </svg>
                  <div className="flex-1 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#94A3B8] w-4 shrink-0">{entry.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {data && data.total === 0 && (
        <div className="text-center py-8 text-[#94A3B8]">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
          <p className="text-sm font-medium">Sin reseñas todavía</p>
          <p className="text-xs mt-1">Sé el primero en compartir tu opinión</p>
        </div>
      )}

      {/* Own review highlighted (if exists & not editing) */}
      {myReview && !editing && (
        <ReviewCard
          review={myReview}
          isOwn={true}
          onEdit={() => setEditing(true)}
          onDelete={handleDelete}
        />
      )}

      {/* Show form: editing own OR new review */}
      {loggedIn && (editing || !myReview) && (
        <ReviewForm
          productId={productId}
          initial={
            editing && myReview
              ? { id: myReview.id, rating: myReview.rating, title: myReview.title ?? "", content: myReview.content }
              : undefined
          }
          onSave={handleSave}
          onCancel={editing ? () => setEditing(false) : undefined}
        />
      )}

      {/* Not logged in nudge */}
      {loggedIn === false && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4 text-center">
          <p className="text-sm text-[#475569]">
            <a href="/login" className="text-[#2563EB] font-semibold hover:underline">Inicia sesión</a>
            {" "}para escribir una reseña
          </p>
        </div>
      )}

      {/* Other reviews */}
      {otherReviews.length > 0 && (
        <div className="flex flex-col gap-3">
          {otherReviews.map((r) => (
            <ReviewCard key={r.id} review={r} isOwn={false} />
          ))}
        </div>
      )}
    </div>
  );
}
