"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import WaveField from "./WaveField";
import { parseTags, collectTags } from "@/lib/tags";
import { prettyStrategy } from "@/lib/format/strategy-label";
import {
  updateListingRangeAction,
  toggleListingAction,
  updateListingStrategyAction,
  updateListingCompetitionAction,
  updateListingTagsAction,
  updateListingParentAction,
  pauseAllAction,
} from "./actions";
// Tipos + helpers + subcomponentes — extraídos en /network para
// reducir este archivo monolítico.
import type {
  Strategy,
  UndercutType,
  NoComp,
  Fulfillment,
  BuyBox,
  State,
  NetNode,
} from "./network/types";
import {
  VB_W,
  VB_H,
  R,
  K_MIN,
  K_MAX,
  clampView,
  humanizeSource,
  hexPoints,
  sym,
  clip,
  fmt,
  nodeState,
  STATE_COLOR,
  LIVE_CORE,
  STATE_LABEL,
  pnum,
  diagnose,
  errMsg,
} from "./network/helpers";
import { ZoomBtn } from "./network/Subcomponents";
import Inspector from "./network/Inspector";

// Re-export del tipo público (lo importan page.tsx, LazyOverlays, etc.).
export type { NetNode };

export default function ProductNetwork({
  nodes,
  activeCount,
}: {
  nodes: NetNode[];
  activeCount: number;
}) {
  const router = useRouter();
  const [selId, setSelId] = useState<string | null>(null);
  const [hubOpen, setHubOpen] = useState(false);
  const [showStates, setShowStates] = useState(false);
  const [hideSteps, setHideSteps] = useState(false);
  const [gq, setGq] = useState("");
  const [gState, setGState] = useState<"ALL" | State>("ALL");
  const [gTag, setGTag] = useState("");
  const [mode, setMode] = useState<"graph" | "table">("graph");
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
  const [parentA, setParentA] = useState("");
  const [useAccDef, setUseAccDef] = useState(false);
  const [ignoreAmz, setIgnoreAmz] = useState(true);
  const [fulfil, setFulfil] = useState<Fulfillment>("ANY");
  const [minRating, setMinRating] = useState("");
  const [exclSellers, setExclSellers] = useState("");
  const [onlySell, setOnlySell] = useState("");

  const [repricing, setRepricing] = useState(false);

  // ── Viewport (pan / zoom) ──────────────────────────────────
  const svgRef = useRef<SVGSVGElement | null>(null);
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ active: boolean; sx: number; sy: number; ox: number; oy: number; moved: boolean }>(
    { active: false, sx: 0, sy: 0, ox: 0, oy: 0, moved: false },
  );
  const suppressClick = useRef(false);
  const panRaf = useRef<number | null>(null);
  const parallaxRaf = useRef<number | null>(null);
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

  // Parallax sutil: el contenedor del SVG se desplaza ~10 px en sentido
  // contrario al cursor. Da sensación 3D sin marear. Deferido a rAF para
  // que no compita con el render del grafo y throttleado a 16ms.
  // Solo desktop: en mobile/táctil no hay pointer hover continuo.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 1024) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = parallaxRef.current;
    if (!node) return;
    const onMove = (e: PointerEvent) => {
      // No movemos durante un drag (compite con el pan); el grafo ya se
      // mueve por su cuenta.
      if (drag.current.active) return;
      if (parallaxRaf.current != null) return;
      parallaxRaf.current = requestAnimationFrame(() => {
        parallaxRaf.current = null;
        const r = node.getBoundingClientRect();
        const nx = (e.clientX - r.left - r.width / 2) / r.width; // -0.5..0.5
        const ny = (e.clientY - r.top - r.height / 2) / r.height;
        node.style.setProperty("--mx", `${(-nx * 14).toFixed(2)}px`);
        node.style.setProperty("--my", `${(-ny * 10).toFixed(2)}px`);
      });
    };
    const onLeave = () => {
      node.style.setProperty("--mx", "0px");
      node.style.setProperty("--my", "0px");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    node.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
      if (parallaxRaf.current != null) {
        cancelAnimationFrame(parallaxRaf.current);
        parallaxRaf.current = null;
      }
    };
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
    // ── Layout en anillos por URGENCIA ─────────────────────────────────────
    //
    // Centro = problemas que requieren atención (Buy Box perdida + errores).
    // Anillo medio = productos compitiendo activos (active, en suelo).
    // Anillo externo = todo lo demás (Buy Box ganada, pausados, sin oferta).
    //
    // Dentro de cada anillo, agrupamos por origen (Amazon a la izquierda,
    // resto a la derecha) para que el "color" del hub no se pierda. Un
    // único hub central muestra el conteo por bucket — los hubs por origen
    // se reducen a chips informativos.
    type Bucket = "attention" | "competing" | "calm";
    const BUCKET_OF: Record<State, Bucket> = {
      error: "attention",
      lost: "attention",
      active: "competing",
      floor: "competing",
      won: "calm",
      paused: "calm",
      noprice: "calm",
    };

    // Constantes del layout.
    const CX = VB_W / 2;
    const CY = VB_H / 2;
    const PHASE_BASE = -Math.PI / 2; // arranca arriba

    // Clasificar nodos en buckets respetando el orden recibido.
    const buckets: Record<Bucket, NetNode[]> = {
      attention: [],
      competing: [],
      calm: [],
    };
    for (const n of nodes) {
      buckets[BUCKET_OF[nodeState(n)]].push(n);
    }

    // ── Cap visual del grafo ──────────────────────────────────────────────
    // Con >200 nodos el layout colapsa: hexágonos solapados, GPU al límite,
    // animaciones a tirones. Prioridad: atención completa → compitiendo
    // → calma. Si todavía sobra, recortamos calm (el ojo no pierde nada
    // crítico). La vista Tabla sigue mostrándolos todos sin recorte.
    const VISUAL_CAP = 200;
    const totalNodes =
      buckets.attention.length + buckets.competing.length + buckets.calm.length;
    let truncatedCalm = 0;
    let truncatedCompeting = 0;
    if (totalNodes > VISUAL_CAP) {
      const overflow = totalNodes - VISUAL_CAP;
      if (buckets.calm.length >= overflow) {
        truncatedCalm = overflow;
        buckets.calm = buckets.calm.slice(0, buckets.calm.length - overflow);
      } else {
        truncatedCalm = buckets.calm.length;
        const remainingOverflow = overflow - buckets.calm.length;
        buckets.calm = [];
        truncatedCompeting = Math.min(buckets.competing.length, remainingOverflow);
        buckets.competing = buckets.competing.slice(
          0,
          buckets.competing.length - truncatedCompeting,
        );
      }
    }
    const hiddenCount = truncatedCalm + truncatedCompeting;

    // Sub-clasificar por origen (amazon primero) para que dentro del anillo
    // los Amazon queden agrupados juntos en lugar de alternando con Manual.
    function sortByOrigin(list: NetNode[]): NetNode[] {
      return [...list].sort((a, b) => {
        const oa = a.source === "amazon" ? 0 : 1;
        const ob = b.source === "amazon" ? 0 : 1;
        return oa - ob;
      });
    }

    type Pos = { x: number; y: number; hubId: number };
    const P: Pos[] = new Array(nodes.length);
    const idxOf = new Map<string, number>();
    nodes.forEach((n, i) => idxOf.set(n.id, i));

    // Coloca un bucket en su anillo. Si el bucket está vacío no dibuja nada.
    // hubId codifica el bucket (0=attention, 1=competing, 2=calm) — el menú
    // radial y otros consumidores siguen aceptándolo igual.
    function placeRing(
      list: NetNode[],
      radius: number,
      bucketId: number,
      ringPhase: number,
    ) {
      const sorted = sortByOrigin(list);
      const n = sorted.length;
      if (n === 0) return;
      // Distribución angular adaptativa:
      //  · 1 nodo → arriba del hub.
      //  · 2-3 nodos → "corona" centrada arriba que abraza el hub (evita los
      //    polos opuestos de n=2 y los nodos sueltos y lejanos de n=3 a radio
      //    grande, que dejaban el lienzo medio vacío).
      //  · ≥4 → círculo completo uniforme, como el diseño original (ahora a un
      //    radio que sí cabe en pantalla). Así un anillo de 8 calmas se cierra
      //    en redondo en vez de quedarse en un arco superior.
      const FULL = 2 * Math.PI;
      let angleAt: (i: number) => number;
      if (n <= 3) {
        const desired = (4.8 * R) / Math.max(radius, 1);
        const span = n <= 1 ? 0 : Math.min(FULL * 0.7, n * desired);
        const step = n > 1 ? span / (n - 1) : 0;
        const start = PHASE_BASE + ringPhase - span / 2;
        angleAt = (i) => (n === 1 ? PHASE_BASE + ringPhase : start + i * step);
      } else {
        const step = FULL / n;
        angleAt = (i) => PHASE_BASE + ringPhase + i * step;
      }
      for (let i = 0; i < n; i++) {
        const a = angleAt(i);
        const node = sorted[i];
        P[idxOf.get(node.id)!] = {
          x: CX + Math.cos(a) * radius,
          y: CY + Math.sin(a) * radius,
          hubId: bucketId,
        };
      }
    }

    // ── Radios adaptativos por nº de nodos ────────────────────────────────
    // Los radios fijos (230/470/700) lanzaban 2-5 productos a los polos de
    // una órbita gigante: R_CALM=700 superaba la media-altura útil del lienzo
    // (~457), así que los nodos caían fuera de pantalla y el centro quedaba
    // vacío. Ahora cada anillo POBLADO se reparte de dentro (urgente) hacia
    // fuera (calma): pegado al hub cuando hay pocos, abriéndose en bandas
    // distintas solo cuando hay densidad suficiente para necesitarlo.
    const occupied = [
      { key: "att" as const, n: buckets.attention.length },
      { key: "cmp" as const, n: buckets.competing.length },
      { key: "calm" as const, n: buckets.calm.length },
    ].filter((b) => b.n > 0);
    const ringSlots = occupied.length;
    // Media-altura útil menos el nodo y su etiqueta inferior: ni el hexágono
    // ni el precio que cuelga debajo se salen del lienzo.
    const SAFE = Math.min(CY, VB_H - CY) - (R + 44); // 443
    const HUB_CLEAR = 200; // radio del anillo más interno (despeja el hub)
    const RING_GAP = 2 * R + 39; // 115 px entre anillos consecutivos
    const PITCH = 2.5 * R; // 95 px: separación mínima en anillos densos
    const ringNeed = (n: number) => (n <= 1 ? 0 : (n * PITCH) / (2 * Math.PI));
    const maxNeed = occupied.reduce((mx, b) => Math.max(mx, ringNeed(b.n)), 0);
    // El radio exterior crece con (a) cuántas bandas hay que separar y
    // (b) cuánta circunferencia pide el anillo más poblado — siempre ≤ SAFE.
    const outerR = Math.min(
      SAFE,
      Math.max(HUB_CLEAR + (ringSlots - 1) * RING_GAP, maxNeed),
    );
    const radiusAt = (i: number) =>
      ringSlots <= 1
        ? outerR
        : HUB_CLEAR + ((outerR - HUB_CLEAR) * i) / (ringSlots - 1);
    let R_ATTENTION = 0;
    let R_COMPETING = 0;
    let R_CALM = 0;
    occupied.forEach((b, i) => {
      const r = radiusAt(i);
      if (b.key === "att") R_ATTENTION = r;
      else if (b.key === "cmp") R_COMPETING = r;
      else R_CALM = r;
    });

    // Pequeño desfase por anillo: rompe la alineación radial que cansa al ojo.
    placeRing(buckets.attention, R_ATTENTION, 0, 0);
    placeRing(buckets.competing, R_COMPETING, 1, Math.PI / 14);
    placeRing(buckets.calm,      R_CALM,      2, Math.PI / 22);

    // pos solo incluye los nodos visibles (los recortados por VISUAL_CAP
    // no tienen entrada en P). La tabla y los filtros siguen viendo `nodes`
    // entero — el cap es exclusivamente visual.
    const pos = nodes
      .map((node, i) =>
        P[i]
          ? { ...node, x: P[i].x, y: P[i].y, hubId: P[i].hubId }
          : null,
      )
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // ── Hub virtual único en el centro ───────────────────────────────────
    // Reemplaza los varios hubs (Amazon/Tienda) por un único nodo central
    // con el conteo por urgencia. Los chips por origen se mostrarán como
    // pills pequeños en el toolbar (fuera del canvas) en lugar de
    // hexágonos grandes que ocupaban el centro de la pantalla.
    const hub = {
      id: 0,
      source: "center" as const,
      x: CX,
      y: CY,
      count: nodes.length,
      primary: true,
      sourceFirst: true,
      chunkIndex: 0,
      startIdx: 0,
      prevHubId: null as number | null,
      // metadatos nuevos: cuántos hay en cada bucket
      attentionCount: buckets.attention.length,
      competingCount: buckets.competing.length,
      calmCount: buckets.calm.length,
    };

    // Mantenemos `hubs` como array para compat con el render existente.
    // Solo hay 1 hub real. Los antiguos "Amazon" / "Manual" se reducen a
    // CHIPS que pinta el toolbar.
    const hubs = [hub];

    // ── Resumen de orígenes para los chips del toolbar ───────────────────
    const sourceSummary = new Map<string, number>();
    for (const n of nodes) {
      const k = n.source || "amazon";
      sourceSummary.set(k, (sourceSummary.get(k) ?? 0) + 1);
    }
    const origins = [...sourceSummary.entries()].map(([source, count]) => ({
      source,
      count,
    }));

    return {
      hubs,
      hub,
      pos,
      hiddenCount,
      totalNodes,
      origins,
      bucketCounts: {
        attention: buckets.attention.length,
        competing: buckets.competing.length,
        calm: buckets.calm.length,
      },
      rings: {
        attention: R_ATTENTION,
        competing: R_COMPETING,
        calm: R_CALM,
      },
      cx: CX,
      cy: CY,
    };
  }, [nodes]);

  const sel = nodes.find((x) => x.id === selId) ?? null;

  // ¿El usuario pidió menos movimiento? Lo leemos una vez (memo) para gatear
  // las animaciones SMIL que el bloque CSS @media reduce no alcanza (p.ej. el
  // punto viajero de las líneas de energía).
  const reduceMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // Búsqueda / filtro del grafo: ids que pasan los filtros activos.
  const allTags = useMemo(
    () => collectTags(nodes.map((n) => n.tags)),
    [nodes],
  );
  // Búsqueda con valor diferido: al escribir, el input responde inmediato
  // pero el recálculo del matchSet (potencialmente caro con 200+ productos)
  // espera al siguiente tick libre. Para 16 productos no se nota, para 500
  // sí — preventivo, coste cero.
  const dgq = useDeferredValue(gq);
  const filterActive = dgq.trim() !== "" || gState !== "ALL" || gTag !== "";
  const matchSet = useMemo(() => {
    const q = dgq.trim().toLowerCase();
    const tg = gTag.toLowerCase();
    const ids = new Set<string>();
    for (const n of nodes) {
      if (
        q &&
        !`${n.title} ${n.sku} ${n.asin} ${n.parentAsin}`
          .toLowerCase()
          .includes(q)
      )
        continue;
      if (gState !== "ALL" && nodeState(n) !== gState) continue;
      if (
        tg &&
        !parseTags(n.tags).some((t) => t.toLowerCase() === tg)
      )
        continue;
      ids.add(n.id);
    }
    return ids;
  }, [nodes, dgq, gState, gTag]);

  const fmtEur = (n: number) => n.toFixed(2).replace(".", ",") + " €";
  const { loading: toastLoading, update, dismiss, error: toastError } = useToast();

  async function repriceNow() {
    if (!sel || repricing) return;
    setRepricing(true);
    const tid = toastLoading("Repreciando…", { description: `Consultando competencia para "${sel.title.slice(0, 40)}"…` });
    try {
      const res = await fetch("/api/sellers/reprice/run-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: sel.id }),
      });
      const data = await res.json() as {
        ok?: boolean; error?: string; changed?: boolean; simulated?: boolean;
        priceBefore?: number; priceAfter?: number; competitorPrice?: number | null; reason?: string;
      };
      if (!res.ok || !data.ok) {
        update(tid, { variant: "error", message: "No se pudo repreciar", description: data.error ?? `HTTP ${res.status}` });
        return;
      }
      if (!data.changed) {
        update(tid, { variant: "info", message: "Precio ya óptimo", description: `Sin cambio · Razón: ${data.reason ?? "no_change"}` });
      } else {
        const arrow = data.priceAfter! > data.priceBefore! ? "↑" : "↓";
        const diff = Math.abs(data.priceAfter! - data.priceBefore!).toFixed(2).replace(".", ",");
        update(tid, {
          variant: "success",
          message: `${data.simulated ? "[simulado] " : ""}Precio actualizado ${arrow} ${diff} €`,
          description: `${fmtEur(data.priceBefore!)} → ${fmtEur(data.priceAfter!)}${data.competitorPrice != null ? ` · Competidor: ${fmtEur(data.competitorPrice)}` : ""}`,
        });
      }
      startTransition(() => router.refresh());
    } catch (e) {
      dismiss(tid);
      toastError("Error de red", { description: e instanceof Error ? e.message : "network_error" });
    } finally {
      setRepricing(false);
    }
  }

  function open(n: NetNode) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    // Segundo clic sobre el mismo producto = cerrar sus opciones (toggle),
    // igual que el hub con "Ocultar opciones". Deselecciona y guarda el
    // abanico/inspector.
    if (selId === n.id) {
      setSelId(null);
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
    setParentA(n.parentAsin ?? "");
    setUseAccDef(n.useAccountDefaults);
    setIgnoreAmz(n.ignoreAmazon);
    setFulfil(n.fulfillmentFilter);
    setMinRating(n.minSellerRating != null ? String(n.minSellerRating) : "");
    setExclSellers(n.excludeSellers ?? "");
    setOnlySell(n.onlySellers ?? "");
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

  function saveParent() {
    if (!sel) return;
    setErr(null);
    const fd = new FormData();
    fd.set("listingId", sel.id);
    fd.set("parentAsin", parentA);
    startTransition(async () => {
      const r = await updateListingParentAction(fd);
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
    fd.set("excludeSellers", exclSellers.trim());
    fd.set("onlySellers", onlySell.trim());
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
  const selIsManual = sel?.source === "manual";

  return (
    <div className="absolute inset-0">
      {/* ── Mobile list view (lg-: replaces the heavy SVG/canvas viz) ── */}
      {!sel && (
        <div className="lg:hidden absolute inset-0 overflow-y-auto overscroll-contain p-3 pb-24 bg-[#040513]">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-teal-300/70 mb-2.5 px-1">
            ▸ /productos · {nodes.length}
          </p>
          <ul className="space-y-2">
            {nodes.map((n) => {
              const st = nodeState(n);
              const color =
                st === "won" ? "bg-emerald-400" :
                st === "active" ? "bg-teal-400" :
                st === "floor" ? "bg-amber-400" :
                st === "lost" ? "bg-red-400" :
                st === "error" ? "bg-orange-500" :
                st === "noprice" ? "bg-slate-500" :
                "bg-teal-400";
              const stLabel =
                st === "won" ? "Buy Box" :
                st === "active" ? "Repreciando" :
                st === "floor" ? "En mínimo" :
                st === "lost" ? "BB perdida" :
                st === "error" ? "Error" :
                st === "noprice" ? "Sin oferta" :
                "Pausado";
              const range =
                n.priceMin != null && n.priceMax != null
                  ? `${fmt(n.priceMin)}–${fmt(n.priceMax)} ${sym(n.currency)}`
                  : "sin rango";
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setSelId(n.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.025] hover:border-teal-400/30 active:scale-[0.985] active:bg-white/[0.05] transition-all text-left"
                  >
                    <div className="h-12 w-12 shrink-0 rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden grid place-items-center">
                      {n.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={n.imageUrl} alt="" className="h-full w-full object-contain" loading="lazy" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-white/30 text-xs">—</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
                        <span className="text-[10px] font-mono-ui uppercase tracking-wider text-white/55 truncate">
                          {stLabel}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-white/90 leading-tight line-clamp-2">
                        {n.title}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] tabular">
                        <span className="font-mono font-bold text-white/85">
                          {n.priceCurrent > 0 ? `${fmt(n.priceCurrent)} ${sym(n.currency)}` : "—"}
                        </span>
                        <span className="text-white/25">·</span>
                        <span className="text-white/50 truncate">{range}</span>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-white/35 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div
        ref={parallaxRef}
        className={`graph-parallax hidden lg:block absolute inset-y-0 left-0 right-0 transition-[right] duration-300 ${
          sel ? "sm:right-[380px]" : ""
        }`}
      >
      {/* Fondo animado — atenuado al 55% para que los nodos sean los
          protagonistas. Antes el WaveField competía visualmente con los
          hexágonos cuando había >20 productos en escena. */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.44]">
        <WaveField />
      </div>
      {/* Viñeta muy suave solo en los bordes (centro despejado). El stop
          transparente empieza antes (50%) para oscurecer un poco más cerca
          del hub y que los nodos despeguen del fondo. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(2,2,12,0.5))]" />

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
          {/* Fondo del panel de herramientas: degradado vertical sutil que da
              relieve frente al fondo plano anterior. */}
          <linearGradient id="dockGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12142c" stopOpacity="0.97" />
            <stop offset="100%" stopColor="#070812" stopOpacity="0.97" />
          </linearGradient>
          {/* Sombra suave para despegar el panel del grafo (que está lleno). */}
          <filter id="dockShadow" x="-30%" y="-35%" width="160%" height="175%">
            <feDropShadow
              dx="0"
              dy="10"
              stdDeviation="16"
              floodColor="#04050c"
              floodOpacity="0.6"
            />
          </filter>
          <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Glow ajustado para puntos pequeños (dots de estado, punto
              viajero): con stdDeviation=6 se hinchaban hasta convertirse en
              manchas. Aquí 2.2 los deja "encendidos" pero nítidos. */}
          <filter id="glow-sm" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
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
          {/* ── Anillos visuales por urgencia ─────────────────────────────
              Antes pintábamos spokes hub→nodo (líneas curvas para cada
              producto). Ahora el LAYOUT mismo es la información: tres
              anillos concéntricos por bucket. Dibujamos los anillos como
              tres circles tenues y las etiquetas en el lado izq fuera del
              clutter. El ojo entiende en 1s qué requiere atención. */}
          {(() => {
            const { cx, cy, rings, bucketCounts } = layout;
            const rs: Array<{
              key: string;
              spin: string;
              r: number;
              stroke: string;
              dot: string;
              label: string;
              count: number;
            }> = [
              {
                key: "att",
                spin: "ring-spin-1",
                r: rings.attention,
                stroke: "rgba(248,113,113,0.36)",
                dot: "#f87171",
                label: "Atención",
                count: bucketCounts.attention,
              },
              {
                key: "cmp",
                spin: "ring-spin-2",
                r: rings.competing,
                stroke: "rgba(45,212,191,0.28)",
                dot: "#2dd4bf",
                label: "Compitiendo",
                count: bucketCounts.competing,
              },
              {
                key: "calm",
                spin: "ring-spin-3",
                r: rings.calm,
                stroke: "rgba(52,211,153,0.22)",
                dot: "#34d399",
                label: "Calma",
                count: bucketCounts.calm,
              },
            ];
            return (
              <g>
                {/* Solo anillos poblados: con 2 productos no pintamos tres
                    aros vacíos anidados, sino el único aro que orbitan. La
                    clase de giro va por identidad de bucket (no por índice)
                    para que un aro suelto conserve su velocidad. */}
                {rs.filter((ring) => ring.count > 0).map((ring) => (
                  <circle
                    key={`ring-${ring.key}`}
                    className={ring.spin}
                    cx={cx}
                    cy={cy}
                    r={ring.r}
                    fill="none"
                    stroke={ring.stroke}
                    strokeWidth="1.4"
                    strokeDasharray="6 14"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            );
          })()}

          {/* ── Radios tenues hub → nodo ──────────────────────────────────
              Devuelven al grafo la lectura de "red": antes los nodos
              flotaban como islas desconectadas, sobre todo con pocos
              productos. Son líneas estáticas (sin animación) → coste por
              frame cero, y van bajo los nodos para no interceptar clics.
              Los nodos de atención ya reciben su línea de energía animada
              encima, así que no duplicamos su radio. */}
          {layout.pos
            .filter((p) => p.hubId !== 0)
            .map((p) => (
              <line
                key={`spk-${p.id}`}
                x1={layout.cx}
                y1={layout.cy}
                x2={p.x}
                y2={p.y}
                stroke={
                  p.hubId === 1
                    ? "rgba(45,212,191,0.13)"
                    : "rgba(94,234,212,0.10)"
                }
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}

          {/* ── Líneas de energía centro → nodos en estado crítico ────────
              Conectan el hub central con cada nodo del bucket "atención".
              Una línea tenue + un punto luminoso que viaja del centro al
              nodo (efecto "el problema viene a por ti"). Solo si hay
              urgencias — si todo está OK, no se pinta nada. */}
          {layout.pos
            .filter((p) => p.hubId === 0)
            .map((p) => {
              const d = `M${layout.cx},${layout.cy} L${p.x},${p.y}`;
              return (
                <g key={`energy-${p.id}`}>
                  <path
                    d={d}
                    className="energy-line"
                    stroke="rgba(248,113,113,0.6)"
                    strokeWidth="1.4"
                    strokeDasharray="3 6"
                    strokeLinecap="round"
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* El punto viajero respeta prefers-reduced-motion: si está
                      activo, lo dejamos fijo en el nodo (la pista de color se
                      conserva, el movimiento perpetuo no). */}
                  {reduceMotion ? (
                    <circle cx={p.x} cy={p.y} r={3} fill="#f87171" filter="url(#glow-sm)" />
                  ) : (
                    <circle r={3} fill="#f87171" filter="url(#glow-sm)">
                      <animateMotion
                        dur="2.2s"
                        repeatCount="indefinite"
                        path={d}
                        keyPoints="0;1"
                        keyTimes="0;1"
                        calcMode="linear"
                      />
                    </circle>
                  )}
                </g>
              );
            })}

          {/* Hub único central: ya no es un nodo "Amazon" gigante. Es el
              ancla del grafo en anillos. Muestra el conteo total de
              productos y, si hay urgentes, los destaca en rojo. Sigue
              siendo el punto de entrada al dock de herramientas. */}
          {layout.hubs.map((hubInfo) => {
            const h = { x: hubInfo.x, y: hubInfo.y };
            const HR = 48;
            const attentionCount = hubInfo.attentionCount ?? 0;
            const hasUrgent = attentionCount > 0;
            // Color del anillo central: rojo si hay urgentes, neutro si todo OK.
            const stroke = hasUrgent ? "#f87171" : "#5EEAD4";
            const ringStroke = hasUrgent
              ? "rgba(248,113,113,0.55)"
              : "rgba(94,234,212,0.55)";
            const breatheStroke = hasUrgent
              ? "rgba(248,113,113,0.45)"
              : "rgba(94,234,212,0.45)";
            return (
              <g
                key={`hub-${hubInfo.id}`}
                className="hex-node"
                style={{ cursor: hubInfo.primary ? "pointer" : "default" }}
                onClick={
                  hubInfo.primary
                    ? () => {
                        if (suppressClick.current) {
                          suppressClick.current = false;
                          return;
                        }
                        setHubOpen((v) => !v);
                      }
                    : undefined
                }
              >
                <title>
                  {hubInfo.primary
                    ? hubOpen
                      ? "Ocultar herramientas"
                      : "Centro de control · pulsa para ver herramientas"
                    : "Centro"}
                </title>
                <circle cx={h.x} cy={h.y} r={HR + 16} fill="transparent" />
                <circle
                  className="hub-ring"
                  cx={h.x}
                  cy={h.y}
                  r={HR + 12}
                  fill="none"
                  stroke={ringStroke}
                  strokeWidth="1.6"
                  strokeDasharray="3 10"
                  strokeLinecap="round"
                />
                <circle
                  className={hasUrgent ? "urgent-pulse" : "hub-breathe"}
                  cx={h.x}
                  cy={h.y}
                  r={HR + 6}
                  fill="none"
                  stroke={breatheStroke}
                  strokeWidth="1.4"
                  filter="url(#glow)"
                />
                <circle
                  cx={h.x}
                  cy={h.y}
                  r={HR}
                  fill="rgba(10,9,16,0.95)"
                  stroke={stroke}
                  strokeWidth="2"
                />
                {/* Contenido del centro: si hay urgentes, los grita en rojo.
                    Si todo OK, muestra el conteo total con tono verde. */}
                {hasUrgent ? (
                  <>
                    <text
                      x={h.x}
                      y={h.y - 4}
                      textAnchor="middle"
                      fontSize="28"
                      fontWeight={900}
                      fill="#f87171"
                      style={{
                        filter: "drop-shadow(0 0 8px rgba(248,113,113,0.6))",
                        fontVariantNumeric: "tabular-nums",
                        fontFamily: "var(--font-mono, ui-monospace, monospace)",
                      }}
                    >
                      {attentionCount}
                    </text>
                    <text
                      x={h.x}
                      y={h.y + 14}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight={700}
                      fill="rgba(248,113,113,0.85)"
                      letterSpacing="1.5"
                    >
                      ATENCIÓN
                    </text>
                  </>
                ) : (
                  <>
                    <text
                      x={h.x}
                      y={h.y - 2}
                      textAnchor="middle"
                      fontSize="22"
                      fontWeight={800}
                      fill="#5EEAD4"
                      style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
                    >
                      {hubInfo.count}
                    </text>
                    <text
                      x={h.x}
                      y={h.y + 14}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight={700}
                      fill="rgba(110,231,219,0.7)"
                      letterSpacing="1.2"
                    >
                      TODO OK
                    </text>
                  </>
                )}

                {/* Chip "Pulsa: opciones" debajo del centro. */}
                {hubInfo.primary && (
                  <g className={hubOpen ? undefined : "hub-breathe"}>
                    <rect
                      x={h.x - 64}
                      y={h.y + HR + 14}
                      width={128}
                      height={22}
                      rx={11}
                      fill={hasUrgent ? "rgba(248,113,113,0.10)" : "rgba(94,234,212,0.10)"}
                      stroke={hasUrgent ? "rgba(248,113,113,0.45)" : "rgba(94,234,212,0.45)"}
                      strokeWidth="1"
                    />
                    <text
                      x={h.x}
                      y={h.y + HR + 29}
                      textAnchor="middle"
                      fontSize="10.5"
                      fontWeight={700}
                      letterSpacing="0.3"
                      fill={
                        hasUrgent
                          ? "rgba(254,202,202,0.95)"
                          : "rgba(110,231,219,0.95)"
                      }
                    >
                      {hubOpen ? "Ocultar opciones ▲" : "Ver opciones ▼"}
                    </text>
                  </g>
                )}
              </g>
            );
          })}


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
            // Rejilla 2×2 centrada bajo el hub: más compacta y equilibrada que
            // una fila de 4 (la mitad de ancho, lectura tipo paleta). Canales
            // iguales en ambos ejes; el icono va centrado en su celda.
            const GUT = 18; // canal entre celdas (igual en X e Y)
            const TW = 134; // ancho de celda
            const tileTopOff = SR + 17; // margen por encima del icono
            const tileBotOff = SR + 29; // margen por debajo (cubre la etiqueta)
            const TH = tileTopOff + tileBotOff; // alto de celda (90)
            const COLGAP = TW + GUT; // separación horizontal centro-centro
            const ROWGAP = TH + GUT; // separación vertical centro-centro
            const topRowY = h.y + HR + 114; // centro Y de la fila superior
            const colOf = (i: number) => i % 2;
            const rowOf = (i: number) => Math.floor(i / 2);
            const SXof = (i: number) => h.x + (colOf(i) - 0.5) * COLGAP;
            const SYof = (i: number) => topRowY + rowOf(i) * ROWGAP;
            // Panel contenedor.
            const padX = 18;
            const headZone = 32; // banda superior para el rótulo
            const botPad = 16;
            const dockLeft = h.x - COLGAP / 2 - TW / 2 - padX;
            const dockW = COLGAP + TW + 2 * padX;
            const dockTop = topRowY - tileTopOff - headZone;
            const dockH = ROWGAP + tileTopOff + tileBotOff + headZone + botPad;
            const stem = `M${h.x},${h.y + HR} L${h.x},${dockTop}`;
            return (
              <g>
                {/* Conector hub → dock: un único trazo, sin cruces */}
                <path
                  d={stem}
                  fill="none"
                  stroke="rgba(94,234,212,0.28)"
                  strokeWidth="1.4"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  className="net-flow"
                  d={stem}
                  fill="none"
                  stroke="rgba(94,234,212,0.6)"
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
                    rx={28}
                    fill="url(#dockGrad)"
                    stroke="rgba(255,255,255,0.10)"
                    strokeWidth="1"
                    filter="url(#dockShadow)"
                  />
                  {/* filo superior iluminado → sensación de relieve/cristal */}
                  <rect
                    x={dockLeft + 1}
                    y={dockTop + 1}
                    width={dockW - 2}
                    height={dockH - 2}
                    rx={27}
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                  <circle
                    cx={dockLeft + 20}
                    cy={dockTop + 18}
                    r="2.6"
                    fill="rgba(94,234,212,0.9)"
                    filter="url(#glow)"
                  />
                  <text
                    x={dockLeft + 30}
                    y={dockTop + 21.5}
                    fontSize="9.5"
                    fontWeight={700}
                    letterSpacing="2.5"
                    fill="rgba(255,255,255,0.42)"
                  >
                    HERRAMIENTAS
                  </text>
                </g>
                {tools.map((t, i) => {
                  const SX = SXof(i);
                  const SY = SYof(i);
                  const tileX = SX - TW / 2;
                  const tileY = SY - tileTopOff;
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
                        {/* Celda tintada con el color de la herramienta: la
                            convierte en una paleta y separa visualmente la
                            acción destructiva (Pausar todo → celda roja). */}
                        <rect
                          x={tileX}
                          y={tileY}
                          width={TW}
                          height={TH}
                          rx={16}
                          fill={`rgba(${t.rgb},0.06)`}
                          stroke={`rgba(${t.rgb},0.20)`}
                          strokeWidth="1"
                        />
                        {/* Capa de brillo que aparece al pasar el cursor. */}
                        <rect
                          className="tool-tile-hi"
                          x={tileX}
                          y={tileY}
                          width={TW}
                          height={TH}
                          rx={16}
                          fill={`rgba(${t.rgb},0.13)`}
                          stroke={`rgba(${t.rgb},0.55)`}
                          strokeWidth="1.2"
                        />
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

          {/* Nodos */}
          {layout.pos.map((p, i) => {
            const st = nodeState(p);
            const col = STATE_COLOR[st];
            const active = selId === p.id;
            const dim = filterActive && !matchSet.has(p.id);
            // Stagger por bucket: atención (hubId=0) entra primero (más
            // urgencia visual), compitiendo después, calma al final. Dentro
            // del bucket, un pequeño desfase por índice para que parezca
            // que "salen del centro" en lugar de aparecer todos a la vez.
            const bucketOrder = p.hubId === 0 ? 0 : p.hubId === 1 ? 1 : 2;
            const popDelay = bucketOrder * 0.18 + (i % 6) * 0.04;
            return (
              <g
                key={p.id}
                data-bucket={p.hubId}
                className="node-float node-pop"
                style={
                  {
                    "--d": `${3.6 + (i % 5) * 0.5}s`,
                    "--dl": `${(i % 7) * 0.45}s`,
                    "--node-delay": `${popDelay}s`,
                    opacity: dim ? 0.1 : 1,
                    pointerEvents: dim ? "none" : undefined,
                    transition: "opacity .25s ease",
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
                  <circle cx={p.x + R - 6} cy={p.y - R + 6} r="4.5" fill={col.dot} filter="url(#glow-sm)" />
                )}
                {/* Badge de origen: pequeño marcador en la esquina inferior
                    izquierda del hexágono. Naranja = Amazon, cyan = Tu
                    tienda (manual). Sub-info sin gritar; no conflictúa con
                    el dot de estado (esquina opuesta). */}
                {(() => {
                  const isAmz = p.source !== "manual";
                  const fill = isAmz ? "#FF9900" : "#5EEAD4";
                  return (
                    <g>
                      <circle
                        cx={p.x - R + 7}
                        cy={p.y + R - 7}
                        r={5.5}
                        fill="rgba(8,8,20,0.95)"
                        stroke={fill}
                        strokeWidth="1.4"
                      />
                      {isAmz ? (
                        // letra "a" minimalista para Amazon, centrada en el disco
                        <text
                          x={p.x - R + 7}
                          y={p.y + R - 7}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="7.5"
                          fontWeight={800}
                          fill={fill}
                        >
                          a
                        </text>
                      ) : (
                        // diamante para Tu tienda (manual)
                        <path
                          d={`M${p.x - R + 7},${p.y + R - 10} L${p.x - R + 10},${p.y + R - 7} L${p.x - R + 7},${p.y + R - 4} L${p.x - R + 4},${p.y + R - 7} Z`}
                          fill={fill}
                        />
                      )}
                    </g>
                  );
                })()}
                {/* Etiquetas: solo en el nodo seleccionado, o en hover via CSS.
                    Antes salían en TODOS los nodos → mucho ruido visual con >20
                    productos. Ahora el canvas respira y se distingue el estado
                    de cada nodo a primera vista por su color/halo. */}
                <g className="node-label" style={{ opacity: active ? 1 : 0 }}>
                  <text x={p.x} y={p.y + R + 17} textAnchor="middle" fontSize="13" fontWeight={600}
                    fill="rgba(255,255,255,0.92)">{clip(p.title, 22)}</text>
                  <text x={p.x} y={p.y + R + 34} textAnchor="middle" fontSize="12.5" fontWeight={700}
                    fill={p.priceCurrent > 0 ? "#7dd3fc" : "rgba(180,180,200,0.6)"}
                    className={p.priceCurrent > 0 ? "text-glow-sm" : undefined}
                    style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono, ui-monospace, monospace)" }}>
                    {p.priceCurrent > 0 ? `${fmt(p.priceCurrent)} ${sym(p.currency)}` : "Sin precio"}
                  </text>
                </g>
                </g>
              </g>
            );
          })}

          {/* ── Menú radial de opciones: siempre encima de todo ────────────
               3 iconos en abanico colocados en el cuadrante con MENOS vecinos.
               Antes el abanico salía siempre en dirección hub→nodo, lo que
               solapaba con productos vecinos cuando el nodo seleccionado
               estaba en el centro del cluster. Ahora buscamos el ángulo que
               maximiza la distancia mínima a los nodos cercanos. */}
          {(() => {
            if (!selId) return null;
            const pd = layout.pos.find((q) => q.id === selId);
            if (!pd) return null;
            const selSt = nodeState(pd);
            const selCol = STATE_COLOR[selSt];

            const opts: Array<{
              key: string; label: string; rgb: string;
              icon: "bars" | "coin" | "pause" | "play"; onClick: () => void;
            }> = [
              { key: "ana", label: "Analítica", rgb: "125,211,252", icon: "bars",
                onClick: () => window.dispatchEvent(new CustomEvent("orvexia:open-analytics", { detail: { productId: selId } })) },
              { key: "tog",
                label: pd.repricingEnabled ? "Pausar" : "Activar",
                rgb: pd.repricingEnabled ? "251,191,36" : "52,211,153",
                icon: pd.repricingEnabled ? "pause" : "play",
                onClick: () => toggle() },
              { key: "prof", label: "Rentabilidad", rgb: "52,211,153", icon: "coin",
                onClick: () => window.dispatchEvent(new CustomEvent("orvexia:open-profit")) },
            ];

            // ── Geometría del dock de opciones ────────────────────────────
            // Panel rectangular (mismo material que HERRAMIENTAS) colocado
            // JUNTO al nodo, nunca encima. Un abanico radial respaldado por un
            // rectángulo dejaba siempre una esquina vacía sobre el propio nodo;
            // un dock con desplazamiento lo evita por construcción.
            const padX = 16, padTop = 12, padBottom = 14;
            const headerH = 24;
            const tileH = 52, tileGap = 10;
            const panelW = 214;
            const tileW = panelW - 2 * padX;
            const panelH =
              padTop + headerH + opts.length * tileH +
              (opts.length - 1) * tileGap + padBottom;

            // ── Lado del nodo donde colocar el panel ──────────────────────
            // Probamos los 4 lados y elegimos el que cabe en pantalla, queda
            // más lejos de los vecinos y no es "abajo" (donde cuelga el
            // título/precio del nodo).
            const NODE_CLEAR = R + 30; // despeja hexágono + anillo de selección
            const GAP = 16;
            const off = NODE_CLEAR + GAP;
            const MARGIN = 20; // margen del panel al borde del lienzo
            const sides = [
              { x: pd.x + off,          y: pd.y - panelH / 2,   bias: 0 },
              { x: pd.x - off - panelW, y: pd.y - panelH / 2,   bias: 0 },
              { x: pd.x - panelW / 2,   y: pd.y - off - panelH, bias: -50 },
              { x: pd.x - panelW / 2,   y: pd.y + off,          bias: -400 },
            ];
            const neigh = layout.pos.filter(
              (q) => q.id !== pd.id && Math.hypot(q.x - pd.x, q.y - pd.y) < 420,
            );
            let bestSide = sides[0];
            let bestScore = -Infinity;
            for (const s of sides) {
              const cx = s.x + panelW / 2;
              const cy = s.y + panelH / 2;
              const corners: Array<[number, number]> = [
                [s.x, s.y],
                [s.x + panelW, s.y],
                [s.x, s.y + panelH],
                [s.x + panelW, s.y + panelH],
              ];
              let outside = 0;
              for (const [px, py] of corners) {
                if (px < MARGIN || px > VB_W - MARGIN || py < MARGIN || py > VB_H - MARGIN)
                  outside++;
              }
              let minD = Infinity;
              for (const n of neigh) {
                const d = Math.hypot(n.x - cx, n.y - cy);
                if (d < minD) minD = d;
              }
              const clear = neigh.length ? minD : 9999;
              const score = clear + s.bias - outside * 6000;
              if (score > bestScore) {
                bestScore = score;
                bestSide = s;
              }
            }
            // Garantizamos que el panel quede entero dentro del lienzo.
            const panelX = Math.max(MARGIN, Math.min(VB_W - MARGIN - panelW, bestSide.x));
            const panelY = Math.max(MARGIN, Math.min(VB_H - MARGIN - panelH, bestSide.y));
            const tilesTop = panelY + padTop + headerH;

            // ── Conector nodo → panel (rayo recortado al borde del panel) ──
            const pcx = panelX + panelW / 2;
            const pcy = panelY + panelH / 2;
            const sang = Math.atan2(pcy - pd.y, pcx - pd.x);
            const stemX1 = pd.x + Math.cos(sang) * (R + 10);
            const stemY1 = pd.y + Math.sin(sang) * (R + 10);
            const sdx = pcx - pd.x;
            const sdy = pcy - pd.y;
            const ts: number[] = [];
            if (sdx !== 0)
              for (const X of [panelX, panelX + panelW]) {
                const t = (X - pd.x) / sdx;
                const y = pd.y + t * sdy;
                if (t > 0 && y >= panelY - 1 && y <= panelY + panelH + 1) ts.push(t);
              }
            if (sdy !== 0)
              for (const Y of [panelY, panelY + panelH]) {
                const t = (Y - pd.y) / sdy;
                const x = pd.x + t * sdx;
                if (t > 0 && x >= panelX - 1 && x <= panelX + panelW + 1) ts.push(t);
              }
            const te = ts.length ? Math.min(...ts) : 0;
            const stemX2 = pd.x + te * sdx;
            const stemY2 = pd.y + te * sdy;

            return (
              <g>
                {/* Doble anillo de selección — color del estado del nodo.
                    El externo gira despacio (hub-ring), el interno respira
                    (select-breathe). */}
                <circle cx={pd.x} cy={pd.y} r={R + 26}
                  fill="none" stroke={selCol.halo} strokeWidth="2.6"
                  strokeDasharray="7 5" className="hub-ring" filter="url(#glow)" />
                <circle cx={pd.x} cy={pd.y} r={R + 15}
                  fill="none" stroke={selCol.stroke} strokeWidth="1.6"
                  filter="url(#glow)" className="select-breathe" />
                {/* Ripple: anillo que se expande al seleccionar (key={selId}
                    fuerza remount → reproduce la animación en cada cambio). */}
                <circle
                  key={selId}
                  cx={pd.x}
                  cy={pd.y}
                  r={R + 8}
                  fill="none"
                  stroke={selCol.dot ?? selCol.stroke}
                  strokeWidth="2.5"
                  className="node-ripple"
                />

                {/* Conector nodo → panel (mismo lenguaje que el tallo hub→dock:
                    trazo tenue + flujo de datos animado). */}
                <line x1={stemX1} y1={stemY1} x2={stemX2} y2={stemY2}
                  stroke={selCol.halo} strokeWidth="1.4"
                  vectorEffect="non-scaling-stroke" />
                <line x1={stemX1} y1={stemY1} x2={stemX2} y2={stemY2}
                  className="net-flow" stroke={selCol.stroke} strokeWidth="1.6"
                  strokeLinecap="round" vectorEffect="non-scaling-stroke" />

                {/* Dock de opciones del producto — colocado al lado del nodo,
                    nunca encima. Mismo material/recipe que HERRAMIENTAS. */}
                <g className="tool-in">
                  <rect x={panelX} y={panelY} width={panelW} height={panelH} rx={24}
                    fill="url(#dockGrad)" stroke="rgba(255,255,255,0.10)"
                    strokeWidth="1" filter="url(#dockShadow)" />
                  {/* Filo superior iluminado → relieve de cristal */}
                  <rect x={panelX + 1} y={panelY + 1} width={panelW - 2} height={panelH - 2}
                    rx={23} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  {/* Cabecera, como "HERRAMIENTAS" en el dock del hub */}
                  <circle cx={panelX + 20} cy={panelY + padTop + 9} r="2.6"
                    fill={selCol.dot ?? "rgba(94,234,212,0.9)"} filter="url(#glow-sm)" />
                  <text x={panelX + 30} y={panelY + padTop + 12.5} fontSize="9.5"
                    fontWeight={700} letterSpacing="2.5" fill="rgba(255,255,255,0.45)">
                    OPCIONES
                  </text>

                  {opts.map((o, i) => {
                    const tileX = panelX + padX;
                    const tileY = tilesTop + i * (tileH + tileGap);
                    const icx = tileX + 26;
                    const icy = tileY + tileH / 2;
                    return (
                      <g
                        key={o.key}
                        className="opt-tile"
                        onClick={() => {
                          if (suppressClick.current) { suppressClick.current = false; return; }
                          o.onClick();
                        }}
                      >
                        {/* Celda tintada con el color de la opción */}
                        <rect x={tileX} y={tileY} width={tileW} height={tileH} rx={14}
                          fill={`rgba(${o.rgb},0.06)`} stroke={`rgba(${o.rgb},0.20)`} strokeWidth="1" />
                        {/* Realce al pasar el cursor */}
                        <rect className="tool-tile-hi" x={tileX} y={tileY} width={tileW}
                          height={tileH} rx={14} fill={`rgba(${o.rgb},0.13)`}
                          stroke={`rgba(${o.rgb},0.55)`} strokeWidth="1.2" />
                        {/* Disco del icono */}
                        <circle cx={icx} cy={icy} r={16} fill="rgba(4,5,16,0.85)"
                          stroke={`rgba(${o.rgb},0.7)`} strokeWidth="1.4" />
                        {o.icon === "bars" && (
                          <g stroke={`rgb(${o.rgb})`} strokeWidth="2.2" strokeLinecap="round">
                            <line x1={icx - 7} y1={icy + 6} x2={icx - 7} y2={icy + 1} />
                            <line x1={icx}     y1={icy + 6} x2={icx}     y2={icy - 6} />
                            <line x1={icx + 7} y1={icy + 6} x2={icx + 7} y2={icy - 2} />
                          </g>
                        )}
                        {o.icon === "coin" && (
                          <>
                            <circle cx={icx} cy={icy} r={9} fill="none"
                              stroke={`rgb(${o.rgb})`} strokeWidth="1.6" />
                            <text x={icx} y={icy + 0.5} textAnchor="middle"
                              dominantBaseline="central" fontSize="12" fontWeight={800}
                              fill={`rgb(${o.rgb})`}>€</text>
                          </>
                        )}
                        {o.icon === "pause" && (
                          <g fill={`rgb(${o.rgb})`}>
                            <rect x={icx - 6}   y={icy - 7} width="4.5" height="14" rx="1.2" />
                            <rect x={icx + 1.5} y={icy - 7} width="4.5" height="14" rx="1.2" />
                          </g>
                        )}
                        {o.icon === "play" && (
                          <path d={`M${icx - 5},${icy - 7} L${icx + 8},${icy} L${icx - 5},${icy + 7} Z`}
                            fill={`rgb(${o.rgb})`} />
                        )}
                        {/* Etiqueta */}
                        <text x={icx + 30} y={icy} dominantBaseline="central"
                          fontSize="13" fontWeight={700} fill={`rgba(${o.rgb},0.95)`}>
                          {o.label}
                        </text>
                        {/* Chevron: afford "abre algo" */}
                        <path d={`M${tileX + tileW - 20},${icy - 5} l5,5 l-5,5`}
                          fill="none" stroke={`rgba(${o.rgb},0.5)`} strokeWidth="1.6"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </g>
                    );
                  })}
                </g>
              </g>
            );
          })()}

        </g>
      </svg>

      {/* Aviso de cap visual: si el grafo está mostrando solo los más
          relevantes, lo dejamos claro y damos un atajo a la Tabla (que
          no tiene cap). Por debajo de 200 productos esto no aparece. */}
      {layout.hiddenCount > 0 && mode === "graph" && (
        <div className="absolute bottom-3 left-3 z-20 max-w-md rounded-xl border border-amber-400/30 bg-[rgba(20,15,5,0.85)] px-3 py-2 backdrop-blur-xl text-[11px] text-amber-200/90">
          Mostrando {layout.totalNodes - layout.hiddenCount} de{" "}
          <strong className="text-amber-100">{layout.totalNodes}</strong>{" "}
          productos (priorizamos atención).{" "}
          <button
            type="button"
            onClick={() => setMode("table")}
            className="underline underline-offset-2 hover:text-amber-100"
          >
            Ver todos en Tabla →
          </button>
        </div>
      )}

      {/* Búsqueda / filtro del grafo */}
      {nodes.length > 0 && (
        <div
          id="tour-toolbar"
          className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 rounded-xl border border-white/12 bg-[rgba(8,9,20,0.92)] px-2.5 py-2 backdrop-blur-xl shadow-[0_18px_50px_-18px_rgba(0,0,0,0.8)] max-w-[calc(100%-1.5rem)] lg:max-w-[820px]"
        >
          <div className="flex overflow-hidden rounded-lg border border-white/15">
            {(["graph", "table"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  mode === m
                    ? "bg-teal-400/20 text-teal-200"
                    : "text-white/55 hover:bg-white/10"
                }`}
              >
                {m === "graph" ? "Grafo" : "Tabla"}
              </button>
            ))}
          </div>
          <input
            value={gq}
            onChange={(e) => setGq(e.target.value)}
            placeholder="Buscar título / SKU / ASIN…"
            className="w-44 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:border-teal-400/60 focus:outline-none"
          />
          <select
            value={gState}
            onChange={(e) => setGState(e.target.value as "ALL" | State)}
            className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-[12px] text-white focus:border-teal-400/60 focus:outline-none"
          >
            <option value="ALL">Todos los estados</option>
            {STATE_LABEL.map(({ st, label }) => (
              <option key={st} value={st}>
                {label}
              </option>
            ))}
          </select>
          {allTags.length > 0 && (
            <select
              value={gTag}
              onChange={(e) => setGTag(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-[12px] text-white focus:border-teal-400/60 focus:outline-none"
            >
              <option value="">Todas las etiquetas</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          <span className="px-1 text-[11px] font-mono text-white/45">
            {filterActive ? `${matchSet.size}/${nodes.length}` : nodes.length}
          </span>
          {filterActive && (
            <button
              type="button"
              onClick={() => {
                setGq("");
                setGState("ALL");
                setGTag("");
              }}
              className="rounded-lg border border-white/15 px-2 py-1.5 text-[11px] text-white/60 hover:bg-white/10 transition-colors"
            >
              Limpiar
            </button>
          )}
          {/* Leyenda de los 3 buckets (solo en modo Grafo). Vive dentro del
              toolbar para que NUNCA se solape con nodos del canvas. Cada
              chip filtra por estado al hacer clic. */}
          {mode === "graph" && (
            <div className="ml-1 flex items-center gap-1.5 border-l border-white/10 pl-2.5 max-lg:ml-0 max-lg:w-full max-lg:border-l-0 max-lg:border-t max-lg:border-white/10 max-lg:pl-0 max-lg:mt-1.5 max-lg:pt-1.5">
              {[
                {
                  key: "att" as const,
                  label: "Atención",
                  count: layout.hub.attentionCount,
                  dot: "#f87171",
                  cls: "border-red-400/30 bg-red-500/[0.08] text-red-300",
                  numCls: "text-red-200",
                  states: ["error", "lost"] as State[],
                },
                {
                  key: "cmp" as const,
                  label: "Compitiendo",
                  count: layout.hub.competingCount,
                  dot: "#2dd4bf",
                  cls: "border-teal-400/25 bg-teal-400/[0.06] text-teal-300",
                  numCls: "text-teal-200",
                  states: ["active", "floor"] as State[],
                },
                {
                  key: "calm" as const,
                  label: "Calma",
                  count: layout.hub.calmCount,
                  dot: "#34d399",
                  cls: "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-300",
                  numCls: "text-emerald-200",
                  states: ["won", "paused", "noprice"] as State[],
                },
              ].map((b) => {
                const isActiveFilter = b.states.includes(gState as State);
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() =>
                      setGState(isActiveFilter ? "ALL" : b.states[0])
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border ${b.cls} px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] transition-opacity ${
                      b.count === 0 ? "opacity-40" : "hover:opacity-80"
                    } ${isActiveFilter ? "ring-1 ring-white/50" : ""}`}
                    title={`Filtrar por ${b.label.toLowerCase()}`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{
                        background: b.dot,
                        boxShadow:
                          b.count > 0 ? `0 0 6px ${b.dot}` : undefined,
                      }}
                    />
                    <span>{b.label}</span>
                    <span
                      className={`font-mono font-extrabold tabular-nums ${b.numCls}`}
                    >
                      {b.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Vista de tabla (alternativa al grafo) — estilo Linear/Notion:
          thumbnail + título + meta + badges densos. Headers sticky, hover
          row con highlight de borde izq y "drift" sutil del fondo. */}
      {mode === "table" && (
        <div className="absolute inset-0 z-10 overflow-auto bg-[#05060f] pt-16 px-3 sm:px-6 pb-6">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 z-10 bg-[rgba(5,6,15,0.96)] backdrop-blur text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
              <tr className="border-b border-white/10">
                <th className="py-3 pl-3 pr-2 w-[44%]">Producto</th>
                <th className="py-3 px-2 whitespace-nowrap">Precio</th>
                <th className="py-3 px-2 whitespace-nowrap hidden sm:table-cell">
                  Rango
                </th>
                <th className="py-3 px-2 hidden lg:table-cell">Estrategia</th>
                <th className="py-3 px-2 hidden md:table-cell">Buy Box</th>
                <th className="py-3 px-2">Estado</th>
                <th className="py-3 px-2 text-right pr-3">Reprecio</th>
              </tr>
            </thead>
            <tbody>
              {nodes
                .filter((n) => !filterActive || matchSet.has(n.id))
                .map((p) => {
                  const st = nodeState(p);
                  const c = STATE_COLOR[st];
                  const lbl =
                    STATE_LABEL.find((x) => x.st === st)?.label ?? st;
                  const isActive = selId === p.id;
                  const tags = parseTags(p.tags);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => open(p)}
                      className={`group border-b border-white/[0.05] cursor-pointer transition-colors ${
                        isActive
                          ? "bg-teal-400/[0.07]"
                          : "hover:bg-white/[0.035]"
                      }`}
                      style={{
                        boxShadow: isActive
                          ? "inset 3px 0 0 0 rgb(45,212,191)"
                          : undefined,
                      }}
                    >
                      {/* Producto: thumbnail + título + sku + tags */}
                      <td className="py-2.5 pl-3 pr-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-10 w-10 shrink-0 rounded-md border border-white/10 bg-white/[0.04] overflow-hidden grid place-items-center">
                            {p.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.imageUrl}
                                alt=""
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: c.dot ?? "#666" }}
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-white/90 font-medium">
                              {p.title}
                            </div>
                            <div className="mt-0.5 font-mono text-[10px] text-white/35 truncate">
                              {p.sku} · {p.asin || "sin ASIN"}
                            </div>
                            {tags.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {tags.slice(0, 4).map((t) => (
                                  <span
                                    key={t}
                                    className="rounded-md border border-teal-400/20 bg-teal-400/[0.08] px-1.5 py-0.5 text-[9px] text-teal-200/90"
                                  >
                                    {t}
                                  </span>
                                ))}
                                {tags.length > 4 && (
                                  <span className="text-[9px] text-white/30">
                                    +{tags.length - 4}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Precio */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {p.priceCurrent > 0 ? (
                          <span className="font-mono font-semibold text-white/95 tabular-nums">
                            {fmt(p.priceCurrent)} {sym(p.currency)}
                          </span>
                        ) : (
                          <span className="font-mono text-white/30">—</span>
                        )}
                      </td>

                      {/* Rango mín/máx */}
                      <td className="py-2.5 px-2 hidden sm:table-cell whitespace-nowrap">
                        {p.priceMin != null && p.priceMax != null ? (
                          <span className="font-mono text-[12px] text-white/55 tabular-nums">
                            {fmt(p.priceMin)}
                            <span className="text-white/25 mx-1">–</span>
                            {fmt(p.priceMax)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-300/70">
                            sin rango
                          </span>
                        )}
                      </td>

                      {/* Estrategia legible */}
                      <td className="py-2.5 px-2 hidden lg:table-cell">
                        {p.useAccountDefaults ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-white/55">
                            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                            Defaults cuenta
                          </span>
                        ) : (
                          <span className="text-[12px] text-white/70">
                            {prettyStrategy(p.strategy)}
                          </span>
                        )}
                      </td>

                      {/* Buy Box */}
                      <td className="py-2.5 px-2 hidden md:table-cell">
                        {p.buyBoxStatus === "WON" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                            ★ ganada
                          </span>
                        ) : p.buyBoxStatus === "LOST" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-400/25 bg-red-500/[0.08] px-2 py-0.5 text-[10px] font-semibold text-red-300">
                            perdida
                            {p.buyBoxPrice ? (
                              <span className="font-mono text-[9.5px] text-red-200/70 tabular-nums">
                                {fmt(p.buyBoxPrice)} {sym(p.currency)}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-[11px] text-white/30">—</span>
                        )}
                      </td>

                      {/* Estado del nodo (pill con color) */}
                      <td className="py-2.5 px-2">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
                          style={{
                            color: c.dot ?? "rgba(255,255,255,0.7)",
                            borderColor: c.halo,
                            background: `${c.halo.replace(/,[^)]+\)$/, ",0.08)")}`,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              background: c.dot ?? "rgba(255,255,255,0.4)",
                            }}
                          />
                          {lbl}
                        </span>
                      </td>

                      {/* Toggle reprecio */}
                      <td
                        className="py-2.5 px-2 pr-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            const fd = new FormData();
                            fd.set("listingId", p.id);
                            fd.set("enabled", String(!p.repricingEnabled));
                            startTransition(async () => {
                              const r = await toggleListingAction(fd);
                              if (r.ok) router.refresh();
                            });
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                            p.repricingEnabled
                              ? "border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10"
                              : "border-white/15 text-white/55 hover:bg-white/10 hover:text-white/80"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              p.repricingEnabled
                                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                                : "bg-white/35"
                            }`}
                          />
                          {p.repricingEnabled ? "Activo" : "Pausado"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              {nodes.filter((n) => !filterActive || matchSet.has(n.id))
                .length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-14 text-center text-white/45"
                  >
                    <div className="text-2xl mb-2">🔍</div>
                    <div className="text-sm">Sin productos para este filtro.</div>
                    <button
                      type="button"
                      onClick={() => {
                        setGq("");
                        setGState("ALL");
                        setGTag("");
                      }}
                      className="mt-3 text-[11px] text-teal-300 hover:text-teal-200 underline underline-offset-4"
                    >
                      Limpiar filtros
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Primeros pasos: solo si hay productos pero ninguno repreciando */}
      {mode === "graph" &&
        !hideSteps &&
        !sel &&
        nodes.length > 0 &&
        activeCount === 0 && (
        <div className="absolute bottom-5 right-5 z-20 w-72 rounded-2xl border border-teal-400/20 bg-[rgba(8,9,20,0.94)] p-4 backdrop-blur-xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)] fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
              Primeros pasos
            </span>
            <button
              type="button"
              onClick={() => setHideSteps(true)}
              aria-label="Ocultar"
              className="h-5 w-5 grid place-items-center rounded text-white/40 hover:text-white hover:bg-white/10 leading-none"
            >
              ×
            </button>
          </div>
          <ol className="mt-2.5 space-y-1.5 text-[12px] text-white/75">
            {[
              "Clic en un producto para abrir su panel.",
              "Define Precio mín/máx y guarda el rango.",
              "Elige estrategia y actívala.",
              "Activa el «Reprecio automático».",
              "Pulsa «Ejecutar reprecio ahora».",
            ].map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-teal-400/15 text-[10px] font-bold text-teal-300">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("orvexia:open-help"))
            }
            className="mt-3 w-full rounded-lg border border-teal-400/30 py-1.5 text-[11px] font-semibold text-teal-200 hover:bg-teal-400/10 transition-colors"
          >
            Ver guía completa
          </button>
        </div>
      )}

      {/* Controles de zoom (solo en vista grafo) */}
      {mode === "graph" && (
      <div id="tour-zoom" className="absolute bottom-5 left-5 flex flex-col gap-2">
        <ZoomBtn label="Acercar" onClick={() => zoomCenter(1.25)}>+</ZoomBtn>
        <ZoomBtn label="Alejar" onClick={() => zoomCenter(1 / 1.25)}>−</ZoomBtn>
        <ZoomBtn label="Restablecer vista" onClick={() => setView({ k: 1, x: 0, y: 0 })}>
          <span className="text-[11px] leading-none">1:1</span>
        </ZoomBtn>
        <ZoomBtn
          label="Ver leyenda de colores de estado"
          onClick={() => setShowStates((v) => !v)}
        >
          {/* Tres muestras de color = "leyenda de estados", en el idioma
              cromático del propio grafo. */}
          <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
            <circle cx="9" cy="8" r="4" fill="#34d399" />
            <circle cx="15.5" cy="11" r="4" fill="#fbbf24" />
            <circle cx="10" cy="15.5" r="4" fill="#f87171" />
          </svg>
        </ZoomBtn>
        <ZoomBtn
          label="Repetir tutorial guiado"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("orvexia:open-tour"))
          }
        >
          {/* Birrete = tutorial / aprender. */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 5 22 9 12 13 2 9 12 5Z" />
            <path d="M6 10.5V14.5C6 16 9 17.5 12 17.5C15 17.5 18 16 18 14.5V10.5" />
            <path d="M22 9V13.5" />
          </svg>
        </ZoomBtn>
      </div>
      )}

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
        <Inspector
          sel={sel}
          selIsManual={selIsManual}
          selState={selState}
          min={min}
          setMin={setMin}
          max={max}
          setMax={setMax}
          strategy={strategy}
          setStrategy={setStrategy}
          undType={undType}
          setUndType={setUndType}
          undVal={undVal}
          setUndVal={setUndVal}
          fixedP={fixedP}
          setFixedP={setFixedP}
          cost={cost}
          setCost={setCost}
          ship={ship}
          setShip={setShip}
          fba={fba}
          setFba={setFba}
          vat={vat}
          setVat={setVat}
          feeP={feeP}
          setFeeP={setFeeP}
          tMargin={tMargin}
          setTMargin={setTMargin}
          noComp={noComp}
          setNoComp={setNoComp}
          stepUType={stepUType}
          setStepUType={setStepUType}
          stepUVal={stepUVal}
          setStepUVal={setStepUVal}
          useAccDef={useAccDef}
          setUseAccDef={setUseAccDef}
          ignoreAmz={ignoreAmz}
          setIgnoreAmz={setIgnoreAmz}
          fulfil={fulfil}
          setFulfil={setFulfil}
          minRating={minRating}
          setMinRating={setMinRating}
          exclSellers={exclSellers}
          setExclSellers={setExclSellers}
          onlySell={onlySell}
          setOnlySell={setOnlySell}
          tags={tags}
          setTags={setTags}
          parentA={parentA}
          setParentA={setParentA}
          saveRange={saveRange}
          toggle={toggle}
          saveStrategy={saveStrategy}
          saveCompetition={saveCompetition}
          saveTags={saveTags}
          saveParent={saveParent}
          repriceNow={repriceNow}
          setSelId={setSelId}
          pending={pending}
          repricing={repricing}
          err={err}
        />
      )}
    </div>
  );
}

