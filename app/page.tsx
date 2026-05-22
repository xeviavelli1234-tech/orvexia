export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import MysteryDealCard from "@/components/MysteryDealCard";
import DealsCountdown from "@/components/DealsCountdown";
import { REPRICER_ENABLED, REPRICER_PUBLIC } from "@/lib/featureFlags";
import { HeroSearch } from "@/components/HeroSearch";
import { getRealDeals } from "@/lib/deals";

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

async function getTopDeals() {
  // Pool de ofertas reales filtradas en BD (no en JS). 200 cubre catálogo
  // actual con margen para la rotación diaria + diversificación.
  const valid = await getRealDeals({ limit: 200 });

  // Rotación diaria: barajado determinista por fecha sobre todo el pool,
  // así cada día se ven 8 distintas (no siempre las de mayor ahorro absoluto).
  const pool = seededShuffle(valid, dailySeed());

  // Diversificar por categoría: máximo 2 por categoría en el grid de 8.
  // Sin esto el grid lo monopolizan TVs OLED premium.
  const MAX_PER_CATEGORY = 2;
  const counts: Record<string, number> = {};
  const picked: typeof pool = [];
  for (const p of pool) {
    if ((counts[p.category] ?? 0) >= MAX_PER_CATEGORY) continue;
    counts[p.category] = (counts[p.category] ?? 0) + 1;
    picked.push(p);
    if (picked.length >= 8) break;
  }

  // Si la diversificación no llena los 8 huecos (poca oferta), rellenar con
  // el resto del pool barajado.
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

async function getStats() {
  const [productCount, withDiscount, stores] = await Promise.all([
    prisma.product.count(),
    prisma.offer.count({ where: { discountPercent: { gt: 0 }, priceOld: { not: null } } }),
    prisma.offer.findMany({ distinct: ["store"], select: { store: true } }),
  ]);
  return { productCount, withDiscount, storeCount: stores.length };
}

const CATEGORIES = [
  { key: "TELEVISORES",          label: "Televisores",  icon: "📺", accent: "#818CF8", code: "TV-01" },
  { key: "LAVADORAS",            label: "Lavadoras",    icon: "🫧", accent: "#A78BFA", code: "WS-02" },
  { key: "FRIGORIFICOS",         label: "Frigoríficos", icon: "🧊", accent: "#22D3EE", code: "FR-03" },
  { key: "LAVAVAJILLAS",         label: "Lavavajillas", icon: "🍽️", accent: "#5EEAD4", code: "DW-04" },
  { key: "SECADORAS",            label: "Secadoras",    icon: "💨", accent: "#FBBF24", code: "DR-05" },
  { key: "HORNOS",               label: "Hornos",       icon: "🔥", accent: "#F87171", code: "OV-06" },
  { key: "CAFETERAS",            label: "Cafeteras",    icon: "☕", accent: "#FB923C", code: "CF-07" },
  { key: "AIRES_ACONDICIONADOS", label: "Aire acond.",  icon: "❄️", accent: "#38BDF8", code: "AC-08" },
];

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Busca",
    desc: "Escribe el electrodoméstico y compara precios al instante en las principales tiendas.",
    accent: "#818CF8",
    cmd: "init.search",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
    ),
  },
  {
    n: "02",
    title: "Compara",
    desc: "Ve el historial de precios, detecta el mejor momento y elige la tienda más económica.",
    accent: "#5EEAD4",
    cmd: "exec.compare",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 17v-5M12 17V8M17 17v-3" />
      </svg>
    ),
  },
  {
    n: "03",
    title: "Ahorra",
    desc: "Compra directamente en la tienda al mejor precio. Sin intermediarios, sin comisiones.",
    accent: "#A3E635",
    cmd: "deploy.save",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      </svg>
    ),
  },
];

const REGISTER_PERKS: { title: string; desc: string; accent: string; code: string; icon: React.ReactNode }[] = [
  {
    title: "Favoritos con historial",
    desc: "Guarda productos y consulta su evolución de precio en un panel limpio.",
    accent: "#818CF8",
    code: "MOD/01",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m12 17-5.09 2.674 1-5.829-4.24-4.136 5.86-.852L12 3l2.47 5.857 5.86.852-4.24 4.136 1 5.829z" />
      </svg>
    ),
  },
  {
    title: "Alertas de precio",
    desc: "Pon tu precio objetivo y te avisamos por email cuando una tienda lo rebaje.",
    accent: "#FBBF24",
    code: "MOD/02",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    title: "Notificaciones de oferta",
    desc: "Guarda un producto sin descuento y te avisamos cuando entre en oferta o baje de precio.",
    accent: "#5EEAD4",
    code: "MOD/03",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: "Comparativas privadas",
    desc: "Crea listas con las tiendas más baratas y compártelas con quien quieras.",
    accent: "#F0ABFC",
    code: "MOD/04",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h10M7 17h6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z" />
      </svg>
    ),
  },
];

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

// Tiny reusable HUD bracket frame
function HudFrame({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`hud-corners ${className}`}>
      <span className="hud-tl" /><span className="hud-tr" /><span className="hud-bl" /><span className="hud-br" />
      {children}
    </div>
  );
}

export default async function HomePage() {
  const [productos, stats] = await Promise.all([getTopDeals(), getStats()]);
  const dayKey = dailyKey();

  const now = new Date();
  const buildId = now.toISOString().slice(2, 16).replace(/[-:T]/g, "").slice(0, 10);

  return (
    <main className="bg-void-deep min-h-screen text-white/90 selection:bg-brand-700/60 selection:text-brand-50">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden isolate">

        {/* Background mesh — heavy decorative layer, only on sm+ to keep mobile scroll smooth */}
        <div className="hidden sm:block absolute inset-0 -z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-grid-cyber opacity-70" style={{
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, black 0%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, black 0%, transparent 80%)",
          }} />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1500px] h-[900px] rounded-full halo-breathe" style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.35) 0%, rgba(168,85,247,0.15) 30%, transparent 65%)" }} />
          <div className="absolute top-1/3 -right-40 w-[700px] h-[700px] rounded-full opacity-70" style={{ background: "radial-gradient(circle, rgba(34,211,238,0.22) 0%, transparent 60%)" }} />
          <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] rounded-full opacity-70" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.20) 0%, transparent 60%)" }} />
          <div className="scanline-drift" />

          {/* Floating particles */}
          <span className="particle" style={{ left: "8%",  bottom: "0%",  ['--c' as string]: "#5EEAD4", ['--d' as string]: "11s", ['--delay' as string]: "0s",   ['--x' as string]: "20px" }} />
          <span className="particle" style={{ left: "22%", bottom: "0%",  ['--c' as string]: "#A78BFA", ['--d' as string]: "13s", ['--delay' as string]: "2.5s", ['--x' as string]: "-30px" }} />
          <span className="particle" style={{ left: "40%", bottom: "0%",  ['--c' as string]: "#F0ABFC", ['--d' as string]: "9s",  ['--delay' as string]: "4s",   ['--x' as string]: "10px" }} />
          <span className="particle" style={{ left: "58%", bottom: "0%",  ['--c' as string]: "#A3E635", ['--d' as string]: "12s", ['--delay' as string]: "1s",   ['--x' as string]: "-15px" }} />
          <span className="particle" style={{ left: "76%", bottom: "0%",  ['--c' as string]: "#5EEAD4", ['--d' as string]: "10s", ['--delay' as string]: "3s",   ['--x' as string]: "25px" }} />
          <span className="particle" style={{ left: "92%", bottom: "0%",  ['--c' as string]: "#818CF8", ['--d' as string]: "14s", ['--delay' as string]: "6s",   ['--x' as string]: "-20px" }} />

          {/* Vertical data streams at the edges */}
          <span className="data-stream" style={{ left: "4%",  top: "10%", ['--c' as string]: "rgba(94,234,212,0.5)",  ['--d' as string]: "8s",  ['--delay' as string]: "1s"   }} />
          <span className="data-stream" style={{ right: "6%", top: "20%", ['--c' as string]: "rgba(240,171,252,0.45)", ['--d' as string]: "11s", ['--delay' as string]: "4s"   }} />
          <span className="data-stream" style={{ left: "12%", top: "40%", ['--c' as string]: "rgba(129,140,248,0.4)",  ['--d' as string]: "9s",  ['--delay' as string]: "6s"   }} />

          {/* Diagonal sweep beam */}
          <div className="beam-sweep" style={{ ['--delay' as string]: "5s" }} />
        </div>

        {/* Top status bar */}
        <div className="relative border-b border-white/[0.06] bg-white/[0.015] backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between text-[10px] font-mono-ui uppercase">
            <div className="flex items-center gap-4 text-white/55">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                SYS · ONLINE
              </span>
              <span className="hidden sm:inline text-white/30">·</span>
              <span className="hidden sm:inline">NODES <span className="text-cyan-300">{stats.storeCount}</span>/4 SYNC</span>
              <span className="hidden md:inline text-white/30">·</span>
              <span className="hidden md:inline">LAT <span className="text-emerald-300">12ms</span></span>
            </div>
            <div className="flex items-center gap-3 text-white/40">
              <span className="hidden sm:inline">BUILD <span className="text-white/65">{buildId}</span></span>
              <span className="text-white/30">·</span>
              <span>v3.1.0</span>
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative px-4 sm:px-6 pt-16 pb-28 sm:pt-24 sm:pb-36">
          <div className="max-w-5xl mx-auto">

            {/* Eyebrow tag */}
            <div className="flex justify-center mb-7">
              <div className="relative inline-flex items-center gap-2 px-3.5 h-7 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur font-mono-ui">
                <span className="text-[10px] text-cyan-300/90">[ ORVEXIA · OS ]</span>
                <span className="text-white/25">·</span>
                <span className="text-[10px] text-white/60">PRICE INTELLIGENCE</span>
              </div>
            </div>

            {/* Headline */}
            <h1
              className="font-extrabold mb-7 text-center text-white"
              style={{
                fontSize: "clamp(2.6rem, 8vw, 6rem)",
                lineHeight: 0.98,
                letterSpacing: "-0.05em",
              }}
            >
              <span className="block">Compara precios.</span>
              <span className="block text-gradient-neon text-glow-brand">Ahorra siempre.</span>
            </h1>

            <p className="text-center mb-10 max-w-xl mx-auto leading-relaxed text-white/55"
               style={{ fontSize: "clamp(0.95rem, 1.2vw, 1.05rem)" }}>
              Monitorizamos precios en las principales tiendas de España para que compres siempre en el momento y al precio correcto.
            </p>

            {/* Search with HUD frame */}
            <div className="relative z-40 max-w-2xl mx-auto mb-12">
              <HudFrame className="relative text-cyan-400/70">
                <div className="rounded-2xl p-px"
                     style={{ background: "linear-gradient(135deg, rgba(94,234,212,0.35), rgba(129,140,248,0.35), rgba(240,171,252,0.35))" }}>
                  <div className="rounded-[15px] bg-black/40 backdrop-blur-md p-3">
                    <HeroSearch />
                  </div>
                </div>
              </HudFrame>
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono-ui text-white/35">
                <span>QUERY · readyState=1</span>
                <span className="text-cyan-300/70">↵ exec</span>
              </div>
            </div>

            {/* Stats — terminal style */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-3xl mx-auto mb-10">
              {[
                { value: stats.productCount.toLocaleString("es-ES"), label: "productos indexados", code: "DB.products", color: "#5eead4" },
                { value: stats.withDiscount.toLocaleString("es-ES"), label: "ofertas con descuento", code: "DB.deals",    color: "#a3e635" },
                { value: stats.storeCount,                            label: "tiendas conectadas",  code: "DB.stores",   color: "#f0abfc" },
              ].map((s) => (
                <div key={s.code} className="relative">
                  <HudFrame className="relative" >
                    <div className="rounded-xl bg-white/[0.025] border border-white/[0.06] backdrop-blur-sm p-3 sm:p-4">
                      <div className="font-mono-ui text-[9px] sm:text-[10px] mb-1.5" style={{ color: s.color }}>
                        ▸ {s.code}
                      </div>
                      <div className="tabular font-extrabold text-xl sm:text-3xl tracking-tight text-white leading-none">
                        {s.value}
                      </div>
                      <div className="mt-1.5 text-[10px] sm:text-[11px] text-white/45 leading-tight">
                        {s.label}
                      </div>
                    </div>
                  </HudFrame>
                </div>
              ))}
            </div>

            {/* Store chips */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="font-mono-ui text-[10px] text-white/30 mr-1">[SYNC ⇄]</span>
              {STORES.map((s) => (
                <span key={s} className="text-[11px] font-medium px-3 h-7 inline-flex items-center rounded-full text-white/65 border border-white/[0.10] bg-white/[0.025] backdrop-blur-sm">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 mr-2" />
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom ticker */}
        <div className="relative border-y border-white/[0.06] bg-black/30 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center h-9 whitespace-nowrap">
            <div className="flex ticker-track font-mono-ui text-[10px] uppercase">
              {Array.from({ length: 2 }).map((_, dup) => (
                <div key={dup} className="flex">
                  {[
                    "▲ Precio justo · verificado contra 90d histórico",
                    "◆ Alertas de precio gratis · sin spam",
                    "● 0% comisión al usuario · precio final inalterado",
                    "▲ Recomendaciones neutrales · algoritmo abierto",
                    "◆ 4 nodos de tiendas sincronizando precios",
                    "● Datos en tiempo real · TTL 5 min",
                  ].map((t, i) => (
                    <span key={`${dup}-${i}`} className="px-6 text-white/40 flex items-center gap-2">
                      <span className="text-cyan-300/70">{t.slice(0, 1)}</span>
                      <span>{t.slice(2)}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ──────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 pt-20 pb-16 overflow-hidden">
        <div className="hidden sm:block absolute inset-0 bg-grid-cyber-fine opacity-30 pointer-events-none" />
        <div className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] rounded-full pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.12), transparent 70%)" }} />

        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-9">
            <div>
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] mb-2 text-cyan-300/80">
                ▸ /catalog · 08 categorías
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Explora por <span className="text-gradient-neon">categoría</span>
              </h2>
            </div>
            <Link href="/categorias" className="group inline-flex items-center gap-2 font-mono-ui text-[11px] uppercase font-bold px-5 h-10 rounded-full text-cyan-200 border border-cyan-400/30 bg-cyan-400/[0.06] hover:bg-cyan-400/[0.12] hover:border-cyan-400/60 transition-all">
              Ver todas
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.key}
                href={`/categorias?cat=${cat.key}`}
                className="group relative"
              >
                <HudFrame className="relative h-full" >
                  <div className="relative h-full rounded-xl bg-white/[0.025] border border-white/[0.08] hover:border-white/30 backdrop-blur-sm overflow-hidden p-4 flex flex-col items-center gap-3 transition-all duration-300 hover:-translate-y-1"
                       style={{ ['--accent' as string]: cat.accent }}>
                    <div
                      className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ background: `radial-gradient(circle, ${cat.accent}33, transparent 70%)` }}
                    />
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 relative z-10"
                      style={{
                        background: `color-mix(in srgb, ${cat.accent} 14%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${cat.accent} 35%, transparent)`,
                        boxShadow: `0 0 24px -6px ${cat.accent}55`,
                      }}
                    >
                      {cat.icon}
                    </div>
                    <span className="text-[12px] font-bold text-center leading-tight text-white/85 relative z-10">{cat.label}</span>
                    <span className="font-mono-ui text-[9px] text-white/30 relative z-10">{cat.code}</span>
                  </div>
                </HudFrame>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOP DEALS — LIVE MARKET ────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="hidden sm:block absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-60" style={{ background: "radial-gradient(circle, rgba(240,171,252,0.10), transparent 65%)" }} />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-9">
            <div>
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] mb-2 text-fuchsia-300/80 flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-fuchsia-400" />
                </span>
                ▸ /live · mercado en tiempo real
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Ofertas <span className="text-gradient-neon">destacadas</span>
              </h2>
              <p className="mt-2 text-sm text-white/45 max-w-md">
                Top descuentos verificados contra el histórico de 90 días. Cero precios inflados.
              </p>
              <DealsCountdown dayKey={dayKey} />
            </div>
            <Link
              href="/ofertas-destacadas"
              className="group inline-flex items-center gap-2 font-mono-ui text-[11px] uppercase font-bold px-5 h-10 rounded-full text-fuchsia-200 border border-fuchsia-400/30 bg-fuchsia-400/[0.06] hover:bg-fuchsia-400/[0.12] hover:border-fuchsia-400/60 transition-all"
            >
              Ver todas
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          {productos.length === 0 ? (
            <HudFrame className="text-white/30">
              <div className="flex flex-col items-center justify-center py-24 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <span className="text-4xl mb-3">📦</span>
                <p className="font-mono-ui text-[11px] uppercase text-white/40">no_deals · stand_by</p>
              </div>
            </HudFrame>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-5">
              {productos.map((producto, i) => (
                <div key={producto.id} className="group relative">
                  {/* Index marker */}
                  <div className="absolute -top-1.5 -left-1.5 sm:-top-2 sm:-left-2 z-10 flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 h-5 sm:h-6 rounded sm:rounded-md bg-black/80 border border-white/15 backdrop-blur-sm font-mono-ui text-[8px] sm:text-[9px] uppercase text-white/65">
                    <span className="text-cyan-300">#</span>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="rounded-lg sm:rounded-2xl overflow-hidden ring-1 ring-white/[0.06] group-hover:ring-cyan-400/30 transition-all duration-300 shadow-lg shadow-black/30">
                    <MysteryDealCard product={producto} priority={i === 0} revealKey={dayKey} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS — PROTOCOL ─────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-dots-soft opacity-50 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] mb-3 text-emerald-300/80">
              ▸ /protocol · 03 pasos
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
              Protocolo de <span className="text-gradient-neon">ahorro</span>
            </h2>
            <p className="text-sm leading-relaxed max-w-md mx-auto text-white/50">
              Tres pasos. Cero fricción. Compra al precio justo en menos de un minuto.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-0">
            {/* Connector line */}
            <div className="hidden md:block absolute top-[68px] left-[16%] right-[16%] h-px"
                 style={{ background: "linear-gradient(90deg, transparent, rgba(129,140,248,0.35) 20%, rgba(94,234,212,0.35) 50%, rgba(163,230,53,0.35) 80%, transparent)" }} />

            {HOW_IT_WORKS.map((step, idx) => (
              <div key={step.n} className="relative md:px-4">
                {/* Step node */}
                <div className="flex justify-center mb-5 md:mb-7 relative z-10">
                  <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-void-deep border-2"
                       style={{ borderColor: step.accent, boxShadow: `0 0 32px -6px ${step.accent}77` }}>
                    <span style={{ color: step.accent }}>{step.icon}</span>
                    <div className="absolute -inset-1 rounded-2xl opacity-30 blur-md -z-10" style={{ background: step.accent }} />
                  </div>
                </div>

                <HudFrame className="text-white/20">
                  <div className="relative rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm p-6 sm:p-7 text-center hover:border-white/20 hover:-translate-y-0.5 transition-all duration-300 h-full">
                    <div className="flex items-center justify-center gap-2 mb-3 font-mono-ui text-[10px] uppercase">
                      <span className="text-white/40">step</span>
                      <span style={{ color: step.accent }}>{step.n}</span>
                      <span className="text-white/30">·</span>
                      <span className="text-white/50">{step.cmd}()</span>
                    </div>
                    <h3 className="text-xl font-extrabold mb-2 text-white tracking-tight">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-white/55 max-w-xs mx-auto">{step.desc}</p>

                    {idx < HOW_IT_WORKS.length - 1 && (
                      <div className="md:hidden mt-4 flex justify-center text-white/30">↓</div>
                    )}
                  </div>
                </HudFrame>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REGISTER PERKS — COMMAND PANEL ─────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-20">
        <div className="relative max-w-7xl mx-auto">
          <div className="neon-border rounded-3xl overflow-hidden">
            <div className="relative bg-grid-cyber overflow-hidden rounded-[calc(1.5rem-1px)]" style={{ background: "linear-gradient(150deg, #0b0d1c 0%, #08091a 50%, #050913 100%)" }}>
              <div className="absolute inset-0 bg-grid-cyber-fine opacity-40 pointer-events-none" />
              <div className="hidden sm:block absolute -top-32 -right-32 w-80 h-80 rounded-full halo-breathe" style={{ background: "radial-gradient(circle, rgba(129,140,248,0.25), transparent 65%)" }} />
              <div className="hidden sm:block absolute -bottom-24 -left-24 w-72 h-72 rounded-full halo-breathe" style={{ background: "radial-gradient(circle, rgba(94,234,212,0.18), transparent 65%)", animationDelay: "2s" }} />

              {/* Console header bar */}
              <div className="relative border-b border-white/[0.08] px-6 sm:px-10 h-10 flex items-center justify-between font-mono-ui text-[10px] uppercase">
                <div className="flex items-center gap-3 text-white/40">
                  <span className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400/70" />
                    <span className="w-2 h-2 rounded-full bg-amber-400/70" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400/70" />
                  </span>
                  <span>orvexia@user · ~/dashboard</span>
                </div>
                <span className="text-emerald-300/70">● live</span>
              </div>

              <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-0">

                {/* Left: pitch */}
                <div className="p-8 sm:p-10 lg:p-14 flex flex-col justify-between gap-10">
                  <div>
                    <span className="inline-flex items-center gap-2 font-mono-ui text-[10px] uppercase mb-7 px-3 h-7 rounded-full bg-white/[0.06] border border-white/[0.12] text-white/70">
                      <span className="w-1 h-1 rounded-full bg-cyan-300" />
                      ▸ /signup · gratis
                    </span>
                    <h2 className="font-extrabold leading-[1.04] mb-5 tracking-tight text-white" style={{ fontSize: "clamp(1.9rem, 3.2vw, 2.7rem)" }}>
                      Un panel hecho<br />
                      <span className="text-gradient-neon">para ahorrar.</span>
                    </h2>
                    <p className="text-sm leading-relaxed text-white/55 max-w-md mb-6">
                      Seguimiento, alertas y comparativas privadas para comprar en el momento exacto y al mejor precio.
                    </p>

                    {/* Terminal lines */}
                    <div className="font-mono-ui text-[11px] space-y-1 text-white/55 max-w-md">
                      <div><span className="text-emerald-300">$</span> orvexia init <span className="text-white/30">--free</span></div>
                      <div className="text-white/35">  ✓ 0€ siempre · sin tarjeta</div>
                      <div className="text-white/35">  ✓ alertas ilimitadas</div>
                      <div className="text-white/35">  ✓ historial 90 días</div>
                      <div className="text-white/35">  ✓ exportable + privado</div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <span className="aura-cta inline-flex rounded-xl">
                      <Link
                        href="/register"
                        className="inline-flex items-center justify-center font-bold px-6 h-12 rounded-xl text-sm bg-white text-black hover:bg-white/90 transition-all active:scale-[0.97]"
                      >
                        Crear cuenta gratis →
                      </Link>
                    </span>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center justify-center font-semibold px-6 h-12 rounded-xl text-sm text-white/80 hover:text-white border border-white/15 hover:border-white/40 hover:bg-white/[0.04] transition-all active:scale-[0.97] font-mono-ui uppercase tracking-wider"
                    >
                      ./dashboard.demo
                    </Link>
                  </div>
                </div>

                {/* Right: 4 modules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px lg:border-l border-white/[0.08] bg-white/[0.04]">
                  {REGISTER_PERKS.map((perk) => (
                    <div
                      key={perk.title}
                      className="group p-6 transition-all duration-300 bg-[#070918] hover:bg-white/[0.02] relative overflow-hidden"
                    >
                      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                           style={{ background: `radial-gradient(circle, ${perk.accent}33, transparent 70%)` }} />
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{ background: `${perk.accent}1A`, color: perk.accent, border: `1px solid ${perk.accent}45`, boxShadow: `0 0 16px -4px ${perk.accent}55` }}
                        >
                          {perk.icon}
                        </div>
                        <span className="font-mono-ui text-[9px] uppercase text-white/30">{perk.code}</span>
                      </div>
                      <h3 className="text-[13px] font-bold text-white mb-1.5">{perk.title}</h3>
                      <p className="text-[12px] leading-relaxed text-white/50">{perk.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── RECOMENDADOS — AI ENGINE ───────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-cyber-fine opacity-25 pointer-events-none" />
        <div className="hidden sm:block absolute top-1/2 left-1/3 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(251,191,36,0.10), transparent 65%)" }} />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <span className="inline-flex items-center gap-2 font-mono-ui text-[10px] uppercase mb-6 px-3 h-7 rounded-full text-amber-300 bg-amber-400/[0.08] border border-amber-400/25">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 pulse-dot" />
                ▸ /engine · recomendaciones
              </span>
              <h2 className="font-extrabold leading-[1.05] mb-4 tracking-tight text-white" style={{ fontSize: "clamp(1.8rem, 2.8vw, 2.4rem)" }}>
                Curación por <span className="text-gradient-neon">algoritmo</span>, no por publicidad.
              </h2>
              <p className="text-sm leading-relaxed mb-8 text-white/55 max-w-md">
                Cruzamos valoraciones reales con descuentos verificados del momento. Si tienes cuenta, el motor aprende de tus favoritos y sugiere productos de las categorías que más te interesan.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <span className="aura-cta inline-flex rounded-xl">
                  <Link
                    href="/recomendados"
                    className="group inline-flex items-center justify-center gap-2 font-bold px-6 h-12 rounded-xl text-sm bg-amber-400 text-amber-950 hover:bg-amber-300 transition-all active:scale-[0.97]"
                  >
                    Ejecutar motor
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                </span>
                <Link
                  href="/categorias"
                  className="inline-flex items-center justify-center font-semibold px-6 h-12 rounded-xl text-sm text-white/75 hover:text-white border border-white/15 hover:border-white/40 transition-all font-mono-ui uppercase tracking-wider"
                >
                  ./categorias
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {[
                {
                  accent: "#A78BFA",
                  title: "Rating ≥ 4.3 con +100 reseñas",
                  desc: "Solo aparecen productos con valoraciones sólidas de compradores verificados, sin inflados.",
                  code: "filter.rating ≥ 4.3 && reviews ≥ 100",
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                    </svg>
                  ),
                },
                {
                  accent: "#5EEAD4",
                  title: "Descuentos reales verificados",
                  desc: "Cruzamos el historial de precios para distinguir descuentos genuinos de precios inflados.",
                  code: "check.price < median(history, 90d)",
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                    </svg>
                  ),
                },
                {
                  accent: "#F0ABFC",
                  title: "Sin publicidad pagada",
                  desc: "Ningún partner puede comprar visibilidad. El orden lo decide solo el algoritmo.",
                  code: "exclude.sponsored = true",
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                    </svg>
                  ),
                },
              ].map((item) => (
                <HudFrame key={item.title} className="text-white/15">
                  <div className="group flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04] transition-all">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${item.accent}1A`, color: item.accent, border: `1px solid ${item.accent}45`, boxShadow: `0 0 20px -6px ${item.accent}66` }}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[14px] font-bold mb-1 text-white">{item.title}</h4>
                      <p className="text-xs leading-relaxed text-white/50 mb-2">{item.desc}</p>
                      <code className="font-mono-ui text-[10px] text-white/35 break-all">{item.code}</code>
                    </div>
                  </div>
                </HudFrame>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ — KNOWLEDGE BASE ────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 pt-12 pb-24 overflow-hidden" aria-labelledby="faq-title">
        <div className="absolute inset-0 pointer-events-none">
          <div className="hidden sm:block absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full" style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.10), transparent 70%)" }} />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] mb-3 text-brand-300">
              ▸ /knowledge_base · v1
            </p>
            <h2 id="faq-title" className="text-3xl sm:text-4xl font-extrabold mb-3 text-white tracking-tight">
              Preguntas <span className="text-gradient-neon">frecuentes</span>
            </h2>
            <p className="text-sm leading-relaxed max-w-md mx-auto text-white/50">
              Lo que la gente nos pregunta antes de empezar a comparar.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {FAQS.map((faq, i) => (
              <details
                key={i}
                className="group rounded-2xl bg-white/[0.02] backdrop-blur-sm border border-white/[0.08] hover:border-white/20 open:border-cyan-400/30 open:bg-white/[0.035] transition-all duration-200"
              >
                <summary className="flex items-start gap-4 px-5 sm:px-6 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-mono-ui text-[10px] font-bold tabular bg-cyan-400/[0.08] text-cyan-200 border border-cyan-400/20 mt-0.5 group-open:bg-cyan-400/15 group-open:border-cyan-400/50 transition-all">
                    Q.{String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-[15px] font-bold leading-snug text-white pt-1.5">{faq.q}</span>
                  <span
                    aria-hidden="true"
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 transition-transform duration-200 group-open:rotate-180 bg-white/[0.04] border border-white/10 text-white/60"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </span>
                </summary>
                <div className="pb-5 px-5 sm:px-6">
                  <div className="ml-[52px] border-l border-cyan-400/20 pl-5">
                    <p className="font-mono-ui text-[10px] uppercase text-cyan-300/70 mb-2">▸ response</p>
                    <div className="text-sm leading-relaxed text-white/65">{faq.a}</div>
                  </div>
                </div>
              </details>
            ))}
          </div>

          <p className="mt-10 text-center text-xs text-white/40">
            <span className="font-mono-ui text-cyan-300/70 mr-2">[?]</span>
            ¿No encuentras tu respuesta?{" "}
            <a href="mailto:orvexiaesp@gmail.com" className="font-semibold text-cyan-300 hover:text-cyan-200 underline decoration-dotted underline-offset-2">
              Escríbenos
            </a>
            {" "}y la añadimos.
          </p>
        </div>
      </section>

      {/* ── FOR SELLERS — REPRICER CROSS-SELL ───────────────────────────── */}
      {REPRICER_ENABLED && REPRICER_PUBLIC && (
      <section className="relative px-4 sm:px-6 pb-24 overflow-hidden">
        <div className="relative max-w-7xl mx-auto">
          <div className="neon-border rounded-3xl overflow-hidden">
            <div
              className="relative bg-grid-cyber overflow-hidden rounded-[calc(1.5rem-1px)] p-8 sm:p-12 lg:p-16"
              style={{ background: "linear-gradient(150deg, #0b0d1c 0%, #08091a 50%, #050913 100%)" }}
            >
              <div className="absolute inset-0 bg-grid-cyber-fine opacity-40 pointer-events-none" />
              <div
                className="hidden sm:block absolute -top-32 -left-32 w-80 h-80 rounded-full halo-breathe pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(94,234,212,0.20), transparent 65%)" }}
              />
              <div
                className="hidden sm:block absolute -bottom-24 -right-24 w-72 h-72 rounded-full halo-breathe pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(129,140,248,0.22), transparent 65%)", animationDelay: "2s" }}
              />

              <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
                <div className="max-w-xl">
                  <span className="inline-flex items-center gap-2 font-mono-ui text-[10px] uppercase mb-6 px-3 h-7 rounded-full bg-white/[0.06] border border-white/[0.12] text-white/70">
                    <span className="w-1 h-1 rounded-full bg-cyan-300" />
                    ▸ /sellers · b2b
                  </span>
                  <h2
                    className="font-extrabold leading-[1.05] mb-4 tracking-tight text-white"
                    style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.8rem)" }}
                  >
                    ¿Vendes en Amazon?<br />
                    <span className="text-gradient-neon">Reprecia en automático.</span>
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed text-white/55 mb-7">
                    Define un precio mínimo y máximo por producto. Nuestro motor ajusta
                    tus precios cada 5 minutos para que ganes la Buy Box sin regalar
                    margen. Pruébalo en modo demo, sin conectar nada.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href="/sellers"
                      className="inline-flex items-center gap-2 rounded-xl bg-white text-[#0b0d1c] px-6 py-3 text-sm font-bold hover:bg-white/90 transition-colors"
                    >
                      Descubrir Orvexia Repricer
                      <span aria-hidden>→</span>
                    </Link>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/20 text-white px-6 py-3 text-sm font-semibold hover:bg-white/[0.06] transition-colors"
                    >
                      Probar modo demo
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full lg:w-auto lg:min-w-[320px]">
                  {[
                    { v: "5 min", l: "ciclo reprecio" },
                    { v: "min/máx", l: "bajo tu control" },
                    { v: "2 min", l: "setup demo" },
                  ].map((s) => (
                    <div
                      key={s.l}
                      className="rounded-xl bg-white/[0.025] border border-white/[0.08] backdrop-blur-sm p-3 sm:p-4 text-center"
                    >
                      <div className="font-extrabold text-base sm:text-xl tracking-tight text-white leading-none">
                        {s.v}
                      </div>
                      <div className="mt-1.5 text-[10px] sm:text-[11px] text-white/45 leading-tight">
                        {s.l}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

    </main>
  );
}
