"use client";

import { useState } from "react";
import Link from "next/link";
import { RelativeTime } from "./RelativeTime";

const TYPE_META = {
  DISCUSION: { label: "Discusión", bg: "var(--brand-50)", color: "var(--brand-600)", dot: "var(--brand-600)" },
  PREGUNTA:  { label: "Pregunta",  bg: "#FEF3C7", color: "#B45309", dot: "var(--warn-500)" },
  CHOLLO:    { label: "Chollo",    bg: "#DCFCE7", color: "#15803D", dot: "var(--accent-600)" },
  CONSEJO:   { label: "Consejo",   bg: "#F3E8FF", color: "#6D28D9", dot: "#7C3AED" },
} as const;

export type MyPost = {
  id: string;
  title: string;
  type: keyof typeof TYPE_META;
  createdAt: string;
  product: { name: string; image: string | null } | null;
  _count: { comments: number; votes: number };
};

export type MyComment = {
  id: string;
  content: string;
  createdAt: string;
  post: {
    id: string;
    title: string;
    type: keyof typeof TYPE_META;
  };
};

export function MiActividad({
  posts,
  comments,
}: {
  posts: MyPost[];
  comments: MyComment[];
}) {
  const [tab, setTab] = useState<"posts" | "comments">("posts");

  return (
    <div className="bg-bg-elevated rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-0 border-b border-border-subtle">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-fg flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="var(--brand-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Mi actividad en la comunidad
          </h2>
          <Link
            href="/comunidad/nueva"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg,#2563EB,#4F46E5)" }}
          >
            <svg width="10" height="10" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path d="M7.5 1.5v12M1.5 7.5h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            Nueva
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          <button
            onClick={() => setTab("posts")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === "posts"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Publicaciones
            {posts.length > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${tab === "posts" ? "bg-blue-100 text-blue-600" : "bg-bg-subtle text-fg-subtle"}`}>
                {posts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("comments")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === "comments"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Comentarios
            {comments.length > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${tab === "comments" ? "bg-blue-100 text-blue-600" : "bg-bg-subtle text-fg-subtle"}`}>
                {comments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Posts tab */}
      {tab === "posts" && (
        <>
          {posts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-blue-50 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="var(--brand-600)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2v6h6" stroke="var(--brand-600)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-fg mb-1">Aún no has publicado nada</p>
              <p className="text-xs text-fg-subtle mb-4">Comparte tu experiencia con la comunidad.</p>
              <Link
                href="/comunidad/nueva"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg,#2563EB,#4F46E5)" }}
              >
                Crear primera publicación
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F8FAFC]">
              {posts.map((post) => {
                const meta = TYPE_META[post.type];
                return (
                  <Link
                    key={post.id}
                    href={`/comunidad/${post.id}`}
                    className="group flex items-start gap-3 px-6 py-4 hover:bg-bg-subtle transition-colors"
                  >
                    <span className="mt-2 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.dot }} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        <RelativeTime iso={post.createdAt} className="text-[11px] text-fg-subtle" />
                      </div>
                      <p className="text-sm font-semibold text-fg group-hover:text-brand-600 transition-colors line-clamp-1">
                        {post.title}
                      </p>
                      {post.product && (
                        <p className="text-xs text-fg-subtle mt-0.5 flex items-center gap-1">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {post.product.name}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-[11px] text-fg-subtle">
                      <span className="flex items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {post._count.votes}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {post._count.comments}
                      </span>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-fg-faint group-hover:text-brand-600 transition-colors">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Comments tab */}
      {tab === "comments" && (
        <>
          {comments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-blue-50 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="var(--brand-600)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-fg mb-1">Aún no has comentado</p>
              <p className="text-xs text-fg-subtle">Participa en los posts de la comunidad.</p>
              <Link href="/comunidad" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#2563EB,#4F46E5)" }}>
                Explorar foro
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F8FAFC]">
              {comments.map((comment) => {
                const meta = TYPE_META[comment.post.type];
                return (
                  <Link
                    key={comment.id}
                    href={`/comunidad/${comment.post.id}`}
                    className="group block px-6 py-4 hover:bg-bg-subtle transition-colors"
                  >
                    {/* Post context */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: meta.bg, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs text-fg-subtle truncate">en</span>
                      <span className="text-xs font-semibold text-fg-muted group-hover:text-brand-600 transition-colors truncate">
                        {comment.post.title}
                      </span>
                    </div>

                    {/* Comment preview */}
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-fg-faint">
                          <path d="M9 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M17 17v4l4-4h-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-fg-muted line-clamp-2 leading-relaxed">
                          {comment.content}
                        </p>
                        <RelativeTime iso={comment.createdAt} className="text-[11px] text-fg-subtle mt-1 block" />
                      </div>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-fg-faint group-hover:text-brand-600 transition-colors shrink-0 mt-1">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
