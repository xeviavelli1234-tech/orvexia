import Link from "next/link";

export const metadata = {
  title: "404 · No encontrado · Orvexia",
};

export default function NotFound() {
  return (
    <main className="min-h-[60vh] grid place-items-center px-5">
      <div className="reveal max-w-md text-center">
        <div className="mb-4 flex justify-center">
          <span className="inline-flex h-6 items-center rounded-full border border-brand-400/25 bg-brand-400/10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-200">
            Ruta no encontrada
          </span>
        </div>
        <h1
          className="text-glow-brand text-6xl font-extrabold tracking-tight text-white"
          style={{ letterSpacing: "-0.04em" }}
        >
          404
        </h1>
        <h2 className="mt-3 text-xl font-bold tracking-tight text-white/85" style={{ textWrap: "balance" }}>
          Esta página no existe (o ya no)
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>
          Quizá el enlace está roto, el producto fue retirado o escribiste algo
          mal en la URL.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="shine-on-hover inline-flex h-12 items-center justify-center rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 hover:shadow-[0_0_48px_-4px_rgba(129,140,248,0.9)] active:scale-[0.97]"
            style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
          >
            Volver al inicio
          </Link>
          <Link
            href="/categorias"
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-6 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
          >
            Ver categorías
          </Link>
          <Link
            href="/buscar"
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-6 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
          >
            Buscar producto
          </Link>
        </div>
      </div>
    </main>
  );
}
