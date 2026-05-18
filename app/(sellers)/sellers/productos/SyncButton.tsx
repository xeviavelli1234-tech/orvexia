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
        `Sincronización OK · ${data.count} productos (${data.inserted} nuevos, ${data.updated} actualizados${data.deleted ? `, ${data.deleted} eliminados` : ""})`,
      );
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "network_error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={isPending}
        className="w-full rounded-xl bg-[var(--brand-600)] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[var(--brand-700)] transition-colors disabled:opacity-50 shadow-[0_0_18px_-6px_rgba(99,102,241,0.7)]"
      >
        {isPending ? "Sincronizando…" : "Sincronizar con Amazon"}
      </button>
      {lastSyncAt && (
        <span className="text-[11px] text-white/40">
          Última sync:{" "}
          {new Intl.DateTimeFormat("es-ES", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(lastSyncAt)}
        </span>
      )}
      {lastResult && <span className="text-[11px] text-emerald-300">{lastResult}</span>}
      {error && <span className="text-[11px] text-red-300">Error: {error}</span>}
    </div>
  );
}
