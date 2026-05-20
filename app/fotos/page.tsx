import Link from "next/link";

export const metadata = {
  title: "Fotos y Experiencias · Orvexia",
  description: "Esta sección está en construcción. Muy pronto podrás compartir fotos y experiencias.",
};

export default function FotosPage() {
  return (
    <main className="min-h-screen text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-cyber opacity-50" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full halo-breathe"
             style={{ background: "radial-gradient(ellipse at center, rgba(251,146,60,0.20), transparent 65%)" }} />
      </div>

      <div className="relative flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-16">
        <div className="max-w-xl w-full">
          <div className="bg-bg-elevated/95 backdrop-blur-xl border border-white/[0.08] rounded-3xl shadow-2xl shadow-black/50 px-6 sm:px-10 py-10 text-center relative">
            <span aria-hidden className="absolute top-3 left-3 w-3 h-3 border-t border-l border-white/30" />
            <span aria-hidden className="absolute top-3 right-3 w-3 h-3 border-t border-r border-white/30" />
            <span aria-hidden className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-white/30" />
            <span aria-hidden className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-white/30" />

            <div className="flex justify-center mb-5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl relative"
                style={{
                  background: "rgba(251,146,60,0.1)",
                  border: "1px solid rgba(251,146,60,0.45)",
                  boxShadow: "0 0 32px -4px rgba(251,146,60,0.5)",
                }}
                aria-hidden="true"
              >
                🚧
              </div>
            </div>
            <p className="font-mono-ui text-[10px] font-bold tracking-[0.2em] uppercase text-orange-300">▸ /build · in_progress</p>
            <h1 className="text-3xl font-extrabold mt-2 mb-3">Fotos y <span className="text-gradient-neon">Experiencias</span></h1>
            <p className="text-sm text-white/55 leading-relaxed">
              Estamos afinando la galería para que puedas subir imágenes, filtrar por categoría y ver historias destacadas.
              Vuelve en breve: queremos que quede impecable antes de abrirla.
            </p>
            <div className="mt-7 grid sm:grid-cols-2 gap-3">
              <div className="bg-white/[0.025] border border-white/[0.10] rounded-2xl px-4 py-3 text-left">
                <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300/80">▸ next</p>
                <p className="text-sm font-semibold text-white mt-0.5">Lo que viene</p>
                <p className="text-xs text-white/50 mt-1">Subidas rápidas, feed curado y colecciones temáticas.</p>
              </div>
              <div className="bg-white/[0.025] border border-white/[0.10] rounded-2xl px-4 py-3 text-left">
                <p className="font-mono-ui text-[10px] uppercase tracking-wider text-fuchsia-300/80">▸ feedback</p>
                <p className="text-sm font-semibold text-white mt-0.5">¿Quieres opinar?</p>
                <p className="text-xs text-white/50 mt-1">Déjanos ideas en el foro para priorizar tus necesidades.</p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/comunidad"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white border border-white/15 hover:bg-white/[0.06] hover:border-white/30 transition"
              >
                Ir al foro
              </Link>
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono-ui text-xs font-semibold uppercase tracking-wider text-orange-300 bg-orange-400/10 border border-orange-400/30">
                launch · soon
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
