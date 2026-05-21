"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";

interface Props {
  sidebar: ReactNode;
  canvas: ReactNode;
  overlays?: ReactNode;
}

export default function ControlCenterShell({ sidebar, canvas, overlays }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Lock body scroll while the drawer is open on mobile.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [drawerOpen]);

  // Close with Esc.
  useEffect(() => {
    if (!drawerOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [drawerOpen]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row bg-[#020207] text-white">
      {/* ── Mobile top bar (lg: hidden) ───────────────────────────── */}
      <header className="lg:hidden flex items-center justify-between gap-3 px-3 h-14 border-b border-white/10 bg-[rgba(6,6,16,0.94)] backdrop-blur-xl flex-shrink-0 relative z-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/55 hover:text-white/85 transition-colors px-2 py-1.5 rounded-md hover:bg-white/[0.04]"
        >
          ← Dashboard
        </Link>
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_2px_rgba(34,211,238,0.7)] flex-shrink-0" />
          <h1 className="text-sm font-extrabold tracking-tight truncate">
            Centro de <span className="text-gradient-neon">control</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir herramientas"
          aria-expanded={drawerOpen}
          aria-controls="cc-drawer"
          className="w-9 h-9 inline-flex flex-col items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all flex-shrink-0"
        >
          <span className="block w-4 h-0.5 bg-white" />
          <span className="block w-4 h-0.5 bg-white" />
          <span className="block w-4 h-0.5 bg-white" />
        </button>
      </header>

      {/* ── Backdrop (mobile only, when drawer open) ──────────────── */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden fixed inset-0 z-30 bg-black/65 backdrop-blur-sm animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar (drawer on mobile, static column on desktop) ── */}
      <aside
        id="cc-drawer"
        className={`flex h-full flex-col overflow-y-auto border-r border-white/10 bg-[rgba(6,6,16,0.96)] backdrop-blur-xl
          lg:relative lg:w-72 lg:shrink-0 lg:translate-x-0 lg:flex
          ${drawerOpen
            ? "fixed top-0 bottom-0 left-0 z-40 w-[88%] max-w-[340px] shadow-[8px_0_32px_-8px_rgba(0,0,0,0.8)] animate-slide-in-left"
            : "hidden"
          }`}
      >
        {/* Close button — mobile drawer only */}
        <div className="lg:hidden flex items-center justify-between px-4 pt-3 pb-1">
          <span className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-cyan-300/80">▸ /tools</span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar herramientas"
            className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {sidebar}
      </aside>

      {/* ── Canvas / graph area ───────────────────────────────────── */}
      <section
        className="relative flex-1 min-h-0 bg-[radial-gradient(ellipse_at_50%_45%,#10173a_0%,#0a0d24_45%,#05060f_100%)]"
        id="tour-graph"
      >
        {canvas}
      </section>

      {overlays}
    </div>
  );
}
