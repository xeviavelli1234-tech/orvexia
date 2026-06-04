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
        <p className="font-mono-ui text-[10px] uppercase tracking-wider text-amber-300 mb-2">
          ▸ data · stand_by
        </p>
        <h1 className="text-2xl font-extrabold text-white">{title}</h1>
        <p className="mt-3 text-sm text-white/65">{message}</p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link
            href="/"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/85 hover:bg-white/10 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
