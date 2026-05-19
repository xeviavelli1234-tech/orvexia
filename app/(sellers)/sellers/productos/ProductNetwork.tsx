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
  breakEvenPrice,
  minPriceForMargin,
  profitAt,
  type CostInputs,
} from "@/lib/reprice/margin";
import { parseTags } from "@/lib/tags";
import {
  updateListingRangeAction,
  toggleListingAction,
  updateListingStrategyAction,
  updateListingCompetitionAction,
  updateListingTagsAction,
  pauseAllAction,
} from "./actions";

type Strategy = "BUYBOX" | "MATCH" | "FIXED" | "MARGIN";
type UndercutType = "AMOUNT" | "PERCENT";
type NoComp = "MAX" | "HOLD" | "STEP_UP";
type Fulfillment = "ANY" | "FBA" | "FBM";
type BuyBox = "UNKNOWN" | "WON" | "LOST";

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
  tags: string;
  strategy: Strategy;
  undercutType: UndercutType;
  undercutValue: number;
  fixedPrice: number | null;
  cost: number | null;
  shippingCost: number | null;
  fbaFee: number | null;
  vatRate: number | null;
  feePercent: number | null;
  targetMargin: number | null;
  noCompetition: NoComp;
  useAccountDefaults: boolean;
  ignoreAmazon: boolean;
  fulfillmentFilter: Fulfillment;
  minSellerRating: number | null;
  buyBoxStatus: BuyBox;
  stepUpType: UndercutType;
  stepUpValue: number;
  lastReason: string | null;
  lastSuccess: boolean | null;
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

type State =
  | "noprice"
  | "paused"
  | "error"
  | "lost"
  | "floor"
  | "won"
  | "active";

/** Estado del nodo por prioridad: error/Buy Box perdida es lo más urgente. */
function nodeState(n: NetNode): State {
  if (n.priceCurrent <= 0 || !n.asin) return "noprice";
  if (!n.repricingEnabled) return "paused";
  if (n.lastSuccess === false) return "error";
  if (n.buyBoxStatus === "LOST") return "lost";
  if (
    n.lastReason === "min_floor" ||
    n.lastReason === "margin_floor" ||
    n.lastReason === "max_ceiling"
  )
    return "floor";
  if (n.buyBoxStatus === "WON") return "won";
  return "active";
}
const STATE_COLOR: Record<
  State,
  { stroke: string; halo: string; dot?: string }
> = {
  won: { stroke: "rgba(52,211,153,0.95)", halo: "rgba(52,211,153,0.85)", dot: "#34d399" },
  active: { stroke: "rgba(34,211,238,0.9)", halo: "rgba(34,211,238,0.55)", dot: "#22d3ee" },
  floor: { stroke: "rgba(251,191,36,0.95)", halo: "rgba(251,191,36,0.6)", dot: "#fbbf24" },
  lost: { stroke: "rgba(248,113,113,0.95)", halo: "rgba(248,113,113,0.6)", dot: "#f87171" },
  error: { stroke: "rgba(249,115,22,0.95)", halo: "rgba(249,115,22,0.55)", dot: "#fb923c" },
  paused: { stroke: "rgba(96,165,250,0.7)", halo: "rgba(99,102,241,0.4)" },
  noprice: { stroke: "rgba(160,160,180,0.4)", halo: "rgba(120,120,140,0.25)" },
};
const LIVE_CORE: ReadonlySet<State> = new Set<State>(["won", "active", "floor"]);
const STATE_LABEL: Array<{ st: State; label: string }> = [
  { st: "won", label: "Buy Box ganada" },
  { st: "lost", label: "Buy Box perdida" },
  { st: "error", label: "Error de reprecio" },
  { st: "floor", label: "En precio mínimo / techo" },
  { st: "active", label: "Repreciando (sin datos aún)" },
  { st: "paused", label: "Configurable / pausado" },
  { st: "noprice", label: "Sin oferta o ASIN en Amazon" },
];

function pnum(s: string): number {
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function CostField({
  label,
  value,
  set,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        inputMode="decimal"
        placeholder={placeholder}
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
      />
    </label>
  );
}

function Row({
  k,
  v,
  warn,
  accent,
}: {
  k: string;
  v: string;
  warn?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/45">{k}</span>
      <span
        className={`font-mono font-semibold tabular-nums ${
          warn ? "text-amber-300" : accent ? "text-cyan-200" : "text-white/85"
        }`}
      >
        {v}
      </span>
    </div>
  );
}

function errMsg(code: string): string {
  const m: Record<string, string> = {
    price_max_must_be_greater_or_equal_to_min: "El máximo debe ser ≥ al mínimo",
    missing_price_range: "Define mín y máx primero",
    listing_not_repriceable: "Sin precio/ASIN en Amazon: no se puede repreciar",
    fixed_price_required: "Indica un precio fijo válido",
    cost_required: "Indica el coste del producto",
    invalid_undercut: "Valor de ajuste no válido",
    invalid_rating: "La valoración mínima debe estar entre 0 y 5",
    listing_not_found_or_not_owned: "Producto no encontrado",
    unauthorized: "Sesión expirada",
    validation_failed: "Datos inválidos",
  };
  return m[code] ?? code;
}

export default function ProductNetwork({ nodes }: { nodes: NetNode[] }) {
  const router = useRouter();
  const [selId, setSelId] = useState<string | null>(null);
  const [hubOpen, setHubOpen] = useState(false);
  const [showStates, setShowStates] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [strategy, setStrategy] = useState<Strategy>("BUYBOX");
  const [undType, setUndType] = useState<UndercutType>("AMOUNT");
  const [undVal, setUndVal] = useState("0.01");
  const [fixedP, setFixedP] = useState("");
  const [cost, setCost] = useState("");
  const [ship, setShip] = useState("");
  const [fba, setFba] = useState("");
  const [vat, setVat] = useState("21");
  const [feeP, setFeeP] = useState("15");
  const [tMargin, setTMargin] = useState("10");
  const [noComp, setNoComp] = useState<NoComp>("MAX");
  const [stepUType, setStepUType] = useState<UndercutType>("AMOUNT");
  const [stepUVal, setStepUVal] = useState("0.05");
  const [tags, setTags] = useState("");
  const [useAccDef, setUseAccDef] = useState(false);
  const [ignoreAmz, setIgnoreAmz] = useState(true);
  const [fulfil, setFulfil] = useState<Fulfillment>("ANY");
  const [minRating, setMinRating] = useState("");

  // ── Viewport (pan / zoom) ──────────────────────────────────
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ active: boolean; sx: number; sy: number; ox: number; oy: number; moved: boolean }>(
    { active: false, sx: 0, sy: 0, ox: 0, oy: 0, moved: false },
  );
  const suppressClick = useRef(false);
  const panRaf = useRef<number | null>(null);
  const pendingPan = useRef<{ x: number; y: number } | null>(null);

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

  // Red de seguridad: pase lo que pase (soltar fuera, perder foco, abrir
  // un overlay…) el pan nunca queda atascado bloqueando los clics.
  useEffect(() => {
    const reset = () => {
      drag.current.active = false;
    };
    window.addEventListener("pointerup", reset);
    window.addEventListener("pointercancel", reset);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("pointerup", reset);
      window.removeEventListener("pointercancel", reset);
      window.removeEventListener("blur", reset);
    };
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    // Nuevo gesto SIEMPRE limpio: si `moved` quedaba en true de un
    // pan anterior, el pointerup de un clic limpio sobre un nodo volvía
    // a activar suppressClick y open() se comía ese clic (el bug real:
    // "a veces va, a veces deja de ir del todo" tras panear/zoom).
    drag.current.moved = false;

    // Solo botón primario. El click derecho/medio abría un "pan" que nunca
    // recibía pointerup (sale el menú contextual) → drag fantasma atascado.
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
    // NO usamos setPointerCapture: si se pierde el pointerup (abrir overlay,
    // soltar fuera, etc.) la captura quedaba pegada al SVG y TODOS los
    // clics dejaban de llegar a los nodos hasta recargar.
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d.active) return;
    const a = toVB(e.clientX, e.clientY);
    const b = toVB(d.sx, d.sy);
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 8) d.moved = true;
    // Coalescer: como máximo un setView por frame (no por evento) → mucho
    // menos re-render y paneo más fluido.
    pendingPan.current = { x: d.ox + (a.x - b.x), y: d.oy + (a.y - b.y) };
    if (panRaf.current == null) {
      panRaf.current = requestAnimationFrame(() => {
        panRaf.current = null;
        const p = pendingPan.current;
        if (p) setView((v) => clampView({ k: v.k, x: p.x, y: p.y }));
      });
    }
  }
  function onPointerUp() {
    if (panRaf.current != null) {
      cancelAnimationFrame(panRaf.current);
      panRaf.current = null;
    }
    const p = pendingPan.current;
    if (drag.current.active && p) setView((v) => clampView({ k: v.k, x: p.x, y: p.y }));
    pendingPan.current = null;
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

    // Colocación inicial: espiral áurea (reparte las ramas).
    const P = nodes.map((node, i) => {
      const g = i * 2.39996323;
      const rr = HUB_GAP + maxR * Math.sqrt((i + 0.4) / Math.max(n, 1));
      const jx = (hash(node.id + "x") - 0.5) * 44;
      const jy = (hash(node.id + "y") - 0.5) * 40;
      return {
        x: hx + Math.cos(g) * rr * 1.5 + jx,
        y: hy + Math.sin(g) * rr + jy,
      };
    });

    // Relajación: separa los nodos para que NUNCA se solapen entre sí
    // ni invadan el icono central (repulsión por pares + empuje del hub).
    const MIN = 156; // distancia mínima entre centros (nodo + holgura etiqueta)
    const HUB_CLEAR = HUB_GAP + R + 14;
    const ITER = n > 1 ? Math.min(160, 60 + n * 4) : 0;

    // Zona reservada bajo el hub para el dock de herramientas
    // (mismas constantes que el bloque SVG → siempre sincronizado).
    const T_HR = 54;
    const T_SR = 22;
    const T_GAP = 160;
    const T_N = 4;
    const T_PADX = 48;
    const T_SY = hy + T_HR + 120;
    const T_LEFT = hx - ((T_N - 1) / 2) * T_GAP - T_SR - T_PADX;
    const T_W = (T_N - 1) * T_GAP + 2 * (T_SR + T_PADX);
    const T_TOP = T_SY - T_SR - 30;
    const T_H = T_SR * 2 + 78;
    const T_MARGIN = R + 20;
    const boxX0 = T_LEFT - T_MARGIN;
    const boxX1 = T_LEFT + T_W + T_MARGIN;
    const boxY0 = T_TOP - T_MARGIN;
    const boxY1 = T_TOP + T_H + T_MARGIN;

    for (let it = 0; it < ITER; it++) {
      for (let a = 0; a < P.length; a++) {
        const dx = P[a].x - hx;
        const dy = P[a].y - hy;
        const d = Math.hypot(dx, dy) || 1;
        if (d < HUB_CLEAR) {
          const f = HUB_CLEAR - d;
          P[a].x += (dx / d) * f;
          P[a].y += (dy / d) * f;
        }
        // Expulsa de la zona del dock por el borde más cercano.
        if (
          P[a].x > boxX0 &&
          P[a].x < boxX1 &&
          P[a].y > boxY0 &&
          P[a].y < boxY1
        ) {
          const toL = P[a].x - boxX0;
          const toR = boxX1 - P[a].x;
          const toT = P[a].y - boxY0;
          const toB = boxY1 - P[a].y;
          const mn = Math.min(toL, toR, toT, toB);
          if (mn === toL) P[a].x = boxX0;
          else if (mn === toR) P[a].x = boxX1;
          else if (mn === toT) P[a].y = boxY0;
          else P[a].y = boxY1;
        }
        for (let b = a + 1; b < P.length; b++) {
          const ex = P[b].x - P[a].x;
          const ey = P[b].y - P[a].y;
          const dd = Math.hypot(ex, ey) || 1;
          if (dd < MIN) {
            const f = (MIN - dd) / 2;
            const ux = ex / dd;
            const uy = ey / dd;
            P[a].x -= ux * f;
            P[a].y -= uy * f;
            P[b].x += ux * f;
            P[b].y += uy * f;
          }
        }
        P[a].x = Math.max(minX, Math.min(maxX, P[a].x));
        P[a].y = Math.max(minY, Math.min(maxY, P[a].y));
      }
    }

    const pos = nodes.map((node, i) => ({ ...node, x: P[i].x, y: P[i].y }));
    return { hub: { x: hx, y: hy }, pos };
  }, [nodes]);

  const sel = nodes.find((x) => x.id === selId) ?? null;

  // Calculadora de costes/margen en vivo (estrategia MARGIN).
  const costCalc = useMemo(() => {
    const pf = (s: string) => {
      const n = Number.parseFloat(s.replace(",", "."));
      return Number.isFinite(n) ? n : 0;
    };
    const c: CostInputs = {
      cost: pf(cost),
      shipping: pf(ship),
      fbaFee: pf(fba),
      referralPct: pf(feeP) || 15,
      vatPct: feeP === "" && vat === "" ? 21 : pf(vat),
    };
    if (!(c.cost > 0)) return null;
    const breakEven = breakEvenPrice(c);
    const minRec = minPriceForMargin(c, pf(tMargin));
    const atCurrent =
      sel && sel.priceCurrent > 0 ? profitAt(sel.priceCurrent, c) : null;
    return { breakEven, minRec, atCurrent };
  }, [cost, ship, fba, vat, feeP, tMargin, sel]);

  const fmtEur = (n: number) => n.toFixed(2).replace(".", ",") + " €";

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
    setShip(n.shippingCost != null ? String(n.shippingCost) : "");
    setFba(n.fbaFee != null ? String(n.fbaFee) : "");
    setVat(n.vatRate != null ? String(n.vatRate) : "21");
    setFeeP(n.feePercent != null ? String(n.feePercent) : "15");
    setTMargin(n.targetMargin != null ? String(n.targetMargin) : "10");
    setNoComp(n.noCompetition);
    setStepUType(n.stepUpType);
    setStepUVal(String(n.stepUpValue ?? 0.05));
    setTags(n.tags ?? "");
    setUseAccDef(n.useAccountDefaults);
    setIgnoreAmz(n.ignoreAmazon);
    setFulfil(n.fulfillmentFilter);
    setMinRating(n.minSellerRating != null ? String(n.minSellerRating) : "");
  }

  function saveTags() {
    if (!sel) return;
    setErr(null);
    const fd = new FormData();
    fd.set("listingId", sel.id);
    fd.set("tags", tags);
    startTransition(async () => {
      const r = await updateListingTagsAction(fd);
      if (!r.ok) setErr(errMsg(r.error));
      else router.refresh();
    });
  }

  function saveCompetition() {
    if (!sel) return;
    setErr(null);
    const fd = new FormData();
    fd.set("listingId", sel.id);
    fd.set("useAccountDefaults", String(useAccDef));
    fd.set("ignoreAmazon", String(ignoreAmz));
    fd.set("fulfillmentFilter", fulfil);
    fd.set("minSellerRating", minRating.trim());
    startTransition(async () => {
      const r = await updateListingCompetitionAction(fd);
      if (!r.ok) setErr(errMsg(r.error));
      else router.refresh();
    });
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
    fd.set("shippingCost", ship.trim());
    fd.set("fbaFee", fba.trim());
    fd.set("vatRate", vat.trim());
    fd.set("feePercent", feeP.trim());
    fd.set("targetMargin", tMargin.trim());
    fd.set("noCompetition", noComp);
    fd.set("stepUpType", stepUType);
    fd.set("stepUpValue", stepUVal.trim() || "0.05");
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
  const selState = sel ? nodeState(sel) : "paused";

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

          {/* Nodo central: icono de Amazon (clic → mostrar/ocultar tools) */}
          {(() => {
            const h = layout.hub;
            const HR = 54;
            const w = HR * 1.15;
            return (
              <g
                className="hex-node"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (suppressClick.current) {
                    suppressClick.current = false;
                    return;
                  }
                  setHubOpen((v) => !v);
                }}
              >
                <title>
                  {hubOpen
                    ? "Ocultar herramientas"
                    : "Pulsa para ver las herramientas (Catálogo, Rentabilidad, Cuenta…)"}
                </title>
                <circle cx={h.x} cy={h.y} r={HR + 16} fill="transparent" />
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

                {/* Indicador de que el icono es clicable → abre opciones */}
                <g className={hubOpen ? undefined : "hub-breathe"}>
                  <rect
                    x={h.x - 74}
                    y={h.y + HR + 30}
                    width={148}
                    height={24}
                    rx={12}
                    fill="rgba(255,153,0,0.10)"
                    stroke="rgba(255,153,0,0.55)"
                    strokeWidth="1"
                  />
                  <text
                    x={h.x}
                    y={h.y + HR + 46}
                    textAnchor="middle"
                    fontSize="11.5"
                    fontWeight={700}
                    fill="rgba(255,179,71,0.95)"
                  >
                    {hubOpen ? "▲  Ocultar opciones" : "▼  Pulsa: opciones"}
                  </text>
                </g>
              </g>
            );
          })()}


          {/* Ramas del hub → herramientas (solo al pulsar el icono Amazon) */}
          {hubOpen &&
            (() => {
            const h = layout.hub;
            const HR = 54;
            const SR = 22;
            const tools: Array<{
              key: string;
              label: string;
              rgb: string;
              icon: "list" | "shield" | "pause" | "coin";
              ev: string;
              panic?: boolean;
            }> = [
              { key: "cat", label: "Catálogo", rgb: "125,211,252", icon: "list", ev: "orvexia:open-catalog" },
              { key: "profit", label: "Rentabilidad", rgb: "52,211,153", icon: "coin", ev: "orvexia:open-profit" },
              { key: "set", label: "Cuenta", rgb: "165,180,252", icon: "shield", ev: "orvexia:open-settings" },
              { key: "panic", label: "Pausar todo", rgb: "248,113,113", icon: "pause", ev: "", panic: true },
            ];
            const n = tools.length;
            const GAP = 160;
            const SY = h.y + HR + 120; // centro Y de los iconos
            const cx = (i: number) => h.x + (i - (n - 1) / 2) * GAP;
            const dockPadX = 48;
            const dockLeft = cx(0) - SR - dockPadX;
            const dockW = (n - 1) * GAP + 2 * (SR + dockPadX);
            const dockTop = SY - SR - 30;
            const dockH = SR * 2 + 78;
            const stem = `M${h.x},${h.y + HR} L${h.x},${dockTop}`;
            return (
              <g>
                {/* Conector hub → dock: un único trazo, sin cruces */}
                <path
                  d={stem}
                  fill="none"
                  stroke="rgba(125,211,252,0.28)"
                  strokeWidth="1.4"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  className="net-flow"
                  d={stem}
                  fill="none"
                  stroke="rgba(125,211,252,0.6)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                {/* Panel que agrupa las herramientas (evita que se
                    mezclen visualmente con la red de productos) */}
                <g className="tool-in">
                  <rect
                    x={dockLeft}
                    y={dockTop}
                    width={dockW}
                    height={dockH}
                    rx={26}
                    fill="rgba(8,9,20,0.92)"
                    stroke="rgba(255,255,255,0.09)"
                    strokeWidth="1"
                  />
                  <text
                    x={h.x}
                    y={dockTop + 19}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight={700}
                    letterSpacing="2.5"
                    fill="rgba(255,255,255,0.32)"
                  >
                    HERRAMIENTAS
                  </text>
                </g>
                {tools.map((t, i) => {
                  const SX = cx(i);
                  return (
                    <g
                      key={t.key}
                      className="tool-in"
                      style={{ "--td": `${0.06 + i * 0.06}s` } as CSSProperties}
                    >
                      <g
                        className="hex-node"
                        onClick={() => {
                          if (suppressClick.current) {
                            suppressClick.current = false;
                            return;
                          }
                          if (t.panic) {
                            if (
                              window.confirm(
                                "¿Pausar el reprecio de TODOS los productos?",
                              )
                            ) {
                              startTransition(async () => {
                                await pauseAllAction();
                                router.refresh();
                              });
                            }
                            return;
                          }
                          window.dispatchEvent(new CustomEvent(t.ev));
                        }}
                      >
                        <circle cx={SX} cy={SY} r={SR + 14} fill="transparent" />
                        <circle
                          cx={SX}
                          cy={SY}
                          r={SR + 5}
                          fill="none"
                          stroke={`rgba(${t.rgb},0.45)`}
                          strokeWidth="1.2"
                          filter="url(#glow)"
                        />
                        <circle
                          cx={SX}
                          cy={SY}
                          r={SR}
                          fill="rgba(10,10,24,0.92)"
                          stroke={`rgba(${t.rgb},0.7)`}
                          strokeWidth="1.3"
                        />
                        {t.icon === "shield" && (
                          <>
                            <path
                              d={`M${SX},${SY - 12} L${SX + 10},${SY - 7} L${SX + 10},${SY + 2} C${SX + 10},${SY + 8} ${SX + 5},${SY + 12} ${SX},${SY + 14} C${SX - 5},${SY + 12} ${SX - 10},${SY + 8} ${SX - 10},${SY + 2} L${SX - 10},${SY - 7} Z`}
                              fill="none"
                              stroke={`rgb(${t.rgb})`}
                              strokeWidth="1.8"
                              strokeLinejoin="round"
                            />
                            <path
                              d={`M${SX - 4},${SY + 1} L${SX - 1},${SY + 4} L${SX + 5},${SY - 4}`}
                              fill="none"
                              stroke={`rgb(${t.rgb})`}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </>
                        )}
                        {t.icon === "pause" && (
                          <g fill={`rgb(${t.rgb})`}>
                            <rect x={SX - 7} y={SY - 8} width="4.5" height="16" rx="1.2" />
                            <rect x={SX + 2.5} y={SY - 8} width="4.5" height="16" rx="1.2" />
                          </g>
                        )}
                        {t.icon === "list" && (
                          <g stroke={`rgb(${t.rgb})`} strokeWidth="2" strokeLinecap="round">
                            <line x1={SX - 8} y1={SY - 6} x2={SX + 8} y2={SY - 6} />
                            <line x1={SX - 8} y1={SY} x2={SX + 8} y2={SY} />
                            <line x1={SX - 8} y1={SY + 6} x2={SX + 8} y2={SY + 6} />
                          </g>
                        )}
                        {t.icon === "coin" && (
                          <>
                            <circle
                              cx={SX}
                              cy={SY}
                              r={11}
                              fill="none"
                              stroke={`rgb(${t.rgb})`}
                              strokeWidth="1.6"
                            />
                            <text
                              x={SX}
                              y={SY + 0.5}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize="14"
                              fontWeight={800}
                              fill={`rgb(${t.rgb})`}
                            >
                              €
                            </text>
                          </>
                        )}
                        <text
                          x={SX}
                          y={SY + SR + 15}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight={700}
                          fill={`rgba(${t.rgb},0.9)`}
                        >
                          {t.label}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            );
          })()}

          {/* Opciones del producto seleccionado: mini-dock de iconos
              (igual concepto que el hub). Antes de los nodos para que
              los productos queden por encima y no roben el clic. */}
          {(() => {
            if (!selId) return null;
            const p = layout.pos.find((q) => q.id === selId);
            if (!p) return null;
            const hb = layout.hub;
            const dx = p.x - hb.x;
            const dy = p.y - hb.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len; // hacia afuera (alejándose del hub)
            const uy = dy / len;
            const px = -uy; // perpendicular
            const py = ux;
            const SR = 21;
            const OUT = 138; // distancia del producto al centro del dock
            const STEP = 92; // separación entre opciones
            const Cx = p.x + ux * OUT;
            const Cy = p.y + uy * OUT;

            const opts: Array<{
              key: string;
              label: string;
              rgb: string;
              icon: "bars" | "coin" | "pause" | "play";
              onClick: () => void;
            }> = [
              {
                key: "ana",
                label: "Analítica",
                rgb: "125,211,252",
                icon: "bars",
                onClick: () =>
                  window.dispatchEvent(
                    new CustomEvent("orvexia:open-analytics", {
                      detail: { productId: selId },
                    }),
                  ),
              },
              {
                key: "prof",
                label: "Rentabilidad",
                rgb: "52,211,153",
                icon: "coin",
                onClick: () =>
                  window.dispatchEvent(new CustomEvent("orvexia:open-profit")),
              },
              {
                key: "tog",
                label: p.repricingEnabled ? "Pausar" : "Activar",
                rgb: p.repricingEnabled ? "251,191,36" : "52,211,153",
                icon: p.repricingEnabled ? "pause" : "play",
                onClick: () => toggle(),
              },
            ];
            const m = opts.length;

            return (
              <g>
                {opts.map((o, i) => {
                  const off = (i - (m - 1) / 2) * STEP;
                  const SX = Cx + px * off;
                  const SY = Cy + py * off;
                  const branch = `M${p.x},${p.y} Q${(p.x + SX) / 2},${
                    (p.y + SY) / 2
                  } ${SX},${SY}`;
                  return (
                    <g
                      key={o.key}
                      className="tool-in"
                      style={{ "--td": `${0.04 + i * 0.06}s` } as CSSProperties}
                    >
                      <path
                        d={branch}
                        fill="none"
                        stroke={`rgba(${o.rgb},0.26)`}
                        strokeWidth="1.2"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        className="net-flow"
                        d={branch}
                        fill="none"
                        stroke={`rgba(${o.rgb},0.62)`}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      <g
                        className="hex-node"
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          if (suppressClick.current) {
                            suppressClick.current = false;
                            return;
                          }
                          o.onClick();
                        }}
                      >
                        <circle cx={SX} cy={SY} r={SR + 13} fill="transparent" />
                        <circle
                          cx={SX}
                          cy={SY}
                          r={SR + 5}
                          fill="none"
                          stroke={`rgba(${o.rgb},0.45)`}
                          strokeWidth="1.2"
                          filter="url(#glow)"
                        />
                        <circle
                          cx={SX}
                          cy={SY}
                          r={SR}
                          fill="rgba(8,10,22,0.94)"
                          stroke={`rgba(${o.rgb},0.7)`}
                          strokeWidth="1.3"
                        />
                        {o.icon === "bars" && (
                          <g
                            stroke={`rgb(${o.rgb})`}
                            strokeWidth="2.6"
                            strokeLinecap="round"
                          >
                            <line x1={SX - 8} y1={SY + 6} x2={SX - 8} y2={SY + 1} />
                            <line x1={SX} y1={SY + 6} x2={SX} y2={SY - 5} />
                            <line x1={SX + 8} y1={SY + 6} x2={SX + 8} y2={SY - 2} />
                          </g>
                        )}
                        {o.icon === "coin" && (
                          <>
                            <circle
                              cx={SX}
                              cy={SY}
                              r={10}
                              fill="none"
                              stroke={`rgb(${o.rgb})`}
                              strokeWidth="1.5"
                            />
                            <text
                              x={SX}
                              y={SY + 0.5}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize="13"
                              fontWeight={800}
                              fill={`rgb(${o.rgb})`}
                            >
                              €
                            </text>
                          </>
                        )}
                        {o.icon === "pause" && (
                          <g fill={`rgb(${o.rgb})`}>
                            <rect x={SX - 7} y={SY - 8} width="4.5" height="16" rx="1.2" />
                            <rect x={SX + 2.5} y={SY - 8} width="4.5" height="16" rx="1.2" />
                          </g>
                        )}
                        {o.icon === "play" && (
                          <path
                            d={`M${SX - 6},${SY - 8} L${SX + 8},${SY} L${SX - 6},${SY + 8} Z`}
                            fill={`rgb(${o.rgb})`}
                          />
                        )}
                        <text
                          x={SX}
                          y={SY + SR + 15}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight={700}
                          fill={`rgba(${o.rgb},0.9)`}
                        >
                          {o.label}
                        </text>
                      </g>
                    </g>
                  );
                })}
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
                    fill={LIVE_CORE.has(st) ? "url(#coreOn)" : "url(#coreAmb)"} />
                )}
                {col.dot && (
                  <circle cx={p.x + R - 6} cy={p.y - R + 6} r="4.5" fill={col.dot} filter="url(#glow)" />
                )}
                <text x={p.x} y={p.y + R + 17} textAnchor="middle" fontSize="13" fontWeight={600}
                  fill="rgba(255,255,255,0.85)">{clip(p.title, 22)}</text>
                <text x={p.x} y={p.y + R + 34} textAnchor="middle" fontSize="12.5" fontWeight={700}
                  fill={p.priceCurrent > 0 ? "#7dd3fc" : "rgba(180,180,200,0.6)"}
                  className={p.priceCurrent > 0 ? "text-glow-cyan" : undefined}>
                  {p.priceCurrent > 0 ? `${fmt(p.priceCurrent)} ${sym(p.currency)}` : "Sin precio"}
                </text>
                {!active && (
                  <text
                    x={p.x}
                    y={p.y + R + 48}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight={700}
                    fill="rgba(255,255,255,0.32)"
                  >
                    ▼ opciones
                  </text>
                )}
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
        <ZoomBtn
          label="Ver leyenda de colores de estado"
          onClick={() => setShowStates((v) => !v)}
        >
          <span className="text-[13px] leading-none">🎨</span>
        </ZoomBtn>
      </div>

      {/* Leyenda visual de estados: muestra exactamente cada color. */}
      {showStates && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 fade-in">
          <div className="rounded-2xl border border-white/12 bg-[rgba(8,9,20,0.94)] backdrop-blur-xl px-4 py-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)]">
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-white/10">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
                Colores de estado
              </span>
              <button
                type="button"
                onClick={() => setShowStates(false)}
                aria-label="Cerrar"
                className="h-6 w-6 grid place-items-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors leading-none"
              >
                ×
              </button>
            </div>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {STATE_LABEL.map(({ st, label }) => {
                const c = STATE_COLOR[st];
                return (
                  <div key={st} className="flex items-center gap-2.5">
                    <svg width="30" height="30" viewBox="0 0 30 30">
                      <polygon
                        points={hexPoints(15, 15, 13)}
                        fill="none"
                        stroke={c.halo}
                        strokeWidth="2"
                      />
                      <polygon
                        points={hexPoints(15, 15, 9)}
                        fill="rgba(8,8,20,0.85)"
                        stroke={c.stroke}
                        strokeWidth="1.5"
                      />
                      {c.dot && <circle cx="22" cy="8" r="3" fill={c.dot} />}
                    </svg>
                    <span className="text-[12px] text-white/80">{label}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2.5 text-[10px] text-white/35">
              El color del producto cambia solo según su último ciclo de
              reprecio. Pulsa 🎨 para ocultar.
            </p>
          </div>
        </div>
      )}

      {/* Herramientas: ahora como iconos dentro del grafo (bloque SVG). */}
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
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {sel.priceMin != null && sel.priceMax != null && (
                  <span className="text-[11px] text-white/45">
                    Rango {fmt(sel.priceMin)}–{fmt(sel.priceMax)} {sym(sel.currency)}
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    sel.buyBoxStatus === "WON"
                      ? "text-emerald-300 bg-emerald-400/10 border-emerald-400/25"
                      : sel.buyBoxStatus === "LOST"
                        ? "text-red-300 bg-red-500/10 border-red-400/25"
                        : "text-white/45 bg-white/[0.05] border-white/10"
                  }`}
                >
                  Buy Box:{" "}
                  {sel.buyBoxStatus === "WON"
                    ? "ganada"
                    : sel.buyBoxStatus === "LOST"
                      ? "perdida"
                      : "—"}
                </span>
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
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <CostField label="Coste €" value={cost} set={setCost}
                        placeholder="0,00" disabled={pending} />
                      <CostField label="Envío €" value={ship} set={setShip}
                        placeholder="0,00" disabled={pending} />
                      <CostField label="FBA €" value={fba} set={setFba}
                        placeholder="0,00" disabled={pending} />
                      <CostField label="Comis. %" value={feeP} set={setFeeP}
                        placeholder="15" disabled={pending} />
                      <CostField label="IVA %" value={vat} set={setVat}
                        placeholder="21" disabled={pending} />
                      <CostField label="Margen %" value={tMargin} set={setTMargin}
                        placeholder="10" disabled={pending} />
                    </div>

                    {costCalc && (
                      <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] p-3 space-y-1.5 text-[12px]">
                        <Row k="Precio de equilibrio"
                          v={costCalc.breakEven != null
                            ? fmtEur(costCalc.breakEven)
                            : "no rentable"}
                          warn={costCalc.breakEven == null} />
                        <Row k={`Mínimo para ${pnum(tMargin) || 0}% margen`}
                          v={costCalc.minRec != null
                            ? fmtEur(costCalc.minRec)
                            : "no alcanzable"}
                          warn={costCalc.minRec == null} accent />
                        {costCalc.atCurrent && (
                          <Row
                            k={`Margen a ${fmtEur(sel.priceCurrent)} (actual)`}
                            v={`${costCalc.atCurrent.profit
                              .toFixed(2)
                              .replace(".", ",")} € · ${costCalc.atCurrent.marginPct.toFixed(
                              1,
                            )}%`}
                            warn={costCalc.atCurrent.profit < 0}
                          />
                        )}
                        {costCalc.minRec != null && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              setMin(
                                String(
                                  Math.ceil((costCalc.minRec as number) * 100) / 100,
                                ),
                              )
                            }
                            className="mt-1 w-full rounded-md border border-cyan-400/40 text-cyan-200 py-1.5 text-[11px] font-semibold hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
                          >
                            Usar como precio mínimo ↑
                          </button>
                        )}
                        <p className="text-[10px] text-white/35 pt-0.5">
                          Precios con IVA incluido. El motor nunca bajará del
                          mínimo rentable.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {strategy !== "FIXED" && (
                  <>
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
                        <option value="STEP_UP">Subir gradualmente</option>
                      </select>
                    </label>
                    {noComp === "STEP_UP" && (
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-[10px] uppercase tracking-wider text-white/40">
                            Paso por
                          </span>
                          <select
                            value={stepUType}
                            onChange={(e) =>
                              setStepUType(e.target.value as UndercutType)
                            }
                            disabled={pending}
                            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                          >
                            <option value="AMOUNT">Importe €</option>
                            <option value="PERCENT">Porcentaje %</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-[10px] uppercase tracking-wider text-white/40">
                            {stepUType === "PERCENT" ? "% / ciclo" : "€ / ciclo"}
                          </span>
                          <input
                            value={stepUVal}
                            onChange={(e) => setStepUVal(e.target.value)}
                            inputMode="decimal"
                            placeholder={stepUType === "PERCENT" ? "1" : "0,05"}
                            disabled={pending}
                            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                          />
                        </label>
                        <p className="col-span-2 text-[10px] text-white/35">
                          Sin competencia el precio sube este paso cada ciclo
                          hasta el máximo (no salta de golpe).
                        </p>
                      </div>
                    )}
                  </>
                )}

                <button
                  onClick={saveStrategy}
                  disabled={pending}
                  className="mt-3 w-full rounded-lg border border-cyan-400/40 text-cyan-200 py-2 text-sm font-semibold hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
                >
                  {pending ? "Guardando…" : "Guardar estrategia"}
                </button>
              </div>

              {/* ── Etiquetas / grupos ── */}
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  Etiquetas / grupos
                </div>
                {parseTags(tags).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {parseTags(tags).map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[11px] text-cyan-200"
                      >
                        {t}
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            setTags(
                              parseTags(tags)
                                .filter((x) => x !== t)
                                .join(","),
                            )
                          }
                          className="text-cyan-300/70 hover:text-white leading-none"
                          aria-label={`Quitar ${t}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="marca, temporada-alta, liquidación…"
                  disabled={pending}
                  className="mt-2 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-400/60 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-white/35">
                  Separadas por comas. Sirven para filtrar y aplicar acciones
                  por grupo en el catálogo.
                </p>
                <button
                  onClick={saveTags}
                  disabled={pending}
                  className="mt-2 w-full rounded-lg border border-cyan-400/40 text-cyan-200 py-2 text-sm font-semibold hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
                >
                  {pending ? "Guardando…" : "Guardar etiquetas"}
                </button>
              </div>

              {/* ── Competencia ── */}
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  Competencia
                </div>

                <label className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-white/85">Usar ajustes de la cuenta</span>
                  <Toggle on={useAccDef} disabled={pending} onClick={() => setUseAccDef((v) => !v)} />
                </label>
                {useAccDef && (
                  <p className="mt-1 text-[10px] text-white/35">
                    La estrategia se hereda de los ajustes de cuenta.
                  </p>
                )}

                <label className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-white/85">Ignorar Amazon (retail)</span>
                  <Toggle on={ignoreAmz} disabled={pending} onClick={() => setIgnoreAmz((v) => !v)} />
                </label>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wider text-white/40">
                      Logística
                    </span>
                    <select
                      value={fulfil}
                      onChange={(e) => setFulfil(e.target.value as Fulfillment)}
                      disabled={pending}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                    >
                      <option value="ANY">Cualquiera</option>
                      <option value="FBA">Solo FBA</option>
                      <option value="FBM">Solo FBM</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wider text-white/40">
                      Valoración mín. (0-5)
                    </span>
                    <input
                      value={minRating}
                      onChange={(e) => setMinRating(e.target.value)}
                      inputMode="decimal"
                      placeholder="sin filtro"
                      disabled={pending}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                    />
                  </label>
                </div>

                <button
                  onClick={saveCompetition}
                  disabled={pending}
                  className="mt-3 w-full rounded-lg border border-cyan-400/40 text-cyan-200 py-2 text-sm font-semibold hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
                >
                  {pending ? "Guardando…" : "Guardar competencia"}
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
