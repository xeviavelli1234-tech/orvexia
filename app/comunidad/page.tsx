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
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl shadow-cyan-900/30 p-8 md:p-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22D3EE] to-[#7C3AED] text-2xl">
                🚧
              </div>
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.18em] text-white/70">Comunidad</p>
                <h1 className="text-2xl md:text-3xl font-semibold leading-snug">Estamos construyendo algo genial</h1>
                <p className="text-white/80 text-sm md:text-base">
                  La sección de comunidad está en proceso de desarrollo. Estamos afinando la experiencia para que
                  puedas debatir, compartir chollos y seguir productos con la mejor calidad.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-end">
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
    </main>
  );
}
