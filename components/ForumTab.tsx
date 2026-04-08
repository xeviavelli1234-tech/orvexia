"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Thread = {
  id: string;
  title: string;
  excerpt: string;
  type: "Guía" | "Debate" | "Chollo" | "Pregunta" | "Review";
  tags: string[];
  author: string;
  avatar: string;
  date: string;
  replies: number;
  views: number;
  score: number;
  status: "Abierto" | "Resuelto" | "En revisión";
  products: { name: string; price: string; store: string; badge?: string }[];
};

const TYPES = ["Todos", "Guía", "Debate", "Chollo", "Pregunta", "Review"] as const;

const defaultCategories: { label: string; count: number }[] = [];
const defaultTags: string[] = [];

function classBadge(type: Thread["type"]) {
  const map: Record<Thread["type"], string> = {
    Guía: "bg-blue-50 text-blue-700 border-blue-100",
    Debate: "bg-indigo-50 text-indigo-700 border-indigo-100",
    Chollo: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Pregunta: "bg-amber-50 text-amber-700 border-amber-100",
    Review: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100",
  };
  return map[type];
}

type Trend = { title: string; delta?: string; link?: string };
type TopUser = { name: string; score: number; badge?: string };
type Deal = { name: string; price: string; badge?: string; store?: string };
type Category = { label: string; count?: number };

export default function ForumTab({
  threads,
  trends = [],
  topUsers = [],
  featuredDeals = [],
  categories = defaultCategories,
  tags = defaultTags,
}: {
  threads?: Thread[];
  trends?: Trend[];
  topUsers?: TopUser[];
  featuredDeals?: Deal[];
  categories?: Category[];
  tags?: string[];
}) {
  const [typeFilter, setTypeFilter] = useState<(typeof TYPES)[number]>("Todos");
  const [query, setQuery] = useState("");

  // Data injection via prop (SSR) or global fallback mocks
  const threadsSource: Thread[] = useMemo(() => {
    if (threads && threads.length) return threads;
    const g: any = (globalThis as any);
    if (g.__FORUM_DATA__?.threads?.length) return g.__FORUM_DATA__.threads as Thread[];
    return [];
  }, []);

  const filtered = useMemo(() => {
    return threadsSource.filter((t) => {
      const matchType = typeFilter === "Todos" || t.type === typeFilter;
      const matchQuery =
        query.trim().length === 0 ||
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.excerpt.toLowerCase().includes(query.toLowerCase());
      return matchType && matchQuery;
    });
  }, [threadsSource, typeFilter, query]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      {/* Header */}
      <header className="bg-white border border-[#E2E8F0] rounded-3xl shadow-[0_18px_48px_-28px_rgba(15,23,42,0.25)] p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2563EB]">Foro / Discusiones</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight">
            Decide mejor con la comunidad
          </h1>
          <p className="text-sm text-[#475569]">Comparte dudas, compara productos y valida ofertas antes de comprar.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 min-w-[220px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">🔎</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca modelo, tienda o tema"
              className="w-full rounded-2xl border border-[#E2E8F0] pl-10 pr-3 py-2.5 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
            />
          </div>
          <button className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-[#2563EB] to-[#7C3AED] shadow-md hover:shadow-lg transition">
            Crear hilo
          </button>
        </div>
      </header>

      {/* Body layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr,280px] gap-4">
        {/* Left sidebar */}
        <aside className="space-y-4">
          <Card title="Categorías">
            {categories.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">Sin categorías aún</p>
            ) : (
              <div className="space-y-2">
                {categories.map((c) => (
                  <div key={c.label} className="flex items-center justify-between text-sm">
                    <span className="text-[#0F172A]">{c.label}</span>
                    {c.count != null && <span className="text-[#94A3B8] font-semibold">{c.count}</span>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Tags populares">
            {tags.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">Sin tags todavía</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full text-[12px] font-semibold bg-[#EEF2FF] text-[#2563EB]">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </aside>

        {/* Center feed */}
        <section key={typeFilter} className="space-y-3 fade-swap">
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => {
              const active = typeFilter === t;
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
                    active ? "border-[#2563EB] bg-[#EEF2FF] text-[#1D4ED8]" : "border-[#E2E8F0] text-[#0F172A] hover:border-[#CBD5E1]"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="bg-white border border-dashed border-[#CBD5E1] rounded-2xl p-8 text-center text-[#475569]">
              <p className="text-2xl mb-2">📰</p>
              <p className="font-semibold text-[#0F172A]">No hay hilos todavía</p>
              <p className="text-sm">Sé el primero en crear uno.</p>
            </div>
          )}

          {filtered.map((thread) => (
            <article
              key={thread.id}
              className="group bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold border ${classBadge(thread.type)}`}>
                  {thread.type}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                    thread.status === "Resuelto"
                      ? "bg-emerald-50 text-emerald-700"
                      : thread.status === "En revisión"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {thread.status}
                </span>
              </div>

              <div className="flex flex-col gap-2 mb-3">
                <h3 className="text-lg font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                  {thread.title}
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">{thread.excerpt}</p>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {thread.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full text-[12px] font-semibold bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569]">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-3 text-[12px] text-[#475569]">
                <span className="flex items-center gap-2">
                  <Avatar label={thread.avatar} />
                  <span className="font-semibold text-[#0F172A]">{thread.author}</span>
                </span>
                <span>· {thread.date}</span>
                <span className="flex items-center gap-1">💬 {thread.replies} respuestas</span>
                <span className="flex items-center gap-1">👁️ {thread.views.toLocaleString()} vistas</span>
                <span className="flex items-center gap-1">👍 {thread.score}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {thread.products.map((p) => (
                  <div
                    key={p.name}
                    className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#0F172A] flex items-center gap-2"
                  >
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-[#2563EB] font-bold">{p.price}</span>
                    <span className="text-[#94A3B8]">{p.store}</span>
                    {p.badge && <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#ECFDF3] text-[#16A34A] font-semibold">{p.badge}</span>}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[#475569]">
                  <button className="px-3 py-1.5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#2563EB] transition">
                    Seguir hilo
                  </button>
                  <button className="px-3 py-1.5 rounded-full bg-[#2563EB] text-white font-semibold hover:shadow-md transition">
                    Abrir hilo →
                  </button>
                </div>
                <span className="text-xs text-[#94A3B8]">Moderado · sin spam</span>
              </div>
            </article>
          ))}
        </section>

        {/* Right sidebar */}
        <aside className="space-y-4">
          <Card title="Tendencias">
            {trends.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">Sin tendencias aún</p>
            ) : (
              <div className="space-y-2">
                {trends.map((t) => (
                  <Link key={t.title} href={t.link ?? "#"} className="flex items-center justify-between text-sm text-[#0F172A] hover:text-[#2563EB]">
                    <span>{t.title}</span>
                    {t.delta && <span className="text-emerald-600 font-semibold">{t.delta}</span>}
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card title="Usuarios top">
            {topUsers.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">No hay usuarios destacados todavía</p>
            ) : (
              <div className="space-y-3">
                {topUsers.map((u) => (
                  <div key={u.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar label={u.name.slice(0, 2)} />
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">{u.name}</p>
                        {u.badge && <p className="text-[12px] text-[#475569]">{u.badge}</p>}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#2563EB]">{u.score}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Ofertas destacadas">
            {featuredDeals.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">Aún no hay ofertas destacadas</p>
            ) : (
              <div className="space-y-2">
                {featuredDeals.map((d) => (
                  <div key={d.name} className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                    <p className="text-sm font-semibold text-[#0F172A]">{d.name}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#2563EB] font-bold">{d.price}</span>
                      {d.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-[#ECFDF3] text-[#16A34A] text-[11px] font-semibold">
                          {d.badge}
                        </span>
                      )}
                      {d.store && <span className="text-[#94A3B8]">{d.store}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm">
      <p className="text-xs font-bold text-[#2563EB] uppercase tracking-[0.16em] mb-3">{title}</p>
      {children}
    </div>
  );
}

function Avatar({ label }: { label: string }) {
  return (
    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white text-xs font-bold flex items-center justify-center">
      {label}
    </span>
  );
}

// Simple fade animation for tab changes
// Using styled-jsx to keep it self-contained
// Tailwind-safe class: .fade-swap
/* eslint-disable @next/next/no-css-tags */
export function Style() {
  return (
    <style jsx global>{`
      .fade-swap {
        animation: fadeSwap 220ms ease;
      }
      @keyframes fadeSwap {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `}</style>
  );
}
