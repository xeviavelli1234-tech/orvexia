"use client";

import { useState } from "react";

/**
 * Banner de confirmación tras conectar/cambiar origen. Antes el redirect del
 * callback rebotaba descartando el ?status, así que el vendedor aterrizaba sin
 * ninguna señal de que la conexión había ido bien. Dismissible.
 */
export function ConnectedBanner({
  status,
  synced,
}: {
  status?: string;
  synced?: number;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  let text: string | null = null;
  if (status === "connected") {
    text =
      synced && synced > 0
        ? `✅ Cuenta de Amazon conectada · ${synced} producto(s) importados`
        : "✅ Cuenta de Amazon conectada. Pulsa “Sincronizar con Amazon” para traer tus productos.";
  } else if (status === "manual_connected") {
    text = "✅ Modo CSV activado. Sube tu catálogo para empezar.";
  }
  if (!text) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-emerald-400/20 bg-gradient-to-r from-emerald-500/[0.10] via-emerald-500/[0.04] to-transparent px-4 py-2.5">
      <span className="text-[12px] font-semibold text-emerald-100">{text}</span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Ocultar aviso"
        className="grid h-6 w-6 place-items-center rounded text-white/40 hover:bg-white/10 hover:text-white"
      >
        ×
      </button>
    </div>
  );
}
