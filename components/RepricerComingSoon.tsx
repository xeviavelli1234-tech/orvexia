import Link from "next/link";

export default function RepricerComingSoon() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-16 bg-bg text-fg">
      <div className="w-full max-w-2xl neon-border rounded-3xl overflow-hidden">
        <div
          className="relative bg-grid-cyber rounded-[calc(1.5rem-1px)] p-10 sm:p-16 text-center"
          style={{ background: "linear-gradient(150deg,#0b0d1c,#08091a 50%,#050913)" }}
        >
          <div className="absolute inset-0 bg-grid-cyber-fine opacity-40 pointer-events-none" />
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full halo-breathe pointer-events-none"
            style={{ background: "radial-gradient(ellipse,rgba(129,140,248,0.25),transparent 65%)" }}
          />
          <div className="relative">
            <span className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300/80">
              ▸ módulo b2b
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Orvexia <span className="text-gradient-neon">Repricer</span>
            </h1>
            <span className="mt-4 inline-block text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-full">
              En mantenimiento
            </span>
            <p className="mt-5 text-white/55 text-sm max-w-md mx-auto leading-relaxed">
              El módulo de reprecio para vendedores de Amazon está
              temporalmente en mantenimiento. Volverá a estar disponible
              en breve.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white text-[#0b0d1c] px-6 py-3 text-sm font-bold hover:bg-white/90 transition-colors"
            >
              Volver al comparador
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
