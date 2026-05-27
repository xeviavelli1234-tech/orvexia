"use client";

import { useEffect } from "react";
import Link from "next/link";
import { captureException } from "@/lib/monitoring";

/**
 * Error boundary global. Captura cualquier error no manejado en rutas
 * cliente y muestra una pantalla útil en lugar del fallback feo de Next.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Manda a Sentry si está activo + log estructurado siempre.
    // El digest de Next ayuda a correlacionar con logs del servidor.
    void captureException(error, {
      tags: { source: "client-error-boundary" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <main className="min-h-[60vh] grid place-items-center px-5">
      <div className="max-w-md text-center">
        <p className="font-mono-ui text-[10px] uppercase tracking-wider text-rose-300 mb-2">
          ▸ error · {error.digest ?? "client"}
        </p>
        <h1 className="text-3xl font-extrabold text-white">
          Algo no ha ido bien
        </h1>
        <p className="mt-3 text-sm text-white/65">
          Ha ocurrido un error inesperado al renderizar esta página. No es culpa
          tuya. Inténtalo de nuevo o vuelve a la home; si persiste, escríbenos a{" "}
          <a
            href="mailto:orvexiaesp@gmail.com"
            className="text-cyan-300 hover:underline"
          >
            orvexiaesp@gmail.com
          </a>
          .
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={reset}
            className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-700)] transition-colors"
          >
            Reintentar
          </button>
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
