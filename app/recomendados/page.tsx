export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import TopRatedSection, {
  TopRatedSkeleton,
} from "./_components/TopRatedSection";
import CategoriesSection, {
  CategoriesSkeleton,
} from "./_components/CategoriesSection";
import { SectionChip } from "@/app/_components/SectionPrimitives";

export const metadata = { title: "Recomendados · Orvexia" };

export default async function RecomendadosPage() {
  // Única espera bloqueante: la sesión (necesaria para el wall de login).
  // Las dos secciones de contenido streamean en paralelo bajo <Suspense>.
  const session = await getSession();

  if (!session) {
    return (
      <main className="relative z-0 min-h-screen overflow-hidden bg-[#050310] text-white/90">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[440px] w-[900px] -translate-x-1/2 rounded-full halo-breathe"
          style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.18), transparent 65%)" }}
        />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-20">
          <div
            className="reveal relative w-full max-w-lg space-y-5 overflow-hidden rounded-3xl border border-brand-400/15 p-10 text-center"
            style={{ background: "linear-gradient(160deg, #100d26 0%, #0a0819 55%, #070614 100%)" }}
          >
            <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-44 w-[420px] -translate-x-1/2 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.18), transparent 70%)" }} />
            <div
              className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-400/35 text-2xl"
              style={{
                background: "rgba(129,140,248,0.10)",
                boxShadow: "0 0 32px -6px rgba(129,140,248,0.5)",
              }}
            >
              🔒
            </div>
            <h1 className="relative text-2xl font-extrabold tracking-tight text-white" style={{ letterSpacing: "-0.03em" }}>
              Recomendaciones personalizadas
            </h1>
            <p className="relative text-sm leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>
              Inicia sesión o crea una cuenta para activar el motor y ver
              recomendaciones basadas en tus productos guardados.
            </p>
            <div className="relative flex flex-col justify-center gap-3 pt-2 sm:flex-row">
              <Link
                href="/login"
                className="shine-on-hover inline-flex h-12 items-center justify-center rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 hover:shadow-[0_0_48px_-4px_rgba(129,140,248,0.9)] active:scale-[0.97]"
                style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
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
    <main className="min-h-screen bg-[#050310] text-white/90">
      {/* Hero — sale inmediatamente, no espera a ninguna query. */}
      <section className="relative overflow-hidden border-b border-white/[0.05]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-full halo-breathe"
          style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.20), transparent 65%)" }}
        />

        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-24">
          <div className="reveal">
            <SectionChip label="Curado para ti" />
            <h1
              className="mb-5 mt-5 font-extrabold tracking-tight text-white"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)", lineHeight: 1.02, letterSpacing: "-0.04em", textWrap: "balance" }}
            >
              Recomendados <span className="text-shimmer-violet">para ti</span>
            </h1>
            <p className="mx-auto max-w-xl text-base leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>
              Los productos con mejor relación calidad-precio según descuentos
              verificados y valoraciones reales. Sin publicidad pagada.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6">
        {/* Las dos secciones cargan en paralelo gracias a Suspense. */}
        <Suspense fallback={<TopRatedSkeleton />}>
          <TopRatedSection userId={session.userId} />
        </Suspense>

        <div aria-hidden className="divider-glow mx-auto max-w-4xl" />

        <Suspense fallback={<CategoriesSkeleton />}>
          <CategoriesSection />
        </Suspense>

        {/* CTA */}
        <section
          className="reveal relative overflow-hidden rounded-3xl border border-brand-400/15"
          style={{ background: "linear-gradient(160deg, #100d26 0%, #0a0819 55%, #070614 100%)" }}
        >
          <div aria-hidden className="pointer-events-none absolute -top-28 left-1/2 h-72 w-[560px] -translate-x-1/2 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.18), transparent 70%)" }} />
          <div aria-hidden className="noise-overlay" />
          <div className="relative px-8 py-12 text-center">
            <p className="mb-3 text-4xl">🔔</p>
            <h2
              className="mb-2 font-extrabold tracking-tight text-white"
              style={{ fontSize: "clamp(1.5rem, 3vw, 1.9rem)", letterSpacing: "-0.03em", textWrap: "balance" }}
            >
              ¿No encuentras lo que buscas?
            </h2>
            <p className="mx-auto mb-7 max-w-md text-sm leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>
              Crea una cuenta y configura alertas de precio. Te avisamos
              cuando el producto que quieres baje de precio.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="shine-on-hover inline-flex h-12 items-center justify-center rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 hover:shadow-[0_0_48px_-4px_rgba(129,140,248,0.9)] active:scale-[0.97]"
                style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
              >
                Crear cuenta gratis →
              </Link>
              <Link
                href="/buscar"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
              >
                Buscar productos
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
