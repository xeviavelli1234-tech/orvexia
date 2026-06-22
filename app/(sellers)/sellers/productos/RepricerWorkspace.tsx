"use client";

/**
 * Workspace del centro de control: alterna entre el "Panel" (dashboard bento
 * estilo Hynex, vista por defecto) y el "Grafo" (ProductNetwork, que conserva
 * su propio toggle Grafo/Tabla internamente).
 *
 * ProductNetwork se monta SIEMPRE (oculto cuando no es la pestaña activa) para
 * no perder su estado de viewport/selección al cambiar de pestaña, pero solo
 * el contenedor visible recibe pointer-events.
 */

import { useState, type CSSProperties } from "react";
import ProductNetwork from "./ProductNetwork";
import DashboardOverview, { type DashboardData } from "./DashboardOverview";
import type { NetNode } from "./network/types";

type Tab = "panel" | "grafo";

export default function RepricerWorkspace({
  nodes,
  activeCount,
  data,
}: {
  nodes: NetNode[];
  activeCount: number;
  data: DashboardData;
}) {
  const [tab, setTab] = useState<Tab>("panel");

  return (
    <div className={`absolute inset-0 flex flex-col ${tab === "panel" ? "hx-canvas" : ""}`}>
      {/* ── Barra de pestañas ──────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 px-3 pt-3 sm:px-5">
        <div className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-[rgba(8,11,18,0.7)] p-1 backdrop-blur-xl">
          <TabBtn active={tab === "panel"} onClick={() => setTab("panel")}>
            <Icon kind="panel" /> Resumen
          </TabBtn>
          <TabBtn active={tab === "grafo"} onClick={() => setTab("grafo")}>
            <Icon kind="graph" /> Grafo
          </TabBtn>
        </div>
      </div>

      {/* ── Contenido ──────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        {/* Fondo decorativo animado (solo en el panel) */}
        {tab === "panel" && <Backdrop />}

        {/* Panel: scrolleable */}
        <div
          className={`absolute inset-0 z-[1] overflow-y-auto filters-scroll ${
            tab === "panel" ? "" : "pointer-events-none invisible"
          }`}
          aria-hidden={tab !== "panel"}
        >
          <DashboardOverview nodes={nodes} data={data} />
        </div>

        {/* Grafo: ocupa todo el lienzo */}
        <div
          className={`absolute inset-0 ${
            tab === "grafo" ? "" : "pointer-events-none invisible"
          }`}
          aria-hidden={tab !== "grafo"}
        >
          <ProductNetwork nodes={nodes} activeCount={activeCount} />
        </div>
      </div>
    </div>
  );
}

/** Posiciones fijas (deterministas → sin hydration mismatch) de partículas. */
const PARTICLES: Array<{ left: string; top: string; d: string; delay: string; c: string }> = [
  { left: "8%", top: "70%", d: "15s", delay: "0s", c: "#34d399" },
  { left: "18%", top: "40%", d: "19s", delay: "3s", c: "#2dd4bf" },
  { left: "27%", top: "82%", d: "13s", delay: "1.5s", c: "#a3e635" },
  { left: "41%", top: "30%", d: "21s", delay: "5s", c: "#34d399" },
  { left: "55%", top: "62%", d: "17s", delay: "2s", c: "#2dd4bf" },
  { left: "63%", top: "20%", d: "23s", delay: "6s", c: "#34d399" },
  { left: "72%", top: "78%", d: "14s", delay: "4s", c: "#a3e635" },
  { left: "84%", top: "45%", d: "20s", delay: "1s", c: "#2dd4bf" },
  { left: "92%", top: "68%", d: "18s", delay: "7s", c: "#34d399" },
  { left: "48%", top: "88%", d: "16s", delay: "3.5s", c: "#2dd4bf" },
];

/** Capa decorativa: auroras esmeralda que derivan + rejilla tenue + partículas. */
function Backdrop() {
  return (
    <div className="hx-backdrop" aria-hidden="true">
      <div className="hx-grid" />
      <div
        className="hx-blob hx-blob-a"
        style={{
          top: "-12%",
          left: "-8%",
          width: 620,
          height: 620,
          background: "radial-gradient(circle, rgba(16,185,129,0.38), transparent 68%)",
        }}
      />
      <div
        className="hx-blob hx-blob-b"
        style={{
          top: "8%",
          right: "-10%",
          width: 660,
          height: 660,
          background: "radial-gradient(circle, rgba(45,212,191,0.30), transparent 68%)",
        }}
      />
      <div
        className="hx-blob hx-blob-c"
        style={{
          bottom: "-18%",
          left: "28%",
          width: 720,
          height: 720,
          background: "radial-gradient(circle, rgba(163,230,53,0.20), transparent 68%)",
        }}
      />
      <div
        className="hx-blob hx-blob-b"
        style={{
          bottom: "10%",
          right: "12%",
          width: 480,
          height: 480,
          background: "radial-gradient(circle, rgba(20,184,166,0.22), transparent 70%)",
        }}
      />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="hx-dot"
          style={
            {
              left: p.left,
              top: p.top,
              "--d": p.d,
              "--delay": p.delay,
              "--c": p.c,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`hx-tab inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold ${
        active ? "hx-tab-active text-white" : "text-white/55 hover:text-white/85"
      }`}
    >
      {children}
    </button>
  );
}

function Icon({ kind }: { kind: "panel" | "graph" }) {
  if (kind === "panel") {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    );
  }
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="7" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M8 7.5l8 0M7 8l4 8M17 9l-4 7" strokeLinecap="round" />
    </svg>
  );
}
