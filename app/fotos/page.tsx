import Link from "next/link";

export const metadata = {
  title: "Fotos y Experiencias · Orvexia",
  description: "Esta sección está en construcción. Muy pronto podrás compartir fotos y experiencias.",
};

export default function FotosPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050310] text-white/90">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[440px] w-[900px] -translate-x-1/2 rounded-full halo-breathe"
        style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.18), transparent 65%)" }}
      />

      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl">
          <div
            className="reveal relative overflow-hidden rounded-3xl border border-brand-400/15 px-6 py-10 text-center sm:px-10"
            style={{ background: "linear-gradient(160deg, #100d26 0%, #0a0819 55%, #070614 100%)" }}
          >
            <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-52 w-[480px] -translate-x-1/2 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.18), transparent 70%)" }} />
            <div aria-hidden className="noise-overlay" />

            <div className="relative">
              <div className="mb-5 flex justify-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-400/35 text-2xl"
                  style={{
                    background: "rgba(129,140,248,0.10)",
                    boxShadow: "0 0 32px -6px rgba(129,140,248,0.5)",
                  }}
                  aria-hidden="true"
                >
                  🚧
                </div>
              </div>
              <span className="inline-flex h-7 items-center rounded-full border border-brand-400/30 bg-brand-400/[0.09] px-3.5 text-[11px] font-semibold tracking-wide text-brand-200">
                En construcción
              </span>
              <h1
                className="mb-3 mt-3 font-extrabold tracking-tight text-white"
                style={{ fontSize: "clamp(1.8rem, 4vw, 2.2rem)", letterSpacing: "-0.03em", textWrap: "balance" }}
              >
                Fotos y <span className="text-shimmer-violet">Experiencias</span>
              </h1>
              <p className="text-sm leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>
                Estamos afinando la galería para que puedas subir imágenes, filtrar por categoría y ver historias destacadas.
                Vuelve en breve: queremos que quede impecable antes de abrirla.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-brand-400/25">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-300">Próximamente</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">Lo que viene</p>
                  <p className="mt-1 text-xs text-white/50">Subidas rápidas, feed curado y colecciones temáticas.</p>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-brand-400/25">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-300">Feedback</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">¿Quieres opinar?</p>
                  <p className="mt-1 text-xs text-white/50">Déjanos ideas en el foro para priorizar tus necesidades.</p>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/comunidad"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-6 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
                >
                  Ir al foro
                </Link>
                <span className="inline-flex h-11 items-center gap-2 rounded-full border border-brand-400/25 bg-brand-400/10 px-6 text-[12px] font-semibold text-brand-200">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-300 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-300" />
                  </span>
                  Lanzamiento muy pronto
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
