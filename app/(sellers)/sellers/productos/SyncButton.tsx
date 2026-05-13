"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SyncButton({ lastSyncAt }: { lastSyncAt: Date | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  async function handleSync() {
    setError(null);
    setLastResult(null);
    try {
      const res = await fetch("/api/sellers/listings/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? data.error ?? `HTTP ${res.status}`);
        return;
      }
      setLastResult(
        `Sincronización OK · ${data.count} productos (${data.inserted} nuevos, ${data.updated} actualizados)`,
      );
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "network_error");
    }
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex items-center gap-3">
        {lastSyncAt && (
          <span className="text-xs text-fg/60">
            Última sincronización:{" "}
            {new Intl.DateTimeFormat("es-ES", {
              dateStyle: "short",
              timeStyle: "short",
            }).format(lastSyncAt)}
          </span>
        )}
        <button
          type="button"
          onClick={handleSync}
          disabled={isPending}
          className="rounded-lg bg-[var(--brand-600)] text-white px-5 py-2 text-sm font-semibold hover:bg-[var(--brand-700)] transition-colors disabled:opacity-50"
        >
          {isPending ? "Sincronizando…" : "Sincronizar con Amazon"}
        </button>
      </div>
      {lastResult && <span className="text-xs text-[var(--accent-700)]">{lastResult}</span>}
      {error && <span className="text-xs text-red-600">Error: {error}</span>}
    </div>
  );
}
