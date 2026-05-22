"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearDemoListingsAction } from "./actions";

interface Props {
  spApiEnv: string;
  envIsProduction: boolean; // env SP_API_ENV del servidor
  listingsCount: number;
}

/**
 * Banner persistente que explica por qué los productos visibles no son
 * los de tu Seller Central:
 *   - spApiEnv != production → estás en modo demo (fixtures sembrados en BD)
 *   - SP_API_ENV != production en Vercel → el motor servirá demo aunque
 *     tu cuenta marcase production
 *
 * Cuando todo esté en producción, el banner desaparece.
 */
export default function DemoBanner({ spApiEnv, envIsProduction, listingsCount }: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  const accountInProd = spApiEnv === "production";
  if (accountInProd && envIsProduction) return null; // todo OK
  if (dismissed) return null;

  function onClearDemo() {
    if (
      !confirm(
        `Voy a borrar los ${listingsCount} productos de demo. Esto deja tu panel vacío hasta que Amazon apruebe tu app SP-API y reconectes. ¿Continuar?`,
      )
    )
      return;
    startTransition(async () => {
      await clearDemoListingsAction();
      router.refresh();
    });
  }

  const reason = !envIsProduction
    ? "El servidor está en modo no-producción (env SP_API_ENV)."
    : "Tu cuenta está marcada como sandbox/demo (esperando aprobación de Amazon)";

  return (
    <div className="border-b border-amber-400/20 bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.04] to-transparent">
      <div className="px-4 py-2.5 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-[11px]">
            ⏳
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-amber-100">
              App SP-API en revisión por Amazon · estás viendo productos demo
            </p>
            <p className="mt-0.5 text-[11px] text-white/60 max-w-[640px]">
              {reason} Los {listingsCount} productos del grafo son simulados (Bosch, Balay,
              LG, Samsung) para que pruebes todo el motor sin tocar tu Seller Central.
              Cuando Amazon apruebe la app, configura{" "}
              <code className="text-amber-300">SP_API_ENV=production</code> y reconecta:
              tus listings reales aparecerán automáticamente.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {listingsCount > 0 && (
            <button
              onClick={onClearDemo}
              disabled={busy}
              className="rounded-md border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
            >
              {busy ? "Borrando…" : "🧹 Vaciar productos demo"}
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            aria-label="Ocultar aviso"
            className="h-6 w-6 grid place-items-center rounded text-white/40 hover:text-white hover:bg-white/10"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
