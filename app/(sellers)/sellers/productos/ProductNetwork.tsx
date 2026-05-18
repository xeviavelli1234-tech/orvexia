"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import WaveField from "./WaveField";
import {
  updateListingRangeAction,
  toggleListingAction,
  updateListingStrategyAction,
} from "./actions";

type Strategy = "BUYBOX" | "MATCH" | "FIXED" | "MARGIN";
type UndercutType = "AMOUNT" | "PERCENT";
type NoComp = "MAX" | "HOLD";

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
  strategy: Strategy;
  undercutType: UndercutType;
  undercutValue: number;
  fixedPrice: number | null;
  cost: number | null;
  feePercent: number | null;
  targetMargin: number | null;
  noCompetition: NoComp;
}

const VB_W = 1400;
const VB_H = 900;
const R = 38;
const K_MIN = 0.75;
const K_MAX = 4;

/** Limita el paneo: solo se permite asomarse un poco a las esquinas. */
function clampView(v: { k: number; x: number; y: number }) {
  const mx = VB_W * 0.07;
  const my = VB_H * 0.07;
  const bx0 = VB_W * 0.12,
    bx1 = VB_W * 0.88,
    by0 = VB_H * 0.1,
    by1 = VB_H * 0.9;

  // Margen libre de paneo (se permite moverse "un poco", no infinito).
  const freeX = VB_W * 0.28;
  const freeY = VB_H * 0.28;

  let xMin: number, xMax: number;
  {
    const lo = VB_W - mx - v.k * bx1;
    const hi = mx - v.k * bx0;
    if (lo <= hi) {
      // Contenido mayor que la ventana: paneo dentro + asomo extra.
      xMin = lo - freeX * 0.6;
      xMax = hi + freeX * 0.6;
    } else {
      // Cabe entero: paneo libre acotado alrededor del centro.
      const c = (lo + hi) / 2;
      xMin = c - freeX;
      xMax = c + freeX;
    }
  }

  let yMin: number, yMax: number;
  {
    const lo = VB_H - my - v.k * by1;
    const hi = my - v.k * by0;
    if (lo <= hi) {
      yMin = lo - freeY * 0.6;
      yMax = hi + freeY * 0.6;
    } else {
      const c = (lo + hi) / 2;
      yMin = c - freeY;
      yMax = c + freeY;
    }
  }

  return {
    k: v.k,
    x: Math.min(xMax, Math.max(xMin, v.x)),
    y: Math.min(yMax, Math.max(yMin, v.y)),
  };
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
const STATE_COLOR: Record<State, { stroke: string; halo: string }> = {
  on: { stroke: "rgba(52,211,153,0.9)", halo: "rgba(52,211,153,0.85)" },
  ready: { stroke: "rgba(96,165,250,0.85)", halo: "rgba(59,130,246,0.6)" },
  off: { stroke: "rgba(148,163,255,0.6)", halo: "rgba(99,102,241,0.4)" },
  noprice: { stroke: "rgba(160,160,180,0.4)", halo: "rgba(120,120,140,0.25)" },
};

function errMsg(code: string): string {
  const m: Record<string, string> = {
    price_max_must_be_greater_or_equal_to_min: "El máximo debe ser ≥ al mínimo",
    missing_price_range: "Define mín y máx primero",
    listing_not_repriceable: "Sin precio/ASIN en Amazon: no se puede repreciar",
    fixed_price_required: "Indica un precio fijo válido",
    cost_required: "Indica el coste del producto",
    invalid_undercut: "Valor de ajuste no válido",
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
  const [strategy, setStrategy] = useState<Strategy>("BUYBOX");
  const [undType, setUndType] = useState<UndercutType>("AMOUNT");
  const [undVal, setUndVal] = useState("0.01");
  const [fixedP, setFixedP] = useState("");
  const [cost, setCost] = useState("");
  const [feeP, setFeeP] = useState("15");
  const [tMargin, setTMargin] = useState("10");
  const [noComp, setNoComp] = useState<NoComp>("MAX");

  // ── Viewport (pan / zoom) ──────────────────────────────────
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ active: boolean; sx: number; sy: number; ox: number; oy: number; moved: boolean }>(
    { active: false, sx: 0, sy: 0, ox: 0, oy: 0, moved: false },
  );
  const suppressClick = useRef(false);

  /** Punto de cliente → coordenadas del viewBox (respeta slice). */
  function toVB(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const inv = ctm.inverse();
    return {
      x: inv.a * clientX + inv.c * clientY + inv.e,
      y: inv.b * clientX + inv.d * clientY + inv.f,
    };
  }

  function zoomAt(clientX: number, clientY: number, factor: number) {
    setView((v) => {
      const k2 = Math.min(K_MAX, Math.max(K_MIN, v.k * factor));
      const p = toVB(clientX, clientY);
      const ratio = k2 / v.k;
      return clampView({
        k: k2,
        x: p.x - ratio * (p.x - v.x),
        y: p.y - ratio * (p.y - v.y),
      });
    });
  }

  function zoomCenter(factor: number) {
    const svg = svgRef.current;
    const r = svg?.getBoundingClientRect();
    zoomAt(
      r ? r.left + r.width / 2 : window.innerWidth / 2,
      r ? r.top + r.height / 2 : window.innerHeight / 2,
      factor,
    );
  }

  // wheel no-pasivo para poder preventDefault
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    // Solo botón primario. El click derecho/medio abría un "pan" que nunca
    // recibía pointerup (sale el menú contextual) → drag fantasma atascado
    // y a partir de ahí ningún clic en producto funcionaba.
    if (e.button !== 0) {
      drag.current.active = false;
      return;
    }
    if ((e.target as Element).closest(".hex-node")) {
      // Clic deliberado sobre un nodo: nuevo gesto limpio.
      suppressClick.current = false;
      drag.current.active = false;
      return;
    }
    drag.current = {
      active: true,
      sx: e.clientX,
      sy: e.clientY,
      ox: view.x,
      oy: view.y,
      moved: false,
    };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d.active) return;
    const a = toVB(e.clientX, e.clientY);
    const b = toVB(d.sx, d.sy);
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 8) d.moved = true;
    setView((v) => clampView({ k: v.k, x: d.ox + (a.x - b.x), y: d.oy + (a.y - b.y) }));
  }
  function onPointerUp() {
    if (drag.current.moved) suppressClick.current = true;
    drag.current.active = false;
  }

  const layout = useMemo(() => {
    const n = nodes.length;
    const hx = VB_W / 2;
    const hy = VB_H / 2;
    const HUB_GAP = 165; // espacio libre alrededor del icono de Amazon
    const maxR = Math.min(330, 110 + n * 16);
    const minX = VB_W * 0.13,
      maxX = VB_W * 0.87,
      minY = VB_H * 0.15,
      maxY = VB_H * 0.85;

    const pos = nodes.map((node, i) => {
      const g = i * 2.39996323; // ángulo áureo → ramas repartidas
      const rr = HUB_GAP + maxR * Math.sqrt((i + 0.4) / Math.max(n, 1));
      const jx = (hash(node.id + "x") - 0.5) * 44;
      const jy = (hash(node.id + "y") - 0.5) * 40;
      let x = hx + Math.cos(g) * rr * 1.5 + jx;
      let y = hy + Math.sin(g) * rr + jy;
      x = Math.max(minX, Math.min(maxX, x));
      y = Math.max(minY, Math.min(maxY, y));
      return { ...node, x, y };
    });

    return { hub: { x: hx, y: hy }, pos };
  }, [nodes]);

  const sel = nodes.find((x) => x.id === selId) ?? null;

  function open(n: NetNode) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setSelId(n.id);
    setErr(null);
    setMin(n.priceMin != null ? String(n.priceMin) : "");
    setMax(n.priceMax != null ? String(n.priceMax) : "");
    setStrategy(n.strategy);
    setUndType(n.undercutType);
    setUndVal(String(n.undercutValue ?? 0.01));
    setFixedP(n.fixedPrice != null ? String(n.fixedPrice) : "");
    setCost(n.cost != null ? String(n.cost) : "");
    setFeeP(n.feePercent != null ? String(n.feePercent) : "15");
    setTMargin(n.targetMargin != null ? String(n.targetMargin) : "10");
    setNoComp(n.noCompetition);
  }

  function saveStrategy() {
    if (!sel) return;
    setErr(null);
    const fd = new FormData();
    fd.set("listingId", sel.id);
    fd.set("strategy", strategy);
    fd.set("undercutType", undType);
    fd.set("undercutValue", undVal.trim() || "0.01");
    fd.set("fixedPrice", fixedP.trim());
    fd.set("cost", cost.trim());
    fd.set("feePercent", feeP.trim());
    fd.set("targetMargin", tMargin.trim());
    fd.set("noCompetition", noComp);
    startTransition(async () => {
      const r = await updateListingStrategyAction(fd);
      if (!r.ok) setErr(errMsg(r.error));
      else router.refresh();
    });
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
      <div
        className={`absolute inset-y-0 left-0 right-0 transition-[right] duration-300 ${
          sel ? "sm:right-[380px]" : ""
        }`}
      >
      {/* Fondo animado */}
      <WaveField />
      {/* Viñeta muy suave solo en los bordes (centro despejado) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_58%,rgba(2,2,12,0.34))]" />

      <svg
        ref={svgRef}
        className={`absolute inset-0 h-full w-full select-none [touch-action:none] ${drag.current.active ? "cursor-grabbing" : "cursor-grab"}`}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <radialGradient id="coreOn" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#d1fae5" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#34d399" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#064e3b" stopOpacity="0.05" />
          </radialGradient>
          <radialGradient id="coreAmb" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#6366f1" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.05" />
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
              <circle cx={p.x} cy={p.y} r={R - 10} />
            </clipPath>
          ))}
        </defs>

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {/* Ramas: del icono de Amazon a cada producto */}
          {(() => {
            const h = layout.hub;
            const spoke = (p: { x: number; y: number }) => {
              const mx = (h.x + p.x) / 2,
                my = (h.y + p.y) / 2;
              const dx = p.x - h.x,
                dy = p.y - h.y;
              return `M${h.x},${h.y} Q${mx - dy * 0.08},${my + dx * 0.08} ${p.x},${p.y}`;
            };
            return (
              <>
                <g stroke="rgba(255,153,0,0.18)" strokeWidth="1.2" fill="none">
                  {layout.pos.map((p) => (
                    <path key={p.id} vectorEffect="non-scaling-stroke" d={spoke(p)} />
                  ))}
                </g>
                <g
                  stroke="rgba(255,178,71,0.6)"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                >
                  {layout.pos.map((p, i) => (
                    <path
                      key={p.id}
                      className="net-flow"
                      vectorEffect="non-scaling-stroke"
                      style={{ animationDelay: `${(i % 7) * 0.18}s` }}
                      d={spoke(p)}
                    />
                  ))}
                </g>
                {/* Punto de luz viajando por cada rama */}
                <g>
                  {layout.pos.map((p, i) => (
                    <circle key={p.id} r="3.4" fill="#FFD08A" filter="url(#glow)">
                      <animateMotion
                        dur={`${3 + (i % 4) * 0.6}s`}
                        begin={`${(i % 6) * 0.5}s`}
                        repeatCount="indefinite"
                        path={spoke(p)}
                        keyPoints="1;0"
                        keyTimes="0;1"
                        calcMode="linear"
                      />
                    </circle>
                  ))}
                </g>
              </>
            );
          })()}

          {/* Nodo central: icono de Amazon */}
          {(() => {
            const h = layout.hub;
            const HR = 54;
            const w = HR * 1.15;
            return (
              <g>
                <circle
                  className="hub-ring"
                  cx={h.x}
                  cy={h.y}
                  r={HR + 12}
                  fill="none"
                  stroke="rgba(255,153,0,0.55)"
                  strokeWidth="1.6"
                  strokeDasharray="3 10"
                  strokeLinecap="round"
                />
                <circle
                  className="hub-breathe"
                  cx={h.x}
                  cy={h.y}
                  r={HR + 6}
                  fill="none"
                  stroke="rgba(255,153,0,0.45)"
                  strokeWidth="1.4"
                  filter="url(#glow)"
                />
                <circle
                  cx={h.x}
                  cy={h.y}
                  r={HR}
                  fill="rgba(10,9,16,0.92)"
                  stroke="#FF9900"
                  strokeWidth="1.8"
                />
                {/* wordmark + sonrisa de Amazon */}
                <text
                  x={h.x}
                  y={h.y - 4}
                  textAnchor="middle"
                  fontSize="20"
                  fontWeight={800}
                  fill="#ffffff"
                  style={{ letterSpacing: "0.5px" }}
                >
                  amazon
                </text>
                <path
                  d={`M${h.x - w / 2},${h.y + 10} Q${h.x},${h.y + 26} ${h.x + w / 2},${h.y + 9}`}
                  fill="none"
                  stroke="#FF9900"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d={`M${h.x + w / 2 - 9},${h.y + 4} L${h.x + w / 2 + 1},${h.y + 9} L${h.x + w / 2 - 6},${h.y + 16} Z`}
                  fill="#FF9900"
                />
                <text
                  x={h.x}
                  y={h.y + HR + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight={700}
                  fill="rgba(255,170,80,0.85)"
                >
                  Tu cuenta · {layout.pos.length} productos
                </text>
              </g>
            );
          })()}

          {/* Rama del producto seleccionado → icono de analítica
              (antes de los nodos: así los productos quedan por encima
              y un satélite nunca intercepta el clic de otro producto) */}
          {(() => {
            if (!selId) return null;
            const p = layout.pos.find((q) => q.id === selId);
            if (!p) return null;
            const h = layout.hub;
            const dx = p.x - h.x;
            const dy = p.y - h.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const SX = p.x + ux * 132 - uy * 34;
            const SY = p.y + uy * 132 + ux * 34;
            const SR = 24;
            const branch = `M${p.x},${p.y} Q${(p.x + SX) / 2 - uy * 14},${
              (p.y + SY) / 2 + ux * 14
            } ${SX},${SY}`;
            return (
              <g>
                <path
                  d={branch}
                  fill="none"
                  stroke="rgba(125,211,252,0.28)"
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  className="net-flow"
                  d={branch}
                  fill="none"
                  stroke="rgba(125,211,252,0.7)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                <g
                  className="hex-node"
                  onClick={() => {
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    window.dispatchEvent(
                      new CustomEvent("orvexia:open-analytics", {
                        detail: { productId: selId },
                      }),
                    );
                  }}
                >
                  <circle cx={SX} cy={SY} r={SR + 14} fill="transparent" />
                  <circle
                    cx={SX}
                    cy={SY}
                    r={SR + 5}
                    fill="none"
                    stroke="rgba(125,211,252,0.45)"
                    strokeWidth="1.2"
                    filter="url(#glow)"
                  />
                  <circle
                    cx={SX}
                    cy={SY}
                    r={SR}
                    fill="rgba(8,10,22,0.92)"
                    stroke="rgba(125,211,252,0.7)"
                    strokeWidth="1.3"
                  />
                  <g stroke="#7dd3fc" strokeWidth="2.6" strokeLinecap="round">
                    <line x1={SX - 9} y1={SY + 7} x2={SX - 9} y2={SY + 1} />
                    <line x1={SX} y1={SY + 7} x2={SX} y2={SY - 5} />
                    <line x1={SX + 9} y1={SY + 7} x2={SX + 9} y2={SY - 2} />
                  </g>
                  <text
                    x={SX}
                    y={SY + SR + 15}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={700}
                    fill="rgba(125,211,252,0.85)"
                  >
                    Analítica
                  </text>
                </g>
              </g>
            );
          })()}

          {/* Nodos */}
          {layout.pos.map((p, i) => {
            const st = nodeState(p);
            const col = STATE_COLOR[st];
            const active = selId === p.id;
            return (
              <g
                key={p.id}
                className="node-float"
                style={
                  {
                    "--d": `${3.6 + (i % 5) * 0.5}s`,
                    "--dl": `${(i % 7) * 0.45}s`,
                  } as CSSProperties
                }
              >
                <g className="hex-node" onClick={() => open(p)}>
                {/* Área de clic (ajustada para no invadir nodos vecinos) */}
                <rect
                  x={p.x - 78}
                  y={p.y - (R + 16)}
                  width={156}
                  height={2 * R + 64}
                  fill="transparent"
                />
                <polygon points={hexPoints(p.x, p.y, R + 7)} fill="none"
                  stroke={active ? "#fff" : col.halo}
                  strokeWidth={active ? 2 : 1.1} filter="url(#glow)" />
                <polygon points={hexPoints(p.x, p.y, R)} fill="rgba(8,8,20,0.78)"
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
                  fill="rgba(255,255,255,0.85)">{clip(p.title, 22)}</text>
                <text x={p.x} y={p.y + R + 34} textAnchor="middle" fontSize="12.5" fontWeight={700}
                  fill={p.priceCurrent > 0 ? "#7dd3fc" : "rgba(180,180,200,0.6)"}
                  className={p.priceCurrent > 0 ? "text-glow-cyan" : undefined}>
                  {p.priceCurrent > 0 ? `${fmt(p.priceCurrent)} ${sym(p.currency)}` : "Sin precio"}
                </text>
                </g>
              </g>
            );
          })}

        </g>
      </svg>

      {/* Controles de zoom */}
      <div className="absolute bottom-5 left-5 flex flex-col gap-2">
        <ZoomBtn label="Acercar" onClick={() => zoomCenter(1.25)}>+</ZoomBtn>
        <ZoomBtn label="Alejar" onClick={() => zoomCenter(1 / 1.25)}>−</ZoomBtn>
        <ZoomBtn label="Restablecer vista" onClick={() => setView({ k: 1, x: 0, y: 0 })}>
          <span className="text-[11px] leading-none">1:1</span>
        </ZoomBtn>
      </div>
      </div>

      {/* Inspector / administración del nodo */}
      {sel && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-[380px] bg-[rgba(7,7,18,0.96)] backdrop-blur-2xl border-l border-cyan-400/15 shadow-[-30px_0_60px_-30px_rgba(34,211,238,0.35)] overflow-y-auto fade-in">
          {/* Cabecera */}
          <div className="sticky top-0 z-10 flex items-start gap-3 px-5 py-4 bg-[rgba(7,7,18,0.96)] backdrop-blur-2xl border-b border-white/10">
            <div className="h-11 w-11 shrink-0 rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden grid place-items-center">
              {sel.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sel.imageUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="text-white/30 text-xs">—</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white/90 leading-snug line-clamp-2">
                {sel.title}
              </h3>
              <div className="mt-0.5 font-mono text-[10px] text-white/35 truncate">
                {sel.asin || "sin ASIN"} · {sel.sku}
              </div>
            </div>
            <button
              onClick={() => setSelId(null)}
              aria-label="Cerrar"
              className="shrink-0 h-7 w-7 grid place-items-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="p-5">
            <div className="rounded-xl border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.10),rgba(99,102,241,0.06))] p-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">
                Precio actual
              </div>
              <div className="mt-1 text-3xl font-extrabold text-cyan-300 text-glow-cyan tabular-nums">
                {sel.priceCurrent > 0 ? `${fmt(sel.priceCurrent)} ${sym(sel.currency)}` : "Sin oferta"}
              </div>
              {sel.priceMin != null && sel.priceMax != null && (
                <div className="mt-1 text-[11px] text-white/45">
                  Rango {fmt(sel.priceMin)}–{fmt(sel.priceMax)} {sym(sel.currency)}
                </div>
              )}
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
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none" />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Máx €</span>
                  <input value={max} onChange={(e) => setMax(e.target.value)}
                    inputMode="decimal" placeholder="0,00" disabled={pending}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none" />
                </label>
              </div>
              <button onClick={saveRange} disabled={pending}
                className="mt-3 w-full rounded-lg bg-[var(--brand-600)] text-white py-2 text-sm font-semibold hover:bg-[var(--brand-700)] transition-colors disabled:opacity-50">
                {pending ? "Guardando…" : "Guardar rango"}
              </button>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white/90">Reprecio automático</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        sel.repricingEnabled ? "bg-emerald-400" : "bg-white/30"
                      }`}
                    />
                    <span className={sel.repricingEnabled ? "text-emerald-300" : "text-white/45"}>
                      {sel.repricingEnabled ? "Activo" : "Pausado"}
                    </span>
                  </div>
                </div>
                <Toggle on={sel.repricingEnabled} disabled={pending} onClick={toggle} />
              </div>

              {/* ── Estrategia de reprecio ── */}
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  Estrategia
                </div>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as Strategy)}
                  disabled={pending}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                >
                  <option value="BUYBOX">Ganar Buy Box (bajar del competidor)</option>
                  <option value="MATCH">Igualar al competidor</option>
                  <option value="FIXED">Precio fijo</option>
                  <option value="MARGIN">Por margen (coste + beneficio)</option>
                </select>

                {(strategy === "BUYBOX" || strategy === "MARGIN") && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">
                        Bajar por
                      </span>
                      <select
                        value={undType}
                        onChange={(e) => setUndType(e.target.value as UndercutType)}
                        disabled={pending}
                        className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                      >
                        <option value="AMOUNT">Importe €</option>
                        <option value="PERCENT">Porcentaje %</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">
                        {undType === "PERCENT" ? "%" : "€"}
                      </span>
                      <input
                        value={undVal}
                        onChange={(e) => setUndVal(e.target.value)}
                        inputMode="decimal"
                        placeholder={undType === "PERCENT" ? "2" : "0,01"}
                        disabled={pending}
                        className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                      />
                    </label>
                  </div>
                )}

                {strategy === "FIXED" && (
                  <label className="mt-3 block">
                    <span className="text-[10px] uppercase tracking-wider text-white/40">
                      Precio fijo €
                    </span>
                    <input
                      value={fixedP}
                      onChange={(e) => setFixedP(e.target.value)}
                      inputMode="decimal"
                      placeholder="0,00"
                      disabled={pending}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                    />
                  </label>
                )}

                {strategy === "MARGIN" && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">
                        Coste €
                      </span>
                      <input value={cost} onChange={(e) => setCost(e.target.value)}
                        inputMode="decimal" placeholder="0,00" disabled={pending}
                        className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none" />
                    </label>
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">
                        Comis. %
                      </span>
                      <input value={feeP} onChange={(e) => setFeeP(e.target.value)}
                        inputMode="decimal" placeholder="15" disabled={pending}
                        className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none" />
                    </label>
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">
                        Margen %
                      </span>
                      <input value={tMargin} onChange={(e) => setTMargin(e.target.value)}
                        inputMode="decimal" placeholder="10" disabled={pending}
                        className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none" />
                    </label>
                  </div>
                )}

                {strategy !== "FIXED" && (
                  <label className="mt-3 block">
                    <span className="text-[10px] uppercase tracking-wider text-white/40">
                      Sin competencia
                    </span>
                    <select
                      value={noComp}
                      onChange={(e) => setNoComp(e.target.value as NoComp)}
                      disabled={pending}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                    >
                      <option value="MAX">Subir al máximo</option>
                      <option value="HOLD">Mantener precio</option>
                    </select>
                  </label>
                )}

                <button
                  onClick={saveStrategy}
                  disabled={pending}
                  className="mt-3 w-full rounded-lg border border-cyan-400/40 text-cyan-200 py-2 text-sm font-semibold hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
                >
                  {pending ? "Guardando…" : "Guardar estrategia"}
                </button>
              </div>
            </>
          )}

            {err && (
              <p className="mt-4 text-xs text-red-300 rounded-lg border border-red-400/25 bg-red-500/10 p-2.5">
                {err}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({
  on,
  disabled,
  onClick,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
        on ? "bg-emerald-500 shadow-[0_0_14px_-2px_rgba(16,185,129,0.7)]" : "bg-white/15"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function ZoomBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="h-9 w-9 grid place-items-center rounded-lg border border-white/15 bg-[rgba(8,8,20,0.7)] backdrop-blur text-white/80 text-lg leading-none hover:bg-white/10 hover:text-white transition-colors"
    >
      {children}
    </button>
  );
}
