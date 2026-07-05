import Link from "next/link";

/**
 * Estado de "contenido no disponible temporalmente" para páginas de detalle
 * que no pueden renderizar nada útil sin datos (ficha de producto, comparativa,
 * hilo del foro). Se muestra cuando la BD falla, en lugar de reventar contra el
 * error boundary global ("Algo no ha ido bien") o devolver un 404 engañoso que
 * diría que el contenido no existe. Responde 200 con un mensaje honesto.
 */
export function DataUnavailable({
  title = "Contenido no disponible ahora mismo",
  message = "No hemos podido cargar estos datos. Suele ser temporal: vuelve a intentarlo en unos minutos.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <main className="min-h-[60vh] grid place-items-center px-5">
      <div className="max-w-md text-center">
        <p className="mb-4 flex justify-center">
          <span
            className="inline-flex h-7 items-center rounded-full border border-brand-400/30 bg-brand-400/[0.09] px-3.5 text-[11px] font-semibold tracking-wide text-brand-200"
            style={{ boxShadow: "0 0 24px -6px rgba(129,140,248,0.55)" }}
          >
            Datos temporalmente no disponibles
          </span>
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-white" style={{ letterSpacing: "-0.03em", textWrap: "balance" }}>{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/50">{message}</p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-6 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
