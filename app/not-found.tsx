import Link from "next/link";

export const metadata = {
  title: "404 · No encontrado · Orvexia",
};

export default function NotFound() {
  return (
    <main className="min-h-[60vh] grid place-items-center px-5">
      <div className="max-w-md text-center">
        <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300 mb-2">
          ▸ 404 · ruta no encontrada
        </p>
        <h1 className="text-5xl font-extrabold text-white">404</h1>
        <h2 className="mt-2 text-xl font-bold text-white/85">
          Esta página no existe (o ya no)
        </h2>
        <p className="mt-3 text-sm text-white/60">
          Quizá el enlace está roto, el producto fue retirado o escribiste algo
          mal en la URL.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
          <Link
            href="/"
            className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-700)] transition-colors"
          >
            Volver al inicio
          </Link>
          <Link
            href="/categorias"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/85 hover:bg-white/10 transition-colors"
          >
            Ver categorías
          </Link>
          <Link
            href="/buscar"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/85 hover:bg-white/10 transition-colors"
          >
            Buscar producto
          </Link>
        </div>
      </div>
    </main>
  );
}
