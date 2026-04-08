import Link from "next/link";

export const runtime = "nodejs";

export const metadata = {
  title: "Comunidad (en desarrollo)",
  description: "La comunidad está en desarrollo. Muy pronto podrás participar.",
};

export default function ComunidadPage() {
  return (
    <main className="min-h-screen bg-[#0B1224] relative overflow-hidden text-white">
      {/* background flair */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-40 w-[520px] h-[520px] rounded-full bg-[#7C3AED]/25 blur-3xl" />
        <div className="absolute -bottom-24 right-[-60px] w-[520px] h-[520px] rounded-full bg-[#22D3EE]/25 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.10),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04)_15%,transparent_15%,transparent_50%,rgba(255,255,255,0.04)_50%,rgba(255,255,255,0.04)_65%,transparent_65%)] bg-[length:26px_26px] opacity-35" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-white/8 backdrop-blur-2xl shadow-2xl shadow-cyan-900/30 p-8 md:p-12">
            <div className="absolute -inset-x-24 -top-28 h-60 bg-gradient-to-br from-[#7C3AED]/35 via-transparent to-[#22D3EE]/22 blur-3xl opacity-80" />
            <div className="absolute inset-0 rounded-3xl border border-white/5 [mask-image:radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.9),transparent_55%)]" />

            <div className="relative flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22D3EE] to-[#7C3AED] text-2xl shadow-lg shadow-[#7C3AED]/40">
                  🚧
                </div>
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/12 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/70">
                    Comunidad
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-semibold leading-snug">Estamos construyendo algo genial</h1>
                  <p className="text-white/80 text-sm md:text-base">
                    La sección de comunidad está en desarrollo. Afinamos la experiencia para que puedas debatir, compartir
                    chollos y seguir productos con la mejor calidad.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-white/80 text-xs md:text-sm">
                <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/8 px-3 py-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]" />
                  Moderación y seguridad primero
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/8 px-3 py-3">
                  <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_0_4px_rgba(56,189,248,0.18)]" />
                  Hilos, reseñas y alertas en un mismo espacio
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/8 px-3 py-3">
                  <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_0_4px_rgba(252,211,77,0.22)]" />
                  Notificaciones en tiempo real próximamente
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-xl bg-white text-[#0B1224] px-4 py-2.5 text-sm font-semibold shadow-lg shadow-cyan-900/30 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Volver al inicio
                </Link>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white/90 backdrop-blur-sm hover:border-white/60 transition"
                  disabled
                >
                  Próximamente
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
