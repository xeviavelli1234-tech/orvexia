export const dynamic = "force-dynamic";

import { Suspense } from "react";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import { FuturisticFX } from "@/components/FuturisticFX";
import { searchProducts as runSearch } from "@/lib/search";
import { safeData } from "@/lib/safe-data";

const CATEGORY_LABELS: Record<string, string> = {
  TELEVISORES: "Televisores", LAVADORAS: "Lavadoras", FRIGORIFICOS: "Frigoríficos",
  LAVAVAJILLAS: "Lavavajillas", SECADORAS: "Secadoras", HORNOS: "Hornos",
  MICROONDAS: "Microondas", ASPIRADORAS: "Aspiradoras", CAFETERAS: "Cafeteras",
  AIRES_ACONDICIONADOS: "Aire acondicionado", OTROS: "Otros",
};

const TRENDING_TERMS = [
  "Lavadora Samsung", 'TV 65"', "Frigorífico No Frost", "Lavavajillas Bosch",
  "Cafetera Nespresso", "Aspiradora Roomba",
];

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const results =
    q.length >= 2
      ? await safeData<Awaited<ReturnType<typeof runSearch>>>(
          () => runSearch(q, { limit: 24 }),
          [],
          "buscar-results",
        )
      : [];

  return (
    <main className="min-h-screen">
      {/* Header strip */}
      <section className="relative border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 bg-grid-cyber opacity-40 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <FuturisticFX particleCount={4} streamCount={2} beam seed={21} />
        </div>
        <div className="absolute -top-32 left-1/3 w-[800px] h-[400px] rounded-full pointer-events-none"
             style={{ background: "radial-gradient(ellipse, rgba(94,234,212,0.15), transparent 65%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-wider text-white/40 mb-5">
            <Link href="/" className="hover:text-cyan-300 transition-colors">~/</Link>
            <span className="text-white/25">›</span>
            <span className="text-cyan-300">buscar</span>
          </div>

          {q ? (
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <p className="font-mono-ui text-[10px] uppercase tracking-wider mb-2 text-cyan-300">
                  ▸ /query · resultado
                </p>
                <h1 className="font-extrabold tracking-tight text-white"
                    style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", lineHeight: 1.05, letterSpacing: "-0.035em" }}>
                  &ldquo;<span className="text-gradient-neon">{q}</span>&rdquo;
                </h1>
                <p className="mt-3 font-mono-ui text-[11px] uppercase tracking-wider text-white/55">
                  {results.length > 0
                    ? <><span className="text-emerald-300 tabular">{results.length.toString().padStart(2, "0")}</span> match{results.length !== 1 ? "es" : ""} found</>
                    : "no_match · 0 results"}
                </p>
              </div>
              {results.length > 0 && (
                <Link
                  href="/ofertas-destacadas"
                  className="inline-flex items-center gap-2 font-mono-ui text-[11px] uppercase font-bold px-5 h-10 rounded-full text-fuchsia-200 border border-fuchsia-400/30 bg-fuchsia-400/[0.06] hover:bg-fuchsia-400/[0.12] hover:border-fuchsia-400/60 transition-all self-start sm:self-end"
                >
                  Ver todas las ofertas
                  <span aria-hidden>→</span>
                </Link>
              )}
            </div>
          ) : (
            <div>
              <p className="font-mono-ui text-[10px] uppercase tracking-wider mb-2 text-cyan-300">
                ▸ /search · init
              </p>
              <h1 className="font-extrabold tracking-tight text-white"
                  style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", lineHeight: 1.05, letterSpacing: "-0.035em" }}>
                Encuentra <span className="text-gradient-neon">cualquier</span> electrodoméstico
              </h1>
              <p className="mt-3 text-sm text-white/55 max-w-md">
                Usa el buscador del menú superior. Te mostramos los precios de las principales tiendas en tiempo real.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {!q ? (
          <div className="bg-bg-elevated border border-white/[0.08] rounded-2xl p-10 sm:p-14 text-center">
            <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-4"
                 style={{
                   background: "rgba(94,234,212,0.1)",
                   border: "1px solid rgba(94,234,212,0.35)",
                   boxShadow: "0 0 24px -6px rgba(94,234,212,0.5)",
                 }}>
              <svg className="w-6 h-6 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            </div>
            <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300/80 mb-2">▸ stand_by</p>
            <p className="text-base font-bold text-white mb-1.5">¿Qué estás buscando?</p>
            <p className="text-sm text-white/55 mb-7">Prueba con alguna de estas búsquedas populares</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {TRENDING_TERMS.map((s) => (
                <Link
                  key={s}
                  href={`/buscar?q=${encodeURIComponent(s)}`}
                  className="px-4 h-9 inline-flex items-center rounded-full border border-white/[0.10] bg-white/[0.025] text-sm text-white/70 hover:text-cyan-200 hover:border-cyan-400/40 hover:bg-cyan-400/[0.08] transition-all"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="bg-bg-elevated border border-white/[0.08] rounded-2xl p-10 sm:p-14 text-center">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.10] items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white/45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M9 9h.01M15 9h.01" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 16c1-1 2-1.5 3-1.5s2 .5 3 1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="font-mono-ui text-[10px] uppercase tracking-wider text-white/50 mb-2">▸ no_match</p>
            <p className="text-base font-bold text-white mb-1.5">Sin resultados para &ldquo;{q}&rdquo;</p>
            <p className="text-sm text-white/55 mb-7">Prueba con otro término o explora nuestras categorías</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {Object.entries(CATEGORY_LABELS).slice(0, 6).map(([key, label]) => (
                <Link
                  key={key}
                  href={`/categorias/${key.toLowerCase()}`}
                  className="px-4 h-9 inline-flex items-center rounded-full border border-white/[0.10] bg-white/[0.025] text-sm text-white/70 hover:text-cyan-200 hover:border-cyan-400/40 hover:bg-cyan-400/[0.08] transition-all"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Suspense>
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-5">
              {results.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i === 0} />
              ))}
            </div>
          </Suspense>
        )}
      </div>
    </main>
  );
}
