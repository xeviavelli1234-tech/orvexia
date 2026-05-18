"use client";

import {
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { updateListingRangeAction, toggleListingAction } from "./actions";

export interface NetNode {
  id: string;
  title: string;
  asin: string;
  sku: string;
  imageUrl: string | null;
  priceCurrent: number;
  currency: string;
  priceMin: number | null;
  priceMax: number | null;
  repricingEnabled: boolean;
}

const VB_W = 1400;
const VB_H = 900;
const R = 38;

/** PRNG determinista (igual en server y cliente). */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  x: number;
  y: number;
  r: number;
  o: number;
  t: number;
}

function makeStars(count: number, seed: number, rMul: number): Star[] {
  const rnd = mulberry32(seed);
  const s: Star[] = [];
  for (let i = 0; i < count; i++) {
    const big = rnd() > 0.92;
    s.push({
      x: rnd() * VB_W,
      y: rnd() * VB_H,
      r: (big ? 1.5 + rnd() * 1.4 : 0.4 + rnd() * 0.9) * rMul,
      o: big ? 0.7 + rnd() * 0.3 : 0.18 + rnd() * 0.5,
      t: 3 + rnd() * 6,
    });
  }
  return s;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 180) * (60 * k - 90);
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
function fmt(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type State = "off" | "on" | "ready" | "noprice";
function nodeState(n: NetNode): State {
  if (n.priceCurrent <= 0 || !n.asin) return "noprice";
  if (n.repricingEnabled) return "on";
  if (n.priceMin != null && n.priceMax != null) return "ready";
  return "off";
}
const STATE_COLOR: Record<State, { stroke: string; halo: string; core: string }> = {
  on: { stroke: "rgba(52,211,153,0.85)", halo: "rgba(52,211,153,0.8)", core: "#34d399" },
  ready: { stroke: "rgba(255,170,80,0.8)", halo: "rgba(249,115,22,0.5)", core: "#F59E0B" },
  off: { stroke: "rgba(255,170,80,0.55)", halo: "rgba(249,115,22,0.3)", core: "#F97316" },
  noprice: { stroke: "rgba(160,160,180,0.4)", halo: "rgba(120,120,140,0.25)", core: "#64748b" },
};

function errMsg(code: string): string {
  const m: Record<string, string> = {
    price_max_must_be_greater_or_equal_to_min: "El máximo debe ser ≥ al mínimo",
    missing_price_range: "Define mín y máx primero",
    listing_not_repriceable: "Sin precio/ASIN en Amazon: no se puede repreciar",
    listing_not_found_or_not_owned: "Producto no encontrado",
    unauthorized: "Sesión expirada",
    validation_failed: "Datos inválidos",
  };
  return m[code] ?? code;
}

export default function ProductNetwork({ nodes }: { nodes: NetNode[] }) {
  const router = useRouter();
  const [selId, setSelId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  const layers = useMemo(
    () => ({
      a: makeStars(120, 111, 0.7),
      b: makeStars(80, 222, 1),
      c: makeStars(36, 333, 1.5),
    }),
    [],
  );

  const layout = useMemo(() => {
    const n = nodes.length;
    const cx = VB_W / 2;
    const cy = VB_H / 2;
    const maxR = Math.min(380, 150 + n * 20);
    const minX = VB_W * 0.16,
      maxX = VB_W * 0.84,
      minY = VB_H * 0.16,
      maxY = VB_H * 0.82;

    const pos = nodes.map((node, i) => {
      const g = i * 2.39996323;
      const rr = maxR * Math.sqrt((i + 0.55) / Math.max(n, 1));
      const jx = (hash(node.id + "x") - 0.5) * 90;
      const jy = (hash(node.id + "y") - 0.5) * 78;
      let x = cx + Math.cos(g) * rr * 1.5 + jx;
      let y = cy + Math.sin(g) * rr + jy;
      x = Math.max(minX, Math.min(maxX, x));
      y = Math.max(minY, Math.min(maxY, y));
      return { ...node, x, y };
    });

    const edges: Array<{ a: number; b: number }> = [];
    const seen = new Set<string>();
    const add = (a: number, b: number) => {
      if (a === b || a < 0 || b < 0 || a >= n || b >= n) return;
      const k = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (seen.has(k)) return;
      seen.add(k);
      edges.push({ a, b });
    };
    for (let i = 1; i < n; i++) add(i, i - 1);
    if (n > 3) for (let i = 0; i < n; i++) add(i, (i + 3) % n);
    if (n > 5) for (let i = 0; i < n; i += 2) add(i, Math.floor(n / 2));
    return { pos, edges };
  }, [nodes]);

  const sel = nodes.find((x) => x.id === selId) ?? null;

  function open(n: NetNode) {
    setSelId(n.id);
    setErr(null);
    setMin(n.priceMin != null ? String(n.priceMin) : "");
    setMax(n.priceMax != null ? String(n.priceMax) : "");
  }

  function saveRange() {
    if (!sel) return;
    setErr(null);
    const fd = new FormData();
    fd.set("listingId", sel.id);
    fd.set("priceMin", min.trim());
    fd.set("priceMax", max.trim());
    startTransition(async () => {
      const r = await updateListingRangeAction(fd);
      if (!r.ok) setErr(errMsg(r.error));
      else router.refresh();
    });
  }

  function toggle() {
    if (!sel) return;
    setErr(null);
    const fd = new FormData();
    fd.set("listingId", sel.id);
    fd.set("enabled", String(!sel.repricingEnabled));
    startTransition(async () => {
      const r = await toggleListingAction(fd);
      if (!r.ok) setErr(errMsg(r.error));
      else router.refresh();
    });
  }

  if (nodes.length === 0) return null;
  const selState = sel ? nodeState(sel) : "off";

  return (
    <div className="absolute inset-0">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="space" cx="50%" cy="36%" r="85%">
            <stop offset="0%" stopColor="#171042" />
            <stop offset="45%" stopColor="#0a0a23" />
            <stop offset="100%" stopColor="#020207" />
          </radialGradient>
          <radialGradient id="neb1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(129,140,248,0.34)" />
            <stop offset="100%" stopColor="rgba(129,140,248,0)" />
          </radialGradient>
          <radialGradient id="neb2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.26)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </radialGradient>
          <radialGradient id="neb3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(217,70,239,0.24)" />
            <stop offset="100%" stopColor="rgba(217,70,239,0)" />
          </radialGradient>
          <radialGradient id="coreOn" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#d1fae5" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#34d399" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#064e3b" stopOpacity="0.05" />
          </radialGradient>
          <radialGradient id="coreAmb" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#FFE5B4" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#F97316" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#7C2D12" stopOpacity="0.05" />
          </radialGradient>
          <linearGradient id="streak" gradientUnits="userSpaceOnUse"
            x1="0" y1="0" x2="-150" y2="-80">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#cdd6ff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#cdd6ff" stopOpacity="0" />
          </linearGradient>
          <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {layout.pos.map((p) => (
            <clipPath id={`c-${p.id}`} key={p.id}>
              <circle cx={p.x} cy={p.y} r={R - 10} />
            </clipPath>
          ))}
        </defs>

        {/* Fondo espacial */}
        <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#space)" />
        <g>
          <ellipse className="neb-float" style={{ "--nd": "30s" } as CSSProperties}
            cx={VB_W * 0.3} cy={VB_H * 0.32} rx="420" ry="320" fill="url(#neb1)" />
          <ellipse className="neb-float" style={{ "--nd": "38s" } as CSSProperties}
            cx={VB_W * 0.74} cy={VB_H * 0.7} rx="460" ry="340" fill="url(#neb2)" />
          <ellipse className="neb-float" style={{ "--nd": "46s" } as CSSProperties}
            cx={VB_W * 0.6} cy={VB_H * 0.2} rx="360" ry="260" fill="url(#neb3)" />
        </g>

        {/* Estrellas — 3 capas parallax */}
        <g className="star-layer-a" fill="#cbd5ff">
          {layers.a.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o}
              className="star-tw" style={{ "--o": s.o, "--t": `${s.t}s` } as CSSProperties} />
          ))}
        </g>
        <g className="star-layer-b" fill="#ffffff">
          {layers.b.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
          ))}
        </g>
        <g className="star-layer-c" fill="#e9d5ff">
          {layers.c.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o}
              className="star-tw" style={{ "--o": s.o, "--t": `${s.t}s` } as CSSProperties} />
          ))}
        </g>

        {/* Estrellas fugaces — estela con degradado, raras y elegantes */}
        {[
          { x0: 140, y0: -120, x1: 820, y1: 360, sd: 15, dl: 3 },
          { x0: 820, y0: -130, x1: 1360, y1: 430, sd: 21, dl: 10 },
          { x0: -130, y0: 170, x1: 620, y1: 760, sd: 27, dl: 18 },
        ].map((sh, i) => (
          <g
            key={i}
            className="shoot"
            style={
              {
                "--x0": `${sh.x0}px`,
                "--y0": `${sh.y0}px`,
                "--x1": `${sh.x1}px`,
                "--y1": `${sh.y1}px`,
                "--sd": `${sh.sd}s`,
                "--sdelay": `${sh.dl}s`,
              } as CSSProperties
            }
          >
            <line
              x1="0"
              y1="0"
              x2="-150"
              y2="-80"
              stroke="url(#streak)"
              strokeWidth="2.2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx="0" cy="0" r="6" fill="#ffffff" opacity="0.18" />
            <circle cx="0" cy="0" r="2.2" fill="#ffffff" />
          </g>
        ))}

        {/* Aristas */}
        <g stroke="rgba(180,190,255,0.18)" strokeWidth="1.1" fill="none">
          {layout.edges.map(({ a, b }, i) => {
            const pa = layout.pos[a], pb = layout.pos[b];
            const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
            const dx = pb.x - pa.x, dy = pb.y - pa.y;
            return <path key={i} vectorEffect="non-scaling-stroke" d={`M${pa.x},${pa.y} Q${mx - dy * 0.12},${my + dx * 0.12} ${pb.x},${pb.y}`} />;
          })}
        </g>
        <g stroke="rgba(190,210,255,0.65)" strokeWidth="1.4" fill="none" strokeLinecap="round">
          {layout.edges.map(({ a, b }, i) => {
            const pa = layout.pos[a], pb = layout.pos[b];
            const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
            const dx = pb.x - pa.x, dy = pb.y - pa.y;
            return (
              <path key={i} className="net-flow" vectorEffect="non-scaling-stroke"
                style={{ animationDelay: `${(i % 7) * 0.18}s` }}
                d={`M${pa.x},${pa.y} Q${mx - dy * 0.12},${my + dx * 0.12} ${pb.x},${pb.y}`} />
            );
          })}
        </g>

        {/* Nodos */}
        {layout.pos.map((p) => {
          const st = nodeState(p);
          const col = STATE_COLOR[st];
          const active = selId === p.id;
          return (
            <g key={p.id} className="hex-node" onClick={() => open(p)}>
              <polygon points={hexPoints(p.x, p.y, R + 7)} fill="none"
                stroke={active ? "#fff" : col.halo}
                strokeWidth={active ? 2 : 1.1} filter="url(#glow)" />
              <polygon points={hexPoints(p.x, p.y, R)} fill="rgba(10,8,20,0.82)"
                stroke={col.stroke} strokeWidth="1.3" />
              {p.imageUrl ? (
                <image href={p.imageUrl} x={p.x - (R - 10)} y={p.y - (R - 10)}
                  width={(R - 10) * 2} height={(R - 10) * 2}
                  clipPath={`url(#c-${p.id})`} preserveAspectRatio="xMidYMid slice" opacity={0.92} />
              ) : (
                <circle className="hex-core" cx={p.x} cy={p.y} r={R - 13}
                  fill={st === "on" ? "url(#coreOn)" : "url(#coreAmb)"} />
              )}
              {st === "on" && (
                <circle cx={p.x + R - 6} cy={p.y - R + 6} r="4.5" fill="#34d399" filter="url(#glow)" />
              )}
              <text x={p.x} y={p.y + R + 17} textAnchor="middle" fontSize="13" fontWeight={600}
                fill="rgba(255,255,255,0.8)">{clip(p.title, 22)}</text>
              <text x={p.x} y={p.y + R + 34} textAnchor="middle" fontSize="12.5" fontWeight={700}
                fill={p.priceCurrent > 0 ? "#FBBF24" : "rgba(180,180,200,0.6)"}
                className={p.priceCurrent > 0 ? "amber-glow" : undefined}>
                {p.priceCurrent > 0 ? `${fmt(p.priceCurrent)} ${sym(p.currency)}` : "Sin precio"}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Inspector / administración del nodo */}
      {sel && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-[360px] bg-[rgba(8,6,18,0.92)] backdrop-blur-xl border-l border-indigo-400/20 p-5 overflow-y-auto fade-in">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-bold text-white/90 leading-tight">{sel.title}</h3>
            <button onClick={() => setSelId(null)}
              className="shrink-0 text-white/40 hover:text-white text-lg leading-none">×</button>
          </div>
          <div className="mt-1 font-mono text-[10px] text-white/40">
            {sel.asin || "sin ASIN"} · {sel.sku}
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40">Precio actual</div>
            <div className="mt-1 text-2xl font-bold text-amber-300 amber-glow">
              {sel.priceCurrent > 0 ? `${fmt(sel.priceCurrent)} ${sym(sel.currency)}` : "Sin oferta"}
            </div>
          </div>

          {selState === "noprice" ? (
            <p className="mt-4 text-xs text-amber-300/80 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
              Este producto no tiene oferta/precio activo en Amazon (o le falta ASIN). No se
              puede repreciar hasta que tenga una oferta válida.
            </p>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Mín €</span>
                  <input value={min} onChange={(e) => setMin(e.target.value)}
                    inputMode="decimal" placeholder="0,00" disabled={pending}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-amber-400/60 focus:outline-none" />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Máx €</span>
                  <input value={max} onChange={(e) => setMax(e.target.value)}
                    inputMode="decimal" placeholder="0,00" disabled={pending}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-amber-400/60 focus:outline-none" />
                </label>
              </div>
              <button onClick={saveRange} disabled={pending}
                className="mt-3 w-full rounded-lg bg-[var(--brand-600)] text-white py-2 text-sm font-semibold hover:bg-[var(--brand-700)] transition-colors disabled:opacity-50">
                {pending ? "Guardando…" : "Guardar rango"}
              </button>

              <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <div>
                  <div className="text-sm font-semibold text-white/90">Reprecio automático</div>
                  <div className="text-[11px] text-white/45">
                    {sel.repricingEnabled ? "Activo" : "Pausado"}
                  </div>
                </div>
                <button onClick={toggle} disabled={pending} role="switch"
                  aria-checked={sel.repricingEnabled}
                  className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                    sel.repricingEnabled ? "bg-emerald-500" : "bg-white/20"
                  }`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    sel.repricingEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
            </>
          )}

          {err && <p className="mt-3 text-xs text-red-400">{err}</p>}
        </div>
      )}
    </div>
  );
}
