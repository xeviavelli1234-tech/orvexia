"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const items = [
  {
    label: "Ofertas destacadas",
    href: "/ofertas-destacadas",
    desc: "Las mejores bajadas del día",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    color: "#F59E0B",
    bg: "#FFFBEB",
  },
  {
    label: "Popularidad",
    href: "/popularidad",
    desc: "Los más buscados ahora",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    color: "#8B5CF6",
    bg: "#F5F3FF",
  },
  {
    label: "Bajadas recientes",
    href: "/bajadas-recientes",
    desc: "Precios que acaban de caer",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
      </svg>
    ),
    color: "#10B981",
    bg: "#ECFDF5",
  },
  {
    label: "Categorías",
    href: "/categorias",
    desc: "Explora por tipo de producto",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    color: "#06B6D4",
    bg: "#ECFEFF",
  },
  {
    label: "Recomendados",
    href: "/recomendados",
    desc: "Selección personalizada para ti",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
    color: "#EF4444",
    bg: "#FEF2F2",
  },
];

export function ExploreDropdown() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  function handleMouseEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg transition-all duration-150 ${
          open ? "bg-[#F1F5F9] text-[#0F172A]" : "text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
        }`}
      >
        Explorar
        <svg
          width="13" height="13" viewBox="0 0 14 14" fill="none"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {mounted && open && <div className="absolute left-0 top-full w-full h-2" />}

      <div
        className="absolute left-0 top-full pt-2 z-50"
        style={{
          width: "320px",
          pointerEvents: mounted && open ? "auto" : "none",
          opacity: mounted && open ? 1 : 0,
          transform: mounted && open ? "translateY(0)" : "translateY(-6px)",
          transition: "opacity 160ms ease, transform 160ms ease",
        }}
      >
        <div className="rounded-2xl bg-white shadow-[0_8px_32px_rgba(15,23,42,0.12)] border border-[#E2E8F0] overflow-hidden">
          {/* Header del dropdown */}
          <div className="px-4 pt-3 pb-2 border-b border-[#F1F5F9]">
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Explorar secciones</p>
          </div>

          <div className="p-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group hover:bg-[#F8FAFC]"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-150 group-hover:scale-110"
                  style={{ backgroundColor: item.bg, color: item.color }}
                >
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A] leading-tight">{item.label}</p>
                  <p className="text-xs text-[#94A3B8] leading-tight mt-0.5">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
