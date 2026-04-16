"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const items = [
  { label: "Foro / Discusiones",      href: "/comunidad", icon: "🗨️", color: "#2563EB", bg: "#EEF2FF" },
  { label: "Opiniones y Reseñas",     href: "/opiniones", icon: "⭐", color: "#F59E0B", bg: "#FEF3C7" },
];

export function CommunityDropdown() {
  const uniqueItems = Array.from(new Map(items.map((i) => [i.label, i])).values());
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
        Comunidad
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
          width: "300px",
          pointerEvents: mounted && open ? "auto" : "none",
          opacity: mounted && open ? 1 : 0,
          transform: mounted && open ? "translateY(0)" : "translateY(-6px)",
          transition: "opacity 160ms ease, transform 160ms ease",
        }}
      >
        <div className="rounded-2xl bg-white shadow-[0_8px_32px_rgba(15,23,42,0.12)] border border-[#E2E8F0] overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-[#F1F5F9]">
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Comunidad</p>
          </div>

          <div className="p-2">
            {uniqueItems.map((item) => (
              <Link
                key={`${item.label}`}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group hover:bg-[#F8FAFC]"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-150 group-hover:scale-110"
                  style={{ backgroundColor: item.bg, color: item.color, fontSize: "15px" }}
                  aria-hidden="true"
                >
                  {item.icon}
                </div>
                <p className="text-sm font-semibold text-[#0F172A] leading-tight">{item.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
