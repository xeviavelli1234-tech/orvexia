"use client";

import { useEffect, useRef, useState } from "react";

export interface ChartSeries {
  title: string;
  pts: { t: number; p: number }[];
}

const CHART_COLORS = ["#22d3ee", "#a855f7", "#34d399", "#f59e0b", "#60a5fa", "#f472b6"];

export default function ResponsiveLineChart({ series }: { series: ChartSeries[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(1000);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cw = Math.max(280, Math.floor(e.contentRect.width));
        setW(cw);
      }
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Adapt dimensions based on container width: tighter padding + shorter chart on mobile.
  const isCompact = w < 520;
  const H = isCompact ? 220 : 320;
  const padL = isCompact ? 44 : 60;
  const padR = isCompact ? 12 : 18;
  const padT = isCompact ? 14 : 18;
  const padB = isCompact ? 28 : 34;
  const labelFs = isCompact ? 10 : 11;
  const dotR = isCompact ? 2.2 : 2.6;
  const xTickCount = isCompact ? 2 : 3;

  const plotW = w - padL - padR;
  const plotH = H - padT - padB;

  const all = series.flatMap((s) => s.pts);
  if (all.length === 0) {
    return <div ref={wrapRef} className="w-full text-center py-8 text-sm text-white/40">Sin datos.</div>;
  }
  const tMin = Math.min(...all.map((d) => d.t));
  let tMax = Math.max(...all.map((d) => d.t));
  let pMin = Math.min(...all.map((d) => d.p));
  let pMax = Math.max(...all.map((d) => d.p));
  if (!(tMax > tMin)) tMax = tMin + 1;
  if (!(pMax > pMin)) {
    pMin -= 1;
    pMax += 1;
  } else {
    const pad = (pMax - pMin) * 0.12;
    pMin -= pad;
    pMax += pad;
  }
  const x = (t: number) => padL + ((t - tMin) / (tMax - tMin)) * plotW;
  const y = (p: number) => padT + (1 - (p - pMin) / (pMax - pMin)) * plotH;

  const yTicks = Array.from({ length: 4 }, (_, i) => pMin + ((pMax - pMin) * i) / 3);
  const xTicks = Array.from({ length: xTickCount }, (_, i) =>
    tMin + ((tMax - tMin) * i) / (xTickCount - 1),
  );
  const fmtT = (ms: number) =>
    new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      ...(isCompact ? {} : { hour: "2-digit", minute: "2-digit" }),
    }).format(new Date(ms));
  const fmtY = (v: number) =>
    isCompact && Math.abs(v) >= 1000
      ? `${Math.round(v / 1000)}k €`
      : `${v.toLocaleString("es-ES", { maximumFractionDigits: isCompact ? 0 : 2 })} €`;

  return (
    <div ref={wrapRef} className="w-full">
      <svg viewBox={`0 0 ${w} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: H }}>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize={labelFs} fill="rgba(255,255,255,0.45)">
              {fmtY(v)}
            </text>
          </g>
        ))}
        {xTicks.map((t, i) => (
          <text
            key={i}
            x={x(t)}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            fontSize={labelFs}
            fill="rgba(255,255,255,0.45)"
          >
            {fmtT(t)}
          </text>
        ))}
        {series.map((s, si) => {
          const c = CHART_COLORS[si % CHART_COLORS.length];
          const d = s.pts
            .map((pt, i) => `${i === 0 ? "M" : "L"}${x(pt.t).toFixed(1)},${y(pt.p).toFixed(1)}`)
            .join(" ");
          return (
            <g key={s.title}>
              {s.pts.length > 1 && (
                <path d={d} fill="none" stroke={c} strokeWidth="2" vectorEffect="non-scaling-stroke" />
              )}
              {s.pts.map((pt, i) => (
                <circle key={i} cx={x(pt.t)} cy={y(pt.p)} r={dotR} fill={c} />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {series.map((s, si) => (
          <div key={s.title} className="flex items-center gap-2 text-xs text-white/65 min-w-0">
            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[si % CHART_COLORS.length] }} />
            <span className="max-w-[180px] sm:max-w-[220px] truncate">{s.title}</span>
            <span className="font-mono text-white/45 tabular text-[11px]">
              {s.pts[s.pts.length - 1].p.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
