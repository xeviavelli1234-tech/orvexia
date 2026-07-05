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
      <div className="reveal max-w-md text-center">
        <div className="mb-4 flex justify-center">
          <span className="inline-flex h-6 items-center rounded-full border border-red-400/25 bg-red-400/10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-300">
            Error{error.digest ? ` · ${error.digest}` : ""}
          </span>
        </div>
        <h1
          className="text-3xl font-extrabold tracking-tight text-white"
          style={{ letterSpacing: "-0.03em", textWrap: "balance" }}
        >
          Algo no ha ido bien
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>
          Ha ocurrido un error inesperado al renderizar esta página. No es culpa
          tuya. Inténtalo de nuevo o vuelve a la home; si persiste, escríbenos a{" "}
          <a
            href="mailto:orvexiaesp@gmail.com"
            className="font-semibold text-brand-300 underline decoration-dotted underline-offset-2 hover:text-brand-200"
          >
            orvexiaesp@gmail.com
          </a>
          .
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="shine-on-hover inline-flex h-12 items-center justify-center rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 hover:shadow-[0_0_48px_-4px_rgba(129,140,248,0.9)] active:scale-[0.97]"
            style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
