import Link from "next/link";

export default function RepricerComingSoon() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-16 bg-bg text-fg">
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-brand-400/15 p-10 sm:p-16 text-center"
        style={{ background: "linear-gradient(160deg, #100d26 0%, #0a0819 55%, #070614 100%)" }}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-grid-cyber-fine opacity-40"
          style={{
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black 0%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black 0%, transparent 80%)",
          }}
        />
        <div
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full halo-breathe"
          style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.22), transparent 65%)" }}
        />
        <div aria-hidden className="noise-overlay" />
        <div className="relative">
          <span
            className="inline-flex h-7 items-center rounded-full border border-brand-400/30 bg-brand-400/[0.09] px-3.5 text-[11px] font-semibold tracking-wide text-brand-200"
            style={{ boxShadow: "0 0 24px -6px rgba(129,140,248,0.55)" }}
          >
            Para vendedores de Amazon
          </span>
          <h1
            className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-white"
            style={{ letterSpacing: "-0.03em", textWrap: "balance" }}
          >
            Orvexia{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(100deg, #E3E6FF, #A5B4FC)" }}
            >
              Repricer
            </span>
          </h1>
          <span className="mt-4 inline-flex h-6 items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
            En mantenimiento
          </span>
          <p className="mt-5 text-white/50 text-sm max-w-md mx-auto leading-relaxed" style={{ textWrap: "pretty" }}>
            El módulo de reprecio para vendedores de Amazon está
            temporalmente en mantenimiento. Volverá a estar disponible
            en breve.
          </p>
          <Link
            href="/"
            className="shine-on-hover mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 hover:shadow-[0_0_48px_-4px_rgba(129,140,248,0.9)] active:scale-[0.97]"
            style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
          >
            Volver al comparador
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
