import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { captureException } from "@/lib/monitoring";
import MysteryDealCard from "@/components/MysteryDealCard";
import DealsCountdown from "@/components/DealsCountdown";
import { REPRICER_ENABLED, REPRICER_PUBLIC } from "@/lib/featureFlags";
import { HeroSearch } from "@/components/HeroSearch";
import { getRealDeals, type DealProduct } from "@/lib/deals";
import { SectionHead, AudienceLabel } from "./_components/SectionPrimitives";

// Semilla diaria estable (fecha peninsular). El set de ofertas es el mismo
// para todos durante el día y cambia a medianoche Europe/Madrid.
function dailyKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // YYYY-MM-DD
}

function dailySeed(): number {
  const key = dailyKey();
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Cachea el pool de ofertas (la consulta CTE pesada) para desacoplar la carga
// de BD del volumen de tráfico: la query corre como mucho una vez cada 10 min
// en lugar de en cada visita. La rotación diaria (shuffle por fecha) se aplica
// fuera de la caché, así que las ofertas siguen rotando a medianoche.
const getCachedDealPool = unstable_cache(
  () => getRealDeals({ limit: 200 }),
  ["home-deal-pool"],
  { revalidate: 600, tags: ["deals"] },
);

async function getTopDeals(): Promise<DealProduct[]> {
  // Pool de ofertas reales filtradas en BD (no en JS). Si la BD no responde
  // degradamos con elegancia: la home renderiza su shell sin reventar.
  let valid: DealProduct[];
  try {
    valid = await getCachedDealPool();
  } catch (e) {
    void captureException(e, { tags: { source: "home-deals" }, level: "warning" });
    return [];
  }

  // Rotación diaria: barajado determinista por fecha sobre todo el pool.
  const pool = seededShuffle(valid, dailySeed());

  // Diversificar por categoría: máximo 2 por categoría en el grid.
  const MAX_PER_CATEGORY = 2;
  const counts: Record<string, number> = {};
  const picked: typeof pool = [];
  for (const p of pool) {
    if ((counts[p.category] ?? 0) >= MAX_PER_CATEGORY) continue;
    counts[p.category] = (counts[p.category] ?? 0) + 1;
    picked.push(p);
    if (picked.length >= 8) break;
  }

  // Si la diversificación no llena los huecos (poca oferta), rellenar.
  if (picked.length < 8) {
    const seen = new Set(picked.map((p) => p.id));
    for (const p of pool) {
      if (seen.has(p.id)) continue;
      picked.push(p);
      if (picked.length >= 8) break;
    }
  }

  return picked;
}

const getCachedStats = unstable_cache(
  async () => {
    const [productCount, withDiscount, stores] = await Promise.all([
      prisma.product.count(),
      prisma.offer.count({ where: { discountPercent: { gt: 0 }, priceOld: { not: null } } }),
      prisma.offer.findMany({ distinct: ["store"], select: { store: true } }),
    ]);
    return { productCount, withDiscount, storeCount: stores.length };
  },
  ["home-stats"],
  { revalidate: 1800, tags: ["stats"] },
);

async function getStats() {
  // Cacheado + degradación a ceros si la BD no responde.
  try {
    return await getCachedStats();
  } catch (e) {
    void captureException(e, { tags: { source: "home-stats" }, level: "warning" });
    return { productCount: 0, withDiscount: 0, storeCount: 0 };
  }
}

const STORES = ["Amazon", "PcComponentes", "Fnac", "El Corte Inglés"];

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "¿Cuánto cuesta usar Orvexia?",
    a: "Es 100% gratis. No pagas por buscar, comparar precios ni por las alertas. Si compras a través de un enlace nuestro la tienda nos paga una pequeña comisión, pero el precio que ves es exactamente el que pagas: no se aplica ningún recargo.",
  },
  {
    q: "¿De dónde salen los precios y cada cuánto se actualizan?",
    a: "Sincronizamos con los feeds oficiales de cada tienda y revisamos los catálogos varias veces al día. En la ficha de cada producto verás el gráfico con los últimos 90 días y el momento exacto de la última actualización.",
  },
  {
    q: "¿En qué tiendas comparáis?",
    a: "Hoy comparamos en Amazon, PcComponentes, Fnac y El Corte Inglés, las cuatro principales del mercado español de electrodomésticos. Iremos sumando más tiendas a medida que validemos su catálogo y la fiabilidad de sus precios.",
  },
  {
    q: "¿Cómo funcionan las alertas de precio?",
    a: (
      <>
        Guarda un producto, define el precio al que comprarías y te avisamos por email en cuanto cualquier tienda lo iguale o baje. Sin spam: solo recibes emails de las alertas que tú activas y puedes desactivarlas en un clic desde tu{" "}
        <Link href="/dashboard" className="font-semibold text-brand-300 hover:text-brand-200 underline decoration-dotted underline-offset-2">
          panel
        </Link>
        .
      </>
    ),
  },
  {
    q: "¿Vuestras recomendaciones son neutrales?",
    a: "Sí. El orden lo calcula nuestro algoritmo a partir de precio actual, valoraciones de compradores reales y descuento verificado contra el histórico de los últimos 90 días. La comisión que recibimos es la misma sea cual sea la tienda en la que termines comprando, así que no tenemos incentivo para empujarte hacia una concreta.",
  },
  {
    q: "He visto un precio mal o un producto agotado, ¿qué hago?",
    a: (
      <>
        Escríbenos a{" "}
        <a href="mailto:orvexiaesp@gmail.com" className="font-semibold text-brand-300 hover:text-brand-200 underline decoration-dotted underline-offset-2">
          orvexiaesp@gmail.com
        </a>{" "}
        con el enlace del producto. Revisamos cada caso el mismo día. Nuestra obsesión es que el precio que muestras coincida con el que pagas en la tienda.
      </>
    ),
  },
];

// Tarjeta del bento de funciones: zona visual arriba + texto abajo.
function BentoCard({
  visual,
  title,
  desc,
  badge,
  href,
  className = "",
}: {
  visual: React.ReactNode;
  title: string;
  desc: string;
  badge?: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const inner = (
    <div
      className="group shine-on-hover relative h-full overflow-hidden rounded-2xl border border-white/[0.07] transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-400/40 hover:shadow-[0_24px_60px_-24px_rgba(99,102,241,0.55)]"
      style={{ background: "linear-gradient(165deg, #0e0c20 0%, #0a081a 55%, #070613 100%)" }}
    >
      {/* halo violeta al pasar el cursor */}
      <div
        className="pointer-events-none absolute -top-20 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.22), transparent 70%)" }}
      />
      <div className="relative flex h-36 items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-[1.04] sm:h-44">{visual}</div>
      <div className="relative px-6 pb-6 pt-2">
        <div className="mb-1.5 flex items-center gap-2.5">
          <h3 className="text-[15px] font-bold text-white">{title}</h3>
          {badge}
        </div>
        <p className="text-[13px] leading-relaxed text-white/45" style={{ textWrap: "pretty" }}>{desc}</p>
      </div>
    </div>
  );
  // className (p.ej. lg:col-span-2) debe ir en el hijo directo del grid: el
  // Link cuando hay href, el div contenedor cuando no.
  return href ? (
    <Link href={href} className={`reveal block h-full ${className}`}>
      {inner}
    </Link>
  ) : (
    <div className={`reveal h-full ${className}`}>{inner}</div>
  );
}

// ── Visuales del bento (decorativos, aria-hidden) ─────────────────────────

// Mini-UI del repricer: un listing real siendo repreciado. Concreto, no
// decorativo: enseña QUÉ hace el servicio (mín/máx → nuevo precio → Buy Box).
function RepricerShowcase() {
  return (
    <div aria-hidden className="w-full max-w-md select-none space-y-2.5">
      {/* listing repreciado ahora mismo */}
      <div
        className="rounded-2xl border border-brand-400/25 p-4"
        style={{ background: "linear-gradient(150deg, rgba(99,102,241,0.16), rgba(99,102,241,0.04))", boxShadow: "0 24px 60px -24px rgba(99,102,241,0.55)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="truncate text-[12px] font-bold text-white/85">Freidora de aire Cosori 5,5 L</p>
          <span className="ml-3 inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
            <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            Buy Box
          </span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] text-white/40">tu precio</p>
            <p className="text-lg font-extrabold tabular leading-tight text-white">
              <span className="mr-2 text-[12px] font-semibold text-white/30 line-through">36,90 €</span>
              35,45 €
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/40">competidor más barato</p>
            <p className="text-[13px] font-bold tabular text-white/60">35,50 €</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-2.5">
          <p className="text-[10px] text-white/35">límites: mín <span className="font-bold tabular text-white/60">32,00 €</span> · máx <span className="font-bold tabular text-white/60">39,90 €</span></p>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-brand-200">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-300 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-300" />
            </span>
            repreciado hace 2 min
          </p>
        </div>
        {/* progreso hasta el siguiente ciclo de 5 min */}
        <div className="mt-2.5">
          <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full w-[62%] rounded-full" style={{ background: "linear-gradient(90deg, #6366F1, #A5B4FC)", boxShadow: "0 0 12px rgba(129,140,248,0.6)" }} />
          </div>
          <p className="mt-1.5 text-right text-[9px] tabular text-white/30">siguiente reprecio en 1:54</p>
        </div>
      </div>

      {/* cola de siguientes reprecios */}
      {[
        { name: "Cafetera De'Longhi Magnifica S", state: "en cola · siguiente ciclo", price: "289,00 €" },
        { name: "Robot Roomba Combo Essential", state: "sin cambios · ya ganas la Buy Box", price: "199,00 €" },
      ].map((r) => (
        <div key={r.name} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-white/70">{r.name}</p>
            <p className="text-[9px] text-white/30">{r.state}</p>
          </div>
          <p className="shrink-0 text-[12px] font-bold tabular text-white/55">{r.price}</p>
        </div>
      ))}
    </div>
  );
}

function VisualAlertas() {
  return (
    <div aria-hidden className="relative flex h-full w-full items-center justify-center">
      <div
        className="relative flex h-14 w-14 items-center justify-center rounded-full border border-brand-300/40 text-brand-100"
        style={{ background: "radial-gradient(circle at 35% 30%, rgba(129,140,248,0.4), rgba(99,102,241,0.14) 70%)", boxShadow: "0 0 36px -6px rgba(129,140,248,0.5)" }}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
        </svg>
      </div>
      {/* chips satélite: objetivo alcanzado */}
      <div className="absolute left-[12%] top-8 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 backdrop-blur-sm">
        <p className="text-[9px] text-white/40">objetivo</p>
        <p className="text-[11px] font-bold tabular text-white/85">699 €</p>
      </div>
      <div className="absolute bottom-6 right-[10%] rounded-lg border border-brand-400/30 bg-brand-400/[0.1] px-2.5 py-1.5 backdrop-blur-sm">
        <p className="text-[9px] text-brand-200/70">hoy</p>
        <p className="text-[11px] font-bold tabular text-brand-100">−41,50 €</p>
      </div>
    </div>
  );
}

function VisualHistorico() {
  return (
    <div aria-hidden className="relative h-full w-full">
      <svg className="absolute inset-x-0 bottom-0 h-[85%] w-full" viewBox="0 0 300 120" preserveAspectRatio="none" fill="none">
        <defs>
          <linearGradient id="hist-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(129,140,248,0.35)" />
            <stop offset="100%" stopColor="rgba(129,140,248,0)" />
          </linearGradient>
        </defs>
        <path d="M0 78 C30 74 45 58 70 62 S110 92 140 84 S190 38 220 46 S270 70 300 58 L300 120 L0 120 Z" fill="url(#hist-fill)" />
        <path d="M0 78 C30 74 45 58 70 62 S110 92 140 84 S190 38 220 46 S270 70 300 58" stroke="rgba(165,180,252,0.8)" strokeWidth="1.5" />
        <circle cx="220" cy="46" r="3.5" fill="#0a081a" stroke="#A5B4FC" strokeWidth="1.5" />
        <line x1="220" y1="46" x2="220" y2="120" stroke="rgba(165,180,252,0.25)" strokeWidth="1" strokeDasharray="3 3" />
      </svg>
      <div className="absolute right-[16%] top-4 rounded-lg border border-white/10 bg-[#0d0b1e]/90 px-2.5 py-1.5">
        <p className="text-[9px] text-white/40">mínimo 90 días</p>
        <p className="text-[11px] font-bold tabular text-white">549,00 €</p>
      </div>
    </div>
  );
}

function VisualComparador() {
  const rows = [
    { store: "Amazon", w: "62%", price: "779 €", best: false },
    { store: "PcComponentes", w: "48%", price: "749 €", best: true },
    { store: "Fnac", w: "71%", price: "805 €", best: false },
    { store: "El Corte Inglés", w: "66%", price: "789 €", best: false },
  ];
  return (
    <div aria-hidden className="w-full max-w-md space-y-2.5 px-6">
      {rows.map((r) => (
        <div key={r.store} className="flex items-center gap-2.5">
          <span className={`w-[88px] shrink-0 truncate text-right text-[10px] ${r.best ? "font-semibold text-brand-200" : "text-white/35"}`}>{r.store}</span>
          <div className="h-5 flex-1 overflow-hidden rounded-md bg-white/[0.03]">
            <div
              className="h-full rounded-md"
              style={{
                width: r.w,
                background: r.best
                  ? "linear-gradient(90deg, rgba(129,140,248,0.9), rgba(165,180,252,0.7))"
                  : "linear-gradient(90deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05))",
                boxShadow: r.best ? "0 0 18px -2px rgba(129,140,248,0.6)" : undefined,
              }}
            />
          </div>
          <span className={`w-14 shrink-0 text-[11px] tabular ${r.best ? "font-bold text-white" : "text-white/40"}`}>{r.price}</span>
        </div>
      ))}
    </div>
  );
}

// ── Mockup del panel (estático, decorativo) ───────────────────────────────

function DashboardMockup({ stats }: { stats: { productCount: number; withDiscount: number } }) {
  const bars = [42, 55, 38, 61, 50, 74, 58, 90, 66, 52, 70, 60];
  const drops = [
    { name: "LG OLED55C4 55\"", meta: "TV · Amazon", delta: "−150,00 €", pct: "−13 %" },
    { name: "Bosch KGN36VIEA", meta: "Frigorífico · El Corte Inglés", delta: "−87,90 €", pct: "−9 %" },
    { name: "Dyson V15 Detect", meta: "Aspirador · PcComponentes", delta: "−120,00 €", pct: "−17 %" },
  ];
  return (
    <div aria-hidden className="relative mx-auto max-w-4xl select-none">
      {/* resplandor bajo el panel */}
      <div className="absolute -inset-x-10 -bottom-12 top-8 rounded-[40px] bg-brand-500/[0.16] blur-3xl" />

      {/* chips satélite flotantes */}
      <div className="float-y absolute -left-28 top-32 z-10 hidden rotate-[-4deg] rounded-xl border border-brand-400/30 bg-[#0d0b1e]/95 px-3.5 py-2.5 backdrop-blur-md xl:block" style={{ boxShadow: "0 16px 40px -12px rgba(99,102,241,0.5)" }}>
        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-brand-200">
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
            <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </span>
          Buy Box ganada
        </p>
        <p className="mt-0.5 text-[13px] font-extrabold tabular text-white">margen +6,2 %</p>
      </div>
      <div className="float-y absolute -right-24 top-40 z-10 hidden rotate-[3deg] rounded-xl border border-brand-400/30 bg-[#0d0b1e]/95 px-3.5 py-2.5 backdrop-blur-md xl:block" style={{ boxShadow: "0 16px 40px -12px rgba(99,102,241,0.5)", animationDelay: "2.4s" }}>
        <p className="text-[10px] font-semibold text-brand-200">Alerta cumplida</p>
        <p className="mt-0.5 text-[13px] font-extrabold tabular text-white">689,00 € <span className="text-[10px] font-bold text-brand-300">−9 %</span></p>
      </div>
      <div className="border-glow-violet relative rounded-2xl p-px" style={{ boxShadow: "0 40px 80px -24px rgba(3,2,12,0.9), 0 0 70px -16px rgba(99,102,241,0.5)" }}>
      <div
        className="relative overflow-hidden rounded-[15px]"
        style={{ background: "linear-gradient(170deg, #0e0c20 0%, #090818 60%, #060512 100%)" }}
      >
        {/* barra superior */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-500/25 text-[11px] font-black text-brand-200">O</span>
            <span className="text-[12px] font-bold text-white/85">Orvexia</span>
          </div>
          <div className="hidden h-7 w-64 items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 sm:flex">
            <svg className="h-3 w-3 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
            <span className="text-[11px] text-white/30">Buscar producto…</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/50">Hola, Xavi</span>
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-brand-300 to-brand-600" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-0 md:grid-cols-[1.5fr_1fr]">
          {/* columna principal: gráfico */}
          <div className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-white/90">Mi panel</h3>
              <div className="flex gap-1.5">
                {["Todos", "Bajadas", "Alertas"].map((t, i) => (
                  <span
                    key={t}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${i === 0 ? "bg-brand-500/90 text-white" : "bg-white/[0.05] text-white/40"}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] text-white/40">Evolución de precio · 90 días</span>
                <span className="rounded-md border border-brand-400/30 bg-brand-400/10 px-2 py-0.5 text-[10px] font-bold tabular text-brand-100">−32,45 €</span>
              </div>
              <div className="flex h-28 items-end gap-1.5">
                {bars.map((h, i) => {
                  const hot = i === 7;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm"
                      style={{
                        height: `${h}%`,
                        background: hot
                          ? "linear-gradient(180deg, #A5B4FC, #6366F1)"
                          : "linear-gradient(180deg, rgba(129,140,248,0.35), rgba(129,140,248,0.08))",
                        boxShadow: hot ? "0 0 18px -2px rgba(129,140,248,0.8)" : undefined,
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[9px] tabular text-white/25">
                <span>abr</span><span>may</span><span>jun</span><span>jul</span>
              </div>
            </div>
          </div>

          {/* columna lateral: ahorro + últimas bajadas */}
          <div className="border-t border-white/[0.06] p-5 sm:p-6 md:border-l md:border-t-0">
            <div
              className="mb-4 rounded-xl border border-brand-400/20 p-4"
              style={{ background: "linear-gradient(150deg, rgba(99,102,241,0.18), rgba(99,102,241,0.05))" }}
            >
              <p className="text-[11px] text-white/45">Ahorro detectado hoy</p>
              <p className="mt-1 text-2xl font-extrabold tabular tracking-tight text-white">357,90 €</p>
              <p className="mt-1 text-[10px] tabular text-brand-200/80">{stats.withDiscount.toLocaleString("es-ES")} ofertas activas · {stats.productCount.toLocaleString("es-ES")} productos</p>
            </div>
            <p className="mb-2.5 text-[11px] font-semibold text-white/45">Últimas bajadas</p>
            <div className="space-y-2">
              {drops.map((d) => (
                <div key={d.name} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-white/80">{d.name}</p>
                    <p className="truncate text-[9px] text-white/30">{d.meta}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-bold tabular text-brand-200">{d.delta}</p>
                    <p className="text-[9px] tabular text-white/35">{d.pct}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [productos, stats] = await Promise.all([getTopDeals(), getStats()]);
  const dayKey = dailyKey();

  // El Repricer solo se promociona como «Disponible» cuando está habilitado y
  // marcado público (REPRICER_PUBLIC=true).
  const repricerLive = REPRICER_ENABLED && REPRICER_PUBLIC;

  return (
    <main className="min-h-screen bg-[#050310] text-white/90 selection:bg-brand-700/60 selection:text-brand-50">

      {/* Anuncio — Repricer gratis para los primeros 10 usuarios */}
      <div className="relative border-b border-brand-400/15 bg-brand-500/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-center sm:flex-row sm:px-6">
          <span className="inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full border border-brand-400/30 bg-brand-400/10 px-2 text-[10px] font-semibold text-brand-200">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-300 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-300" />
            </span>
            Oferta de lanzamiento
          </span>
          <p className="text-[12px] leading-snug text-white/70 sm:text-[13px]">
            Regalamos el <span className="font-bold text-white">Repricer</span> a los <span className="font-bold text-brand-200">primeros 10 usuarios</span>. Escríbenos a{" "}
            <a href="mailto:orvexiaesp@gmail.com?subject=Repricer%20gratis%20-%20primeros%2010%20usuarios" className="font-semibold text-brand-300 underline decoration-dotted underline-offset-2 hover:text-brand-200">
              orvexiaesp@gmail.com
            </a>
          </p>
        </div>
      </div>

      {/* ── HERO — arco luminoso ──────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        {/* Arco/planeta: elipse enorme cuyo borde inferior brilla sobre el título */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute left-1/2 top-[-780px] h-[900px] w-[1700px] -translate-x-1/2 rounded-[100%]"
            style={{
              background: "radial-gradient(closest-side, #040210 80%, #120c33 100%)",
              border: "1px solid rgba(165,180,252,0.45)",
              boxShadow: "0 30px 180px 20px rgba(129,140,248,0.42), 0 10px 60px 0 rgba(196,181,253,0.25), inset 0 -80px 200px -60px rgba(129,140,248,0.45)",
            }}
          />
          {/* resplandor ambiental bajo el arco */}
          <div
            className="absolute left-1/2 top-[-140px] h-[640px] w-[1250px] -translate-x-1/2 rounded-full halo-breathe"
            style={{ background: "radial-gradient(ellipse at center top, rgba(139,148,255,0.32), rgba(99,102,241,0.10) 45%, transparent 70%)" }}
          />
          {/* rayos de luz cayendo del arco hacia el titular */}
          <div
            className="absolute left-1/2 top-0 hidden h-[560px] w-[980px] -translate-x-1/2 sm:block"
            style={{
              background:
                "conic-gradient(from 180deg at 50% -8%, transparent 41%, rgba(129,140,248,0.07) 46%, rgba(196,181,253,0.14) 50%, rgba(129,140,248,0.07) 54%, transparent 59%)",
              maskImage: "linear-gradient(180deg, black 20%, transparent 95%)",
              WebkitMaskImage: "linear-gradient(180deg, black 20%, transparent 95%)",
            }}
          />
          {/* retícula sutil desvanecida */}
          <div
            className="absolute inset-0 hidden opacity-60 sm:block bg-grid-cyber-fine"
            style={{
              maskImage: "radial-gradient(ellipse 60% 50% at 50% 30%, black 0%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 30%, black 0%, transparent 75%)",
            }}
          />
          {/* estrellas parpadeantes */}
          <div className="hidden sm:block">
            <span className="star" style={{ left: "12%", top: "14%", ["--d" as string]: "3.6s", ["--delay" as string]: "0s" }} />
            <span className="star" style={{ left: "22%", top: "34%", ["--d" as string]: "5.2s", ["--delay" as string]: "1.4s" }} />
            <span className="star" style={{ left: "8%",  top: "56%", ["--d" as string]: "4.4s", ["--delay" as string]: "2.2s" }} />
            <span className="star" style={{ left: "33%", top: "10%", ["--d" as string]: "6s",   ["--delay" as string]: "0.8s" }} />
            <span className="star" style={{ left: "68%", top: "12%", ["--d" as string]: "4.8s", ["--delay" as string]: "1.9s" }} />
            <span className="star" style={{ left: "80%", top: "30%", ["--d" as string]: "3.8s", ["--delay" as string]: "0.4s" }} />
            <span className="star" style={{ left: "90%", top: "52%", ["--d" as string]: "5.6s", ["--delay" as string]: "2.8s" }} />
            <span className="star" style={{ left: "76%", top: "62%", ["--d" as string]: "4.2s", ["--delay" as string]: "1.1s" }} />
          </div>
          {/* grano sutil sobre todo el hero */}
          <div className="noise-overlay" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6 sm:pt-32">
          {/* chip */}
          <div className="mb-7 flex justify-center">
            <span className="inline-flex h-7 items-center gap-2 rounded-full border border-brand-400/25 bg-brand-400/[0.07] px-3.5 text-[11px] font-semibold text-brand-200 backdrop-blur-sm">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.3-6.2-4.5-6.2 4.5 2.4-7.3L2 9.4h7.6z" /></svg>
              Optimiza tus precios
            </span>
          </div>

          {/* titular */}
          <h1
            className="mx-auto mb-6 text-center font-extrabold text-white"
            style={{ fontSize: "clamp(2.4rem, 6.5vw, 4.4rem)", lineHeight: 1.05, letterSpacing: "-0.04em", textWrap: "balance" }}
          >
            Vende mejor en Amazon.
            <br />
            <span className="text-shimmer-violet text-glow-brand">
              Compra al mejor precio.
            </span>
          </h1>

          <p
            className="mx-auto mb-9 max-w-xl text-center leading-relaxed text-white/50"
            style={{ fontSize: "clamp(0.95rem, 1.2vw, 1.06rem)", textWrap: "pretty" }}
          >
            Una plataforma que reajusta tus precios de Amazon cada 5 minutos y
            compara los de las principales tiendas de España para que compres en
            el momento justo.
          </p>

          {/* CTAs */}
          <div className="mb-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sellers"
              className="shine-on-hover inline-flex h-12 items-center justify-center rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 hover:shadow-[0_0_48px_-4px_rgba(129,140,248,0.9)] active:scale-[0.97]"
              style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85), 0 0 24px -6px rgba(129,140,248,0.5)" }}
            >
              Probar el Repricer
              <span aria-hidden className="ml-2">→</span>
            </Link>
            <Link
              href="#comparador"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
            >
              Comparar precios
            </Link>
          </div>

          {/* stats como chips de cristal */}
          <div className="mb-14 flex flex-wrap items-center justify-center gap-2.5">
            {[
              { v: stats.productCount.toLocaleString("es-ES"), l: "productos indexados" },
              { v: stats.withDiscount.toLocaleString("es-ES"), l: "ofertas con descuento" },
              { v: String(stats.storeCount), l: "tiendas conectadas" },
            ].map((s) => (
              <span
                key={s.l}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 backdrop-blur-sm transition-colors hover:border-brand-400/30"
              >
                <span className="h-1 w-1 rounded-full bg-brand-300" />
                <span className="text-[13px] font-extrabold tabular text-white">{s.v}</span>
                <span className="text-[11px] text-white/45">{s.l}</span>
              </span>
            ))}
          </div>

          {/* mockup del panel */}
          <DashboardMockup stats={stats} />
        </div>

        {/* banda de tiendas (estilo logos) */}
        <div className="relative border-t border-white/[0.05] py-10">
          <p className="mb-6 text-center text-[12px] text-white/35">
            Precios sincronizados con las principales tiendas de España
          </p>
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6">
            {STORES.map((s) => (
              <span key={s} className="text-[15px] font-bold tracking-tight text-white/30 transition-colors hover:text-white/55 sm:text-[17px]">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICIOS — por audiencia (vendedores / compradores) ─────────── */}
      <section id="servicios" className="relative scroll-mt-24 px-4 pb-24 pt-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            chip="La plataforma"
            title={<>Dos herramientas,<br className="hidden sm:block" /> un objetivo: el precio justo.</>}
            subtitle="Si vendes en Amazon, automatiza tus precios. Si compras, hazlo en el momento exacto. Todo en Orvexia."
          />

          {/* PARA VENDEDORES — Repricer en protagonista */}
          <div
            className="reveal relative mb-16 overflow-hidden rounded-3xl border border-brand-400/15"
            style={{ background: "linear-gradient(160deg, #100d26 0%, #0a0819 55%, #070614 100%)" }}
          >
            <div aria-hidden className="pointer-events-none absolute -top-28 right-10 h-72 w-[520px] rounded-full" style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.16), transparent 70%)" }} />
            <div aria-hidden className="noise-overlay" />
            <div className="relative grid grid-cols-1 items-center gap-10 p-8 sm:p-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
              <div>
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">Para vendedores de Amazon</span>
                  {repricerLive ? (
                    <span className="inline-flex h-5 items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 text-[9px] font-semibold uppercase tracking-wide text-emerald-300">
                      <span className="h-1 w-1 rounded-full bg-emerald-400" /> Disponible
                    </span>
                  ) : (
                    <span className="inline-flex h-5 items-center rounded-full border border-brand-400/25 bg-brand-400/10 px-2 text-[9px] font-semibold uppercase tracking-wide text-brand-200">
                      Acceso anticipado
                    </span>
                  )}
                </div>
                <h3 className="mb-3 font-extrabold tracking-tight text-white" style={{ fontSize: "clamp(1.6rem, 2.8vw, 2.2rem)", letterSpacing: "-0.03em" }}>
                  Orvexia Repricer
                </h3>
                <p className="mb-6 max-w-md text-sm leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>
                  Vigilar a la competencia a mano no escala. El Repricer ajusta
                  tus precios por ti, dentro de los límites que tú decidas.
                </p>
                <ul className="mb-8 space-y-3">
                  {[
                    { t: "Reprecia cada 5 minutos", d: "para ganar la Buy Box sin regalar margen." },
                    { t: "Tú pones las reglas", d: "nunca baja de tu mínimo ni sube de tu máximo." },
                    { t: "Empieza en 2 minutos", d: "conecta tu cuenta de Amazon o sube tu catálogo en CSV." },
                  ].map((b) => (
                    <li key={b.t} className="flex items-start gap-3 text-[13px] leading-relaxed">
                      <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </span>
                      <span className="text-white/45"><span className="font-bold text-white/85">{b.t}</span> — {b.d}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/sellers"
                    className="shine-on-hover inline-flex h-12 items-center justify-center rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 hover:shadow-[0_0_48px_-4px_rgba(129,140,248,0.9)] active:scale-[0.97]"
                    style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
                  >
                    Probar el Repricer →
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
                  >
                    Crear cuenta gratis
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <RepricerShowcase />
              </div>
            </div>
          </div>

          {/* PARA COMPRADORES — comparador, alertas, histórico */}
          <AudienceLabel label="Para compradores" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <BentoCard
              visual={<VisualComparador />}
              title="Comparador de tiendas"
              desc="Amazon, PcComponentes, Fnac y El Corte Inglés lado a lado. Sin recargos: el precio que ves es el que pagas."
              href="#comparador"
            />
            <BentoCard
              visual={<VisualAlertas />}
              title="Alertas de precio"
              desc="Pon tu precio objetivo y te avisamos por email cuando cualquier tienda lo iguale o lo baje. Sin spam."
              href="/register"
            />
            <BentoCard
              visual={<VisualHistorico />}
              title="Histórico de 90 días"
              desc="La evolución real de precio de cada producto, para saber si esa «oferta» lo es de verdad."
              href="/ofertas-destacadas"
            />
          </div>

          <p className="mt-8 text-center text-[12px] text-white/30">
            En camino: analítica de demanda y asistente de precios con IA.
          </p>
        </div>
      </section>

      {/* ── COMPARADOR — buscador + ofertas del día ───────────────────────── */}
      <div aria-hidden className="divider-glow mx-auto max-w-5xl" />
      <section id="comparador" className="relative scroll-mt-24 px-4 pb-24 pt-20 sm:px-6">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[420px] max-w-4xl rounded-full opacity-60" style={{ background: "radial-gradient(ellipse at center top, rgba(99,102,241,0.10), transparent 70%)" }} />
        <div className="relative mx-auto max-w-6xl">
          <SectionHead
            chip="Comparador"
            title={<>Las mejores ofertas, hoy.</>}
            subtitle="Comparamos los catálogos varias veces al día y solo destacamos lo que de verdad está rebajado frente a su histórico."
          />

          {/* buscador */}
          <div className="reveal relative z-40 mx-auto max-w-2xl">
            <div
              className="border-glow-violet rounded-2xl p-px"
              style={{ boxShadow: "0 0 60px -12px rgba(99,102,241,0.45)" }}
            >
              <div className="rounded-[15px] bg-[#0a0818]/95 p-3 backdrop-blur-md">
                <HeroSearch />
              </div>
            </div>
          </div>

          {/* ofertas del día */}
          {productos.length > 0 && (
            <div className="mt-14">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-white/50">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-300 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-300" />
                  </span>
                  Ofertas top de hoy · rotan a medianoche
                </p>
                <DealsCountdown dayKey={dayKey} />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                {productos.slice(0, 4).map((producto, i) => (
                  <div key={producto.id} className="group overflow-hidden rounded-xl shadow-lg shadow-black/30 ring-1 ring-white/[0.06] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-20px_rgba(99,102,241,0.5)] hover:ring-brand-400/40 sm:rounded-2xl">
                    <MysteryDealCard product={producto} priority={i === 0} revealKey={dayKey} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA al comparador completo */}
          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/ofertas-destacadas"
              className="group shine-on-hover inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 hover:shadow-[0_0_48px_-4px_rgba(129,140,248,0.9)] active:scale-[0.97]"
              style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
            >
              Ver todas las ofertas
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href="/categorias"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
            >
              Explorar categorías
            </Link>
          </div>
        </div>
      </section>

      {/* ── CUENTA GRATIS ─────────────────────────────────────────────────── */}
      <section className="relative px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div
            className="reveal relative overflow-hidden rounded-3xl border border-brand-400/15"
            style={{ background: "linear-gradient(160deg, #100d26 0%, #0a0819 55%, #070614 100%)" }}
          >
            <div aria-hidden className="pointer-events-none absolute -top-28 left-1/2 h-72 w-[560px] -translate-x-1/2 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.18), transparent 70%)" }} />
            <div aria-hidden className="noise-overlay" />

            <div className="relative grid grid-cols-1 gap-10 p-8 sm:p-12 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:p-14">
              {/* izquierda: pitch + checklist */}
              <div className="flex flex-col justify-center">
                <h2
                  className="mb-4 font-extrabold tracking-tight text-white"
                  style={{ fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)", lineHeight: 1.08, letterSpacing: "-0.03em", textWrap: "balance" }}
                >
                  Tu panel para comprar{" "}
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(100deg, #E3E6FF, #A5B4FC)" }}>
                    en el momento justo.
                  </span>
                </h2>
                <p className="mb-7 max-w-md text-sm leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>
                  Seguimiento, alertas y comparativas privadas. Gratis siempre,
                  sin tarjeta.
                </p>
                <ul className="mb-8 space-y-2.5">
                  {["Alertas de precio ilimitadas", "Historial de 90 días en cada producto", "Favoritos con evolución de precio", "Comparativas privadas y compartibles"].map((t) => (
                    <li key={t} className="flex items-center gap-2.5 text-[13px] text-white/65">
                      <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/register"
                    className="shine-on-hover inline-flex h-12 items-center justify-center rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 hover:shadow-[0_0_48px_-4px_rgba(129,140,248,0.9)] active:scale-[0.97]"
                    style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
                  >
                    Crear cuenta gratis →
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
                  >
                    Ver mi panel
                  </Link>
                </div>
              </div>

              {/* derecha: tarjeta de alerta simulada */}
              <div aria-hidden className="relative hidden items-center justify-center lg:flex">
                <div className="w-full max-w-sm space-y-3">
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-white/50">Alerta activa</span>
                      <span className="rounded-full border border-brand-400/30 bg-brand-400/10 px-2 py-0.5 text-[9px] font-bold text-brand-200">objetivo 699 €</span>
                    </div>
                    <p className="mb-1 text-[13px] font-bold text-white/85">Samsung QE55S90D 55&quot; OLED</p>
                    <p className="text-[11px] text-white/35">Vigilando 4 tiendas · último cambio hace 2 h</p>
                  </div>
                  <div
                    className="float-y rounded-2xl border border-brand-400/30 p-4"
                    style={{ background: "linear-gradient(150deg, rgba(99,102,241,0.24), rgba(99,102,241,0.07))", boxShadow: "0 24px 60px -20px rgba(99,102,241,0.6)" }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/30 text-brand-200">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.44V11a6 6 0 1 0-12 0v3.16c0 .54-.21 1.05-.6 1.43L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" /></svg>
                      </span>
                      <span className="text-[11px] font-bold text-brand-100">Precio objetivo alcanzado</span>
                    </div>
                    <p className="text-[12px] leading-relaxed text-white/70">
                      Ha bajado a <span className="font-extrabold tabular text-white">689,00 €</span> en PcComponentes
                      <span className="ml-1.5 rounded bg-brand-400/20 px-1.5 py-0.5 text-[10px] font-bold tabular text-brand-100">−9 %</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <div aria-hidden className="divider-glow mx-auto max-w-5xl" />
      <section className="relative px-4 pb-28 pt-16 sm:px-6" aria-labelledby="faq-title">
        <div className="relative mx-auto max-w-3xl">
          <SectionHead
            chip="Preguntas frecuentes"
            id="faq-title"
            title="Antes de empezar"
            subtitle="Lo que la gente nos pregunta antes de comparar su primer precio."
          />

          <div className="flex flex-col gap-2.5">
            {FAQS.map((faq, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] transition-all duration-200 open:border-brand-400/30 open:bg-white/[0.035] hover:border-white/15"
              >
                <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4.5 sm:px-6 [&::-webkit-details-marker]:hidden">
                  <span className="flex-1 text-[15px] font-semibold leading-snug text-white/90">{faq.q}</span>
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-transform duration-200 group-open:rotate-45 group-open:border-brand-400/40 group-open:text-brand-200"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <div className="px-5 pb-5 sm:px-6">
                  <div className="border-t border-white/[0.06] pt-4 text-sm leading-relaxed text-white/60">{faq.a}</div>
                </div>
              </details>
            ))}
          </div>

          <p className="mt-10 text-center text-xs text-white/40">
            ¿No encuentras tu respuesta?{" "}
            <a href="mailto:orvexiaesp@gmail.com" className="font-semibold text-brand-300 underline decoration-dotted underline-offset-2 hover:text-brand-200">
              Escríbenos
            </a>{" "}
            y la añadimos.
          </p>
        </div>
      </section>

    </main>
  );
}
