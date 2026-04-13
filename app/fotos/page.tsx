export const metadata = {
  title: "Fotos y Experiencias · Orvexia",
  description: "Esta sección está en construcción. Muy pronto podrás compartir fotos y experiencias.",
};

export default function FotosPage() {
  return (
    <main className="min-h-screen bg-[#0F172A] text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-blue-500 opacity-[0.08] blur-3xl" />
        <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-violet-400 opacity-[0.08] blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/3 w-80 h-80 rounded-full bg-sky-400 opacity-[0.06] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 25% 30%, #fff 1px, transparent 0), radial-gradient(circle at 75% 70%, #fff 1px, transparent 0)",
            backgroundSize: "120px 120px",
          }}
        />
      </div>

      <div className="relative flex items-center justify-center min-h-screen px-4 py-16">
        <div className="max-w-xl w-full">
          <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.35)] px-6 sm:px-8 py-8 sm:py-10 text-center">
            <div className="flex justify-center mb-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-[0_10px_30px_rgba(234,88,12,0.25)]"
                style={{ background: "linear-gradient(135deg,#FDBA74,#FB923C)", color: "#7C2D12" }}
                aria-hidden="true"
              >
                🚧
              </div>
            </div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-orange-200">En construcción</p>
            <h1 className="text-3xl font-extrabold mt-2 mb-3">Fotos y Experiencias</h1>
            <p className="text-sm text-blue-100/80 leading-relaxed">
              Estamos afinando la galería para que puedas subir imágenes, filtrar por categoría y ver historias destacadas.
              Vuelve en breve: queremos que quede impecable antes de abrirla.
            </p>
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-left">
                <p className="text-sm font-semibold text-white">Lo que viene</p>
                <p className="text-xs text-blue-100/70 mt-1">Subidas rápidas, feed curado y colecciones temáticas.</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-left">
                <p className="text-sm font-semibold text-white">¿Quieres opinar?</p>
                <p className="text-xs text-blue-100/70 mt-1">Déjanos ideas en el foro para priorizar tus necesidades.</p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="/comunidad"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white border border-white/20 hover:bg-white/10 transition"
              >
                Ir al foro
              </a>
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0F172A] bg-white shadow-[0_10px_30px_rgba(255,255,255,0.15)]">
                Lanzamiento: pronto
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
