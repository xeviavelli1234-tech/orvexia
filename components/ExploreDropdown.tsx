"use client";

import { useState, useRef } from "react";
import Link from "next/link";

const destacadas = [
  { label: "Ofertas destacadas", href: "/ofertas-destacadas" },
  { label: "Popularidad", href: "/popularidad" },
];

const secundarias = [
  { label: "Bajadas recientes", href: "/bajadas-recientes" },
  { label: "Mejor momento para la compra", href: "/mejor-momento-para-la-compra" },
  { label: "Categorías", href: "/categorias" },
  { label: "Recomendados", href: "/recomendados" },
];

export function ExploreDropdown() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMouseEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className="flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-lg transition-colors hover:bg-[#E0EDFF]"
        style={{ color: "#0F172A" }}
      >
        Explorar
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 5l4 4 4-4" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Puente invisible para evitar que el hueco cierre el dropdown */}
      {open && <div className="absolute left-0 top-full w-full h-2" />}

      <div
        className="absolute left-0 top-full pt-2 w-64 z-50"
        style={{
          pointerEvents: open ? "auto" : "none",
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(-4px)",
          transition: "opacity 150ms ease, transform 150ms ease",
        }}
      >
        <div
          className="rounded-xl shadow-lg overflow-hidden"
          style={{ backgroundColor: "#ffffff", border: "1px solid #D6E8FF" }}
        >
          <div className="p-2">
            {destacadas.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-[#EAF3FF]"
                style={{ color: "#0F172A" }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#2563EB" }} />
                {item.label}
              </Link>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #E5F0FF", margin: "0 12px" }} />

          <div className="p-2">
            {secundarias.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[#EAF3FF]"
                style={{ color: "#64748B" }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
