"use client";

import { useMemo, useState } from "react";

export interface NetNode {
  id: string;
  title: string;
  asin: string;
  sku: string;
  imageUrl: string | null;
  priceCurrent: number;
  currency: string;
}

const VB_W = 1000;
const VB_H = 620;
const R = 34; // radio del hexágono

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295; // 0..1
}

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 180) * (60 * k - 90); // pointy-top
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

function sym(code: string): string {
  if (code === "EUR") return "€";
  if (code === "USD") return "$";
  if (code === "GBP") return "£";
  return code;
}

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export default function ProductNetwork({ nodes }: { nodes: NetNode[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const layout = useMemo(() => {
    const n = nodes.length;
    const cx = VB_W / 2;
    const cy = VB_H / 2 + 6;
    const maxR = Math.min(252, 96 + n * 14);

    const pos = nodes.map((node, i) => {
      const golden = i * 2.39996323; // ángulo áureo → constelación
      const rr = maxR * Math.sqrt((i + 0.55) / Math.max(n, 1));
      const jx = (hash(node.id + "x") - 0.5) * 70;
      const jy = (hash(node.id + "y") - 0.5) * 60;
      let x = cx + Math.cos(golden) * rr * 1.62 + jx;
      let y = cy + Math.sin(golden) * rr + jy;
      x = Math.max(70, Math.min(VB_W - 70, x));
      y = Math.max(64, Math.min(VB_H - 78, y));
      return { ...node, x, y };
    });

    // Aristas: espina + enlaces largos para el aspecto de red
    const edges: Array<{ a: number; b: number }> = [];
    const seen = new Set<string>();
    const add = (a: number, b: number) => {
      if (a === b || a < 0 || b < 0 || a >= n || b >= n) return;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({ a, b });
    };
    for (let i = 1; i < n; i++) add(i, i - 1);
    if (n > 3) for (let i = 0; i < n; i++) add(i, (i + 3) % n);
    if (n > 5) for (let i = 0; i < n; i += 2) add(i, Math.floor(n / 2));

    return { pos, edges };
  }, [nodes]);

  if (nodes.length === 0) return null;

  const pct = (v: number, max: number) => `${(v / max) * 100}%`;
  const hoveredNode = layout.pos.find((p) => p.id === hover) ?? null;

  return (
    <div className="relative w-full">
      <div className="relative w-full" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="core" cx="50%" cy="42%" r="60%">
              <stop offset="0%" stopColor="#FFE5B4" stopOpacity="0.95" />
              <stop offset="42%" stopColor="#F97316" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#7C2D12" stopOpacity="0.05" />
            </radialGradient>
            <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {layout.pos.map((p) => (
              <clipPath id={`c-${p.id}`} key={p.id}>
                <circle cx={p.x} cy={p.y} r={R - 9} />
              </clipPath>
            ))}
          </defs>

          {/* Aristas base */}
          <g stroke="rgba(249,170,90,0.22)" strokeWidth="1.1" fill="none">
            {layout.edges.map(({ a, b }, i) => {
              const pa = layout.pos[a];
              const pb = layout.pos[b];
              const mx = (pa.x + pb.x) / 2;
              const my = (pa.y + pb.y) / 2;
              const dx = pb.x - pa.x;
              const dy = pb.y - pa.y;
              const cxq = mx - dy * 0.12;
              const cyq = my + dx * 0.12;
              return (
                <path key={i} d={`M${pa.x},${pa.y} Q${cxq},${cyq} ${pb.x},${pb.y}`} />
              );
            })}
          </g>
          {/* Flujo de datos animado */}
          <g
            stroke="rgba(255,196,120,0.7)"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          >
            {layout.edges.map(({ a, b }, i) => {
              const pa = layout.pos[a];
              const pb = layout.pos[b];
              const mx = (pa.x + pb.x) / 2;
              const my = (pa.y + pb.y) / 2;
              const dx = pb.x - pa.x;
              const dy = pb.y - pa.y;
              const cxq = mx - dy * 0.12;
              const cyq = my + dx * 0.12;
              return (
                <path
                  key={i}
                  className="net-flow"
                  style={{ animationDelay: `${(i % 7) * 0.18}s` }}
                  d={`M${pa.x},${pa.y} Q${cxq},${cyq} ${pb.x},${pb.y}`}
                />
              );
            })}
          </g>

          {/* Nodos */}
          {layout.pos.map((p) => {
            const active = hover === p.id;
            return (
              <g
                key={p.id}
                className="hex-node"
                onMouseEnter={() => setHover(p.id)}
                onMouseLeave={() => setHover((h) => (h === p.id ? null : h))}
              >
                {/* halo */}
                <polygon
                  points={hexPoints(p.x, p.y, R + 7)}
                  fill="none"
                  stroke={active ? "rgba(255,196,120,0.9)" : "rgba(249,115,22,0.35)"}
                  strokeWidth={active ? 1.6 : 1}
                  filter="url(#glow)"
                />
                {/* marco */}
                <polygon
                  points={hexPoints(p.x, p.y, R)}
                  fill="rgba(20,12,6,0.82)"
                  stroke="rgba(255,170,80,0.65)"
                  strokeWidth="1.2"
                />
                {/* núcleo / imagen */}
                {p.imageUrl ? (
                  <image
                    href={p.imageUrl}
                    x={p.x - (R - 9)}
                    y={p.y - (R - 9)}
                    width={(R - 9) * 2}
                    height={(R - 9) * 2}
                    clipPath={`url(#c-${p.id})`}
                    preserveAspectRatio="xMidYMid slice"
                    opacity={0.92}
                  />
                ) : (
                  <circle
                    className="hex-core"
                    cx={p.x}
                    cy={p.y}
                    r={R - 12}
                    fill="url(#core)"
                  />
                )}
                {/* etiqueta */}
                <text
                  x={p.x}
                  y={p.y + R + 16}
                  textAnchor="middle"
                  fontSize="12.5"
                  fontWeight={600}
                  fill="rgba(255,255,255,0.78)"
                >
                  {clip(p.title, 22)}
                </text>
                <text
                  x={p.x}
                  y={p.y + R + 32}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight={700}
                  fill={p.priceCurrent > 0 ? "#FBBF24" : "rgba(251,191,36,0.5)"}
                  className={p.priceCurrent > 0 ? "amber-glow" : undefined}
                >
                  {p.priceCurrent > 0
                    ? `${p.priceCurrent.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} ${sym(p.currency)}`
                    : "Sin precio"}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip HTML mapeado a coordenadas del viewBox */}
        {hoveredNode && (
          <div
            className="pointer-events-none absolute z-10 w-60 -translate-x-1/2 -translate-y-full"
            style={{
              left: pct(hoveredNode.x, VB_W),
              top: `calc(${pct(hoveredNode.y, VB_H)} - 46px)`,
            }}
          >
            <div className="glass rounded-xl border border-amber-400/30 p-3 shadow-[0_0_30px_-8px_rgba(249,115,22,0.5)]">
              <div className="text-[13px] font-semibold leading-snug text-white/90">
                {hoveredNode.title}
              </div>
              <div className="mt-1 font-mono text-[10px] text-white/40">
                {hoveredNode.asin || "sin ASIN"} · {hoveredNode.sku}
              </div>
              <div className="mt-2 text-base font-bold text-amber-300 amber-glow">
                {hoveredNode.priceCurrent > 0
                  ? `${hoveredNode.priceCurrent.toLocaleString("es-ES", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} ${sym(hoveredNode.currency)}`
                  : "Sin precio / oferta"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
