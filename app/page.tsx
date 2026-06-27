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
import { HudFrame, SectionHeading, Kicker } from "./_components/HomePrimitives";

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
  // Pool de ofertas reales filtradas en BD (no en JS). 200 cubre catálogo
  // actual con margen para la rotación diaria + diversificación. Si la BD no
  // responde (p.ej. cuota agotada) degradamos con elegancia: la home renderiza
  // su shell con el estado vacío en vez de reventar toda la página.
  let valid: DealProduct[];
  try {
    valid = await getCachedDealPool();
  } catch (e) {
    void captureException(e, { tags: { source: "home-deals" }, level: "warning" });
    return [];
  }

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
  // Mismas razones que getTopDeals: cacheado + degradación a ceros si la BD no
  // responde, para no tumbar la home por un fallo de datos.
  try {
    return await getCachedStats();
  } catch (e) {
    void captureException(e, { tags: { source: "home-stats" }, level: "warning" });
    return { productCount: 0, withDiscount: 0, storeCount: 0 };
  }
}

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

// ── Servicios de la plataforma (estilo «suite») ──────────────────────────
// El Repricer se renderiza como tarjeta destacada (ver JSX). Aquí van los
// servicios secundarios de la rejilla: futuros (status "soon") + el comparador
// (disponible, pero secundario). Pensado para crecer: añade objetos al array.
type ServiceStatus = "available" | "soon";
interface ServiceCard {
  id: string;
  name: string;
  code: string;
  status: ServiceStatus;
  tagline: string;
  desc: string;
  href?: string;
  cta?: string;
  accent: string;
  icon: React.ReactNode;
}

const SECONDARY_SERVICES: ServiceCard[] = [
  {
    id: "insights",
    name: "Orvexia Insights",
    code: "SRV-02",
    status: "soon",
    tagline: "Analítica de precios y demanda",
    desc: "Histórico de 90 días, señales de compra y analítica de tu catálogo para decidir con datos, no con intuición.",
    accent: "#818CF8",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 17v-5M12 17V8M17 17v-3" />
      </svg>
    ),
  },
  {
    id: "assistant",
    name: "Orvexia Asistente",
    code: "SRV-03",
    status: "soon",
    tagline: "Copiloto de precios con IA",
    desc: "Un asistente que aprende de tu catálogo y te sugiere la estrategia de precio óptima en lenguaje natural.",
    accent: "#F0ABFC",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 0 0 2.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
      </svg>
    ),
  },
  {
    id: "comparador",
    name: "Orvexia Comparador",
    code: "SRV-04",
    status: "available",
    tagline: "Compara y compra al mejor precio",
    desc: "Compara electrodomésticos en las principales tiendas de España y compra en el momento justo. Gratis, sin recargos.",
    href: "#comparador",
    cta: "Explorar",
    accent: "#A3E635",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
    ),
  },
];

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

export default async function HomePage() {
  const [productos, stats] = await Promise.all([getTopDeals(), getStats()]);
  const dayKey = dailyKey();

  const now = new Date();
  const buildId = now.toISOString().slice(2, 16).replace(/[-:T]/g, "").slice(0, 10);

  // El Repricer solo se promociona como «Disponible» cuando está habilitado y
  // marcado público (REPRICER_PUBLIC=true). Antes de la revisión de Amazon se
  // muestra como «Acceso anticipado» para no promocionarlo abiertamente.
  const repricerLive = REPRICER_ENABLED && REPRICER_PUBLIC;

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

        {/* Anuncio — Repricer gratis para los primeros 10 usuarios */}
        <div className="relative border-b border-emerald-400/20 bg-emerald-400/[0.06] backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-1 text-center">
            <span className="inline-flex items-center gap-1.5 font-mono-ui text-[9px] uppercase px-2 h-5 rounded-full text-emerald-300 bg-emerald-400/[0.12] border border-emerald-400/30 flex-shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              Oferta de lanzamiento
            </span>
            <p className="text-[12px] sm:text-[13px] text-white/75 leading-snug">
              Regalamos el <span className="font-bold text-white">Repricer</span> a los <span className="font-bold text-emerald-300">primeros 10 usuarios</span>. Escríbenos a{" "}
              <a href="mailto:orvexiaesp@gmail.com?subject=Repricer%20gratis%20-%20primeros%2010%20usuarios" className="font-semibold text-emerald-300 hover:text-emerald-200 underline decoration-dotted underline-offset-2">
                orvexiaesp@gmail.com
              </a>
            </p>
          </div>
        </div>

        {/* Hero content — PLATAFORMA */}
        <div className="relative px-4 sm:px-6 pt-16 pb-24 sm:pt-24 sm:pb-28">
          <div className="max-w-5xl mx-auto">

            {/* Eyebrow tag */}
            <div className="flex justify-center mb-7">
              <Kicker
                accent="#22D3EE"
                label={
                  <>
                    <span className="text-cyan-300/90">[ ORVEXIA · OS ]</span>
                    <span className="text-white/25">·</span>
                    <span className="text-white/60">Plataforma de precios</span>
                  </>
                }
              />
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
              <span className="block">Una plataforma.</span>
              <span className="block text-gradient-neon text-glow-brand">Todas tus herramientas.</span>
            </h1>

            <p className="text-center mb-10 max-w-xl mx-auto leading-relaxed text-white/55"
               style={{ fontSize: "clamp(0.95rem, 1.2vw, 1.05rem)" }}>
              Software para vender mejor en Amazon y comprar al mejor precio. Empezamos por el repricer automático y seguimos sumando servicios.
            </p>

            {/* CTAs — dos rutas: plataforma (vendedor) primero, comparador (comprador) después */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
              <span className="aura-cta inline-flex rounded-xl">
                <Link
                  href="#servicios"
                  className="inline-flex items-center justify-center font-bold px-6 h-12 rounded-xl text-sm bg-white text-black hover:bg-white/90 transition-all active:scale-[0.97]"
                >
                  Ver servicios →
                </Link>
              </span>
              <Link
                href="#comparador"
                className="inline-flex items-center justify-center font-semibold px-6 h-12 rounded-xl text-sm text-white/80 hover:text-white border border-white/15 hover:border-white/40 hover:bg-white/[0.04] transition-all active:scale-[0.97] font-mono-ui uppercase tracking-wider"
              >
                Comparar precios
              </Link>
            </div>

            {/* Stats — terminal style (compactas) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto">
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
          </div>
        </div>

        {/* Bottom ticker */}
        <div className="relative border-y border-white/[0.06] bg-black/30 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center h-9 whitespace-nowrap">
            <div className="flex ticker-track font-mono-ui text-[10px] uppercase">
              {Array.from({ length: 2 }).map((_, dup) => (
                <div key={dup} className="flex">
                  {[
                    "▲ Repricer · gana la Buy Box sin regalar margen",
                    "◆ Reprecio automático cada 5 min · min/máx bajo tu control",
                    "● Comparador · precios verificados contra 90d histórico",
                    "▲ Alertas de precio gratis · sin spam",
                    "◆ 0% comisión · el precio final no se altera",
                    "● 4 tiendas sincronizando precios en tiempo real",
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

      {/* ── SERVICIOS — PLATAFORMA (PRINCIPAL) ──────────────────────────── */}
      <section id="servicios" className="relative px-4 sm:px-6 pt-20 pb-20 overflow-hidden scroll-mt-24">
        <div className="hidden sm:block absolute inset-0 bg-grid-cyber-fine opacity-30 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto">
          <SectionHeading
            accent="#5EEAD4"
            kicker="▸ /services · plataforma Orvexia"
            title={<>Nuestros <span className="text-gradient-neon">servicios</span></>}
            subtitle="Una suite que crece. Hoy automatizamos tus precios en Amazon; pronto, mucho más."
          />

          {/* Servicio destacado: Repricer */}
          <div className="neon-border rounded-3xl overflow-hidden mb-5">
            <div
              className="relative bg-grid-cyber overflow-hidden rounded-[calc(1.5rem-1px)] p-7 sm:p-10 lg:p-12"
              style={{ background: "linear-gradient(150deg, #0b0d1c 0%, #08091a 50%, #050913 100%)" }}
            >
              <div className="absolute inset-0 bg-grid-cyber-fine opacity-40 pointer-events-none" />
              <div
                className="hidden sm:block absolute -top-24 -right-24 w-80 h-80 rounded-full halo-breathe pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(94,234,212,0.20), transparent 65%)" }}
              />
              <div className="relative grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-8 lg:gap-12 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(94,234,212,0.12)", border: "1px solid rgba(94,234,212,0.35)", boxShadow: "0 0 24px -6px rgba(94,234,212,0.55)", color: "#5EEAD4" }}
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </div>
                    {repricerLive ? (
                      <span className="inline-flex items-center gap-1.5 font-mono-ui text-[10px] uppercase px-2.5 h-6 rounded-full text-emerald-300 bg-emerald-400/[0.1] border border-emerald-400/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Disponible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-mono-ui text-[10px] uppercase px-2.5 h-6 rounded-full text-amber-300 bg-amber-400/[0.1] border border-amber-400/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Acceso anticipado
                      </span>
                    )}
                    <span className="font-mono-ui text-[9px] uppercase text-white/30 ml-auto">SRV-01</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                    Orvexia Repricer
                  </h3>
                  <p className="text-sm font-semibold text-cyan-200/80 mb-3">
                    Reprecio automático para Amazon
                  </p>
                  <p className="text-sm sm:text-base leading-relaxed text-white/55 mb-7 max-w-md">
                    Define un precio mínimo y máximo por producto. Nuestro motor ajusta tus
                    precios cada 5 minutos para que ganes la Buy Box sin regalar margen.
                    Conecta tu cuenta de Amazon o sube tu catálogo en CSV.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href="/sellers"
                      className="inline-flex items-center gap-2 rounded-xl bg-white text-[#0b0d1c] px-6 py-3 text-sm font-bold hover:bg-white/90 transition-colors"
                    >
                      {repricerLive ? "Abrir servicio" : "Ver el servicio"}
                      <span aria-hidden>→</span>
                    </Link>
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/20 text-white px-6 py-3 text-sm font-semibold hover:bg-white/[0.06] transition-colors"
                    >
                      Crear cuenta gratis
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { v: "5 min", l: "ciclo reprecio" },
                    { v: "min/máx", l: "bajo tu control" },
                    { v: "2 min", l: "puesta en marcha" },
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

          {/* Resto de servicios — rejilla estilo «apps» */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SECONDARY_SERVICES.map((s) => {
              const inner = (
                <div className="group relative h-full rounded-2xl bg-white/[0.025] border border-white/[0.08] hover:border-white/25 backdrop-blur-sm overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1">
                  <div
                    className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${s.accent}33, transparent 70%)` }}
                  />
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: `${s.accent}1A`, color: s.accent, border: `1px solid ${s.accent}45`, boxShadow: `0 0 20px -6px ${s.accent}66` }}
                    >
                      {s.icon}
                    </div>
                    {s.status === "available" ? (
                      <span className="inline-flex items-center gap-1.5 font-mono-ui text-[9px] uppercase px-2 h-5 rounded-full text-emerald-300 bg-emerald-400/[0.1] border border-emerald-400/25">
                        <span className="w-1 h-1 rounded-full bg-emerald-400" /> Disponible
                      </span>
                    ) : (
                      <span className="inline-flex items-center font-mono-ui text-[9px] uppercase px-2 h-5 rounded-full text-white/45 bg-white/[0.04] border border-white/10">
                        Próximamente
                      </span>
                    )}
                  </div>
                  <h3 className="text-[15px] font-bold text-white mb-1.5">{s.name}</h3>
                  <p className="text-[12px] font-semibold mb-2" style={{ color: s.accent }}>{s.tagline}</p>
                  <p className="text-[12px] leading-relaxed text-white/50 mb-5">{s.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono-ui text-[9px] uppercase text-white/25">{s.code}</span>
                    {s.status === "available" ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-white/85 group-hover:text-white">
                        {s.cta ?? "Abrir"}
                        <span className="transition-transform group-hover:translate-x-0.5">→</span>
                      </span>
                    ) : (
                      <span className="font-mono-ui text-[10px] uppercase text-white/30">en construcción</span>
                    )}
                  </div>
                </div>
              );
              return s.href ? (
                <Link key={s.id} href={s.href} className="block h-full scroll-mt-24">
                  {inner}
                </Link>
              ) : (
                <div key={s.id} className="h-full">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── COMPARADOR (COMPACTO) — buscador + solo ofertas top ─────────── */}
      <section id="comparador" className="relative px-4 sm:px-6 pt-20 pb-20 overflow-hidden scroll-mt-24 border-t border-white/[0.06]">
        <div className="hidden sm:block absolute inset-0 bg-grid-cyber-fine opacity-25 pointer-events-none" />
        <div className="hidden sm:block absolute -top-10 right-0 w-[620px] h-[620px] rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(163,230,53,0.10), transparent 65%)" }} />

        <div className="relative max-w-6xl mx-auto">
          <SectionHeading
            accent="#A3E635"
            kicker="▸ /comparador · para compradores"
            title={<>Las mejores ofertas, <span className="text-gradient-neon">hoy</span></>}
            subtitle="Comparamos precios en las principales tiendas de España y te mostramos solo lo que de verdad está rebajado."
          />

          {/* Search with HUD frame */}
          <div className="relative z-40 max-w-2xl mx-auto">
            <HudFrame className="relative text-lime-400/70">
              <div className="rounded-2xl p-px"
                   style={{ background: "linear-gradient(135deg, rgba(163,230,53,0.35), rgba(94,234,212,0.35), rgba(129,140,248,0.35))" }}>
                <div className="rounded-[15px] bg-black/40 backdrop-blur-md p-3">
                  <HeroSearch />
                </div>
              </div>
            </HudFrame>
          </div>

          {/* Store chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <span className="font-mono-ui text-[10px] text-white/30 mr-1">[SYNC ⇄]</span>
            {STORES.map((s) => (
              <span key={s} className="text-[11px] font-medium px-3 h-7 inline-flex items-center rounded-full text-white/65 border border-white/[0.10] bg-white/[0.025] backdrop-blur-sm">
                <span className="w-1 h-1 rounded-full bg-emerald-400 mr-2" />
                {s}
              </span>
            ))}
          </div>

          {/* Solo las ofertas top de hoy (4) */}
          {productos.length > 0 && (
            <div className="mt-14">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-fuchsia-300/80 flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-fuchsia-400" />
                  </span>
                  ▸ /live · ofertas top de hoy
                </p>
                <DealsCountdown dayKey={dayKey} />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {productos.slice(0, 4).map((producto, i) => (
                  <div key={producto.id} className="group relative">
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
            </div>
          )}

          {/* CTA — al comparador completo */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
            <span className="aura-cta inline-flex rounded-xl">
              <Link
                href="/ofertas-destacadas"
                className="group inline-flex items-center justify-center gap-2 font-bold px-6 h-12 rounded-xl text-sm bg-white text-black hover:bg-white/90 transition-all active:scale-[0.97]"
              >
                Ver todas las ofertas
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </span>
            <Link
              href="/categorias"
              className="inline-flex items-center justify-center font-semibold px-6 h-12 rounded-xl text-sm text-white/80 hover:text-white border border-white/15 hover:border-white/40 hover:bg-white/[0.04] transition-all active:scale-[0.97] font-mono-ui uppercase tracking-wider"
            >
              ./categorias
            </Link>
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
                      ./dashboard
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

      {/* ── FAQ — KNOWLEDGE BASE ────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 pt-20 pb-28 overflow-hidden" aria-labelledby="faq-title">
        <div className="absolute inset-0 pointer-events-none">
          <div className="hidden sm:block absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full" style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.10), transparent 70%)" }} />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <SectionHeading
            accent="#818CF8"
            kicker="▸ /knowledge_base · v1"
            title={<span id="faq-title">Preguntas <span className="text-gradient-neon">frecuentes</span></span>}
            subtitle="Lo que la gente nos pregunta antes de empezar a comparar."
          />

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

    </main>
  );
}
