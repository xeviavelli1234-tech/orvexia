/**
 * Loading state mientras se carga el Centro de control (que tarda lo
 * que tarda Prisma + Amazon en responder). Mantiene el layout y reduce
 * la sensación de "pantalla en blanco".
 */
export default function CentroControlLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row bg-[#020207] text-white">
      <aside className="hidden lg:flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[rgba(6,6,16,0.96)] backdrop-blur-xl">
        <div className="px-4 py-4 space-y-3">
          <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
          <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-white/[0.04] animate-pulse" />
            ))}
          </div>
          <div className="mt-4 h-9 rounded-lg bg-white/10 animate-pulse" />
          <div className="mt-2 h-9 rounded-lg bg-white/[0.04] animate-pulse" />
          <div className="mt-6 space-y-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 rounded-lg bg-white/[0.03] animate-pulse"
              />
            ))}
          </div>
        </div>
      </aside>

      <section className="relative flex-1 min-h-0 bg-[radial-gradient(ellipse_at_50%_45%,#10173a_0%,#0a0d24_45%,#05060f_100%)] grid place-items-center">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          <p className="mt-4 font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300">
            ▸ cargando centro de control
          </p>
          <p className="mt-1 text-xs text-white/45">
            sincronizando productos y configuración…
          </p>
        </div>
      </section>
    </div>
  );
}
