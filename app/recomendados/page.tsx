export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { FuturisticFX } from "@/components/FuturisticFX";
import TopRatedSection, {
  TopRatedSkeleton,
} from "./_components/TopRatedSection";
import CategoriesSection, {
  CategoriesSkeleton,
} from "./_components/CategoriesSection";

export const metadata = { title: "Recomendados · Orvexia" };

export default async function RecomendadosPage() {
  // Única espera bloqueante: la sesión (necesaria para el wall de login).
  // Las dos secciones de contenido streamean en paralelo bajo <Suspense>.
  const session = await getSession();

  if (!session) {
    return (
      <main className="relative z-0 min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid-cyber opacity-50 -z-5" />
        <div
          className="pointer-events-none absolute -top-28 -right-24 w-[460px] h-[460px] rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(129,140,248,0.18), transparent 65%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-20 w-[360px] h-[360px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(94,234,212,0.14), transparent 65%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-10 right-16 w-[280px] h-[280px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(240,171,252,0.14), transparent 65%)",
          }}
        />

        <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-20">
          <div className="max-w-lg w-full bg-bg-elevated border border-white/[0.10] rounded-3xl shadow-xl p-10 text-center space-y-5">
            <div
              className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl relative"
              style={{
                background:
                  "linear-gradient(135deg, rgba(129,140,248,0.18), rgba(168,85,247,0.18))",
                border: "1px solid rgba(129,140,248,0.4)",
                boxShadow: "0 0 32px -6px rgba(129,140,248,0.5)",
              }}
            >
              🔒
            </div>
            <div>
              <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300/80 mb-2">
                ▸ /auth.required
              </p>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Recomendaciones personalizadas
              </h1>
            </div>
            <p className="text-white/55 text-sm leading-relaxed">
              Inicia sesión o crea una cuenta para activar el motor y ver
              recomendaciones basadas en tus productos guardados.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <span className="aura-cta inline-flex rounded-xl">
                <Link
                  href="/login"
                  className="px-5 h-11 inline-flex items-center justify-center rounded-xl text-sm font-bold text-black bg-white hover:bg-white/90 transition-all active:scale-[0.97]"
                >
                  Iniciar sesión
                </Link>
              </span>
              <Link
                href="/register"
                className="px-5 h-11 inline-flex items-center justify-center rounded-xl text-sm font-bold text-cyan-200 border border-cyan-400/40 bg-cyan-400/10 hover:bg-cyan-400/15 hover:border-cyan-400/60 transition-all"
              >
                Crear cuenta gratis
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Hero — sale inmediatamente, no espera a ninguna query. */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid-cyber opacity-50 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <FuturisticFX particleCount={5} streamCount={2} beam seed={9} />
        </div>
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full halo-breathe pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(168,85,247,0.22), transparent 65%)",
          }}
        />
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-50 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(251,191,36,0.18), transparent 65%)",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-3 h-7 rounded-full bg-white/[0.04] border border-white/[0.10] font-mono-ui">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 pulse-dot" />
            <span className="text-[10px] uppercase tracking-wider text-white/65">
              ▸ /engine · curated.for_you
            </span>
          </div>
          <h1
            className="font-extrabold tracking-tight text-white mb-5"
            style={{
              fontSize: "clamp(2.4rem, 6vw, 4.5rem)",
              lineHeight: 1,
              letterSpacing: "-0.045em",
            }}
          >
            Recomendados <span className="text-gradient-neon">para ti</span>
          </h1>
          <p className="text-white/55 text-base max-w-xl mx-auto leading-relaxed">
            Los productos con mejor relación calidad-precio según descuentos
            verificados y valoraciones reales. Sin publicidad pagada.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-14">
        {/* Las dos secciones cargan en paralelo gracias a Suspense. */}
        <Suspense fallback={<TopRatedSkeleton />}>
          <TopRatedSection userId={session.userId} />
        </Suspense>

        <Suspense fallback={<CategoriesSkeleton />}>
          <CategoriesSection />
        </Suspense>

        {/* CTA */}
        <section className="neon-border rounded-3xl overflow-hidden">
          <div
            className="relative bg-grid-cyber p-px rounded-[calc(1.5rem-1px)]"
            style={{
              background: "linear-gradient(135deg, #0a0c18, #06070F)",
            }}
          >
            <div className="absolute inset-0 bg-grid-cyber-fine opacity-30 pointer-events-none" />
            <div className="relative px-8 py-12 text-center">
              <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300 mb-3">
                ▸ /notifications
              </p>
              <p className="text-4xl mb-3">🔔</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
                ¿No encuentras lo que buscas?
              </h2>
              <p className="text-white/55 mb-7 max-w-md mx-auto text-sm leading-relaxed">
                Crea una cuenta y configura alertas de precio. Te avisamos
                cuando el producto que quieres baje de precio.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <span className="aura-cta inline-flex rounded-xl">
                  <Link
                    href="/register"
                    className="bg-white text-black font-bold px-6 h-12 rounded-xl text-sm hover:bg-white/90 transition-all inline-flex items-center justify-center"
                  >
                    Crear cuenta gratis →
                  </Link>
                </span>
                <Link
                  href="/buscar"
                  className="text-white/80 hover:text-white font-semibold px-6 h-12 rounded-xl border border-white/15 hover:border-white/35 text-sm hover:bg-white/[0.04] transition-all inline-flex items-center justify-center font-mono-ui uppercase tracking-wider"
                >
                  ./buscar
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
