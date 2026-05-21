"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CentroControlError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[sellers/productos]", error.message, error.digest);
  }, [error]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020207] text-white px-5">
      <div className="max-w-md text-center">
        <p className="font-mono-ui text-[10px] uppercase tracking-wider text-rose-300 mb-2">
          ▸ centro de control · error
        </p>
        <h1 className="text-2xl font-extrabold">
          No se pudo cargar tu panel
        </h1>
        <p className="mt-3 text-sm text-white/65">
          Es probable que la base de datos o la API de Amazon no respondieran.
          Inténtalo de nuevo en unos segundos. Si persiste, revisa los logs en
          Vercel.
        </p>
        {error.digest && (
          <p className="mt-2 text-[11px] font-mono text-white/35">
            Ref: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={reset}
            className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-700)] transition-colors"
          >
            Reintentar
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/85 hover:bg-white/10 transition-colors"
          >
            ← Volver al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
