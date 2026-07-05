export const dynamic = "force-dynamic";

import { Suspense } from "react";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
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
    <main className="min-h-screen bg-[#050310] text-white/90">
      {/* Cabecera */}
      <section className="relative overflow-hidden border-b border-white/[0.05]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full halo-breathe"
          style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.18), transparent 65%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <nav aria-label="Miga de pan" className="mb-6 flex items-center gap-2 text-[11px] font-semibold text-white/40">
            <Link href="/" className="transition-colors hover:text-brand-200">Inicio</Link>
            <span aria-hidden className="text-white/20">›</span>
            <span className="text-brand-300">Buscar</span>
          </nav>

          {q ? (
            <div className="reveal flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="mb-3 inline-flex h-7 items-center rounded-full border border-brand-400/30 bg-brand-400/[0.09] px-3.5 text-[11px] font-semibold tracking-wide text-brand-200">
                  Resultados de búsqueda
                </span>
                <h1
                  className="font-extrabold tracking-tight text-white"
                  style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", lineHeight: 1.05, letterSpacing: "-0.035em", textWrap: "balance" }}
                >
                  &ldquo;<span className="text-shimmer-violet">{q}</span>&rdquo;
                </h1>
                <p className="mt-3 text-[13px] text-white/50">
                  {results.length > 0 ? (
                    <>
                      <span className="font-bold tabular text-white">{results.length}</span> resultado{results.length !== 1 ? "s" : ""} encontrado{results.length !== 1 ? "s" : ""}
                    </>
                  ) : (
                    "Sin resultados"
                  )}
                </p>
              </div>
              {results.length > 0 && (
                <Link
                  href="/ofertas-destacadas"
                  className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-full border border-white/12 bg-white/[0.03] px-6 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97] sm:self-end"
                >
                  Ver todas las ofertas
                  <span aria-hidden>→</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="reveal">
              <span className="mb-3 inline-flex h-7 items-center rounded-full border border-brand-400/30 bg-brand-400/[0.09] px-3.5 text-[11px] font-semibold tracking-wide text-brand-200">
                Buscador
              </span>
              <h1
                className="font-extrabold tracking-tight text-white"
                style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", lineHeight: 1.05, letterSpacing: "-0.035em", textWrap: "balance" }}
              >
                Encuentra <span className="text-shimmer-violet">cualquier</span> electrodoméstico
              </h1>
              <p className="mt-3 max-w-md text-sm text-white/50" style={{ textWrap: "pretty" }}>
                Usa el buscador del menú superior. Te mostramos los precios de las principales tiendas en tiempo real.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {!q ? (
          <div
            className="reveal relative overflow-hidden rounded-3xl border border-brand-400/15 p-10 text-center sm:p-14"
            style={{ background: "linear-gradient(160deg, #100d26 0%, #0a0819 55%, #070614 100%)" }}
          >
            <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[480px] -translate-x-1/2 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.18), transparent 70%)" }} />
            <div className="relative">
              <div
                className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-400/35 text-brand-200"
                style={{ background: "rgba(129,140,248,0.10)", boxShadow: "0 0 24px -6px rgba(129,140,248,0.5)" }}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </div>
              <p className="mb-1.5 text-base font-bold text-white">¿Qué estás buscando?</p>
              <p className="mb-7 text-sm text-white/50">Prueba con alguna de estas búsquedas populares</p>
              <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
                {TRENDING_TERMS.map((s) => (
                  <Link
                    key={s}
                    href={`/buscar?q=${encodeURIComponent(s)}`}
                    className="inline-flex h-9 items-center rounded-full border border-white/[0.10] bg-white/[0.025] px-4 text-sm text-white/70 transition-all hover:border-brand-400/40 hover:bg-brand-400/[0.08] hover:text-brand-100"
                  >
                    {s}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div
            className="reveal relative overflow-hidden rounded-3xl border border-white/[0.07] p-10 text-center sm:p-14"
            style={{ background: "linear-gradient(160deg, #100d26 0%, #0a0819 55%, #070614 100%)" }}
          >
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.04]">
              <svg className="h-6 w-6 text-white/45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M9 9h.01M15 9h.01" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 16c1-1 2-1.5 3-1.5s2 .5 3 1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="mb-1.5 text-base font-bold text-white">Sin resultados para &ldquo;{q}&rdquo;</p>
            <p className="mb-7 text-sm text-white/50">Prueba con otro término o explora nuestras categorías</p>
            <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
              {Object.entries(CATEGORY_LABELS).slice(0, 6).map(([key, label]) => (
                <Link
                  key={key}
                  href={`/categorias/${key.toLowerCase()}`}
                  className="inline-flex h-9 items-center rounded-full border border-white/[0.10] bg-white/[0.025] px-4 text-sm text-white/70 transition-all hover:border-brand-400/40 hover:bg-brand-400/[0.08] hover:text-brand-100"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Suspense>
            <div className="reveal grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
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
