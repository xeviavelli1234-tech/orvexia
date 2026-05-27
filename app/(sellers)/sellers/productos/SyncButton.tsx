"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatRelativeShort } from "@/lib/format/relative";

interface SyncResponse {
  count?: number;
  inserted?: number;
  updated?: number;
  deleted?: number;
  error?: string;
  detail?: string;
}

export function SyncButton({ lastSyncAt }: { lastSyncAt: Date | null }) {
  const router = useRouter();
  const { loading: toastLoading, error: toastError, update, dismiss } = useToast();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function handleSync() {
    if (busy) return;
    setBusy(true);
    const tid = toastLoading("Sincronizando con Amazon…", {
      description: "Importando tus listings via SP-API.",
    });
    try {
      const res = await fetch("/api/sellers/listings/sync", { method: "POST" });
      const data = (await res.json()) as SyncResponse;
      if (!res.ok) {
        update(tid, {
          variant: "error",
          message: "Error sincronizando con Amazon",
          description: data.detail ?? data.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      const parts: string[] = [];
      if (data.inserted) parts.push(`${data.inserted} nuevos`);
      if (data.updated) parts.push(`${data.updated} actualizados`);
      if (data.deleted) parts.push(`${data.deleted} eliminados`);
      update(tid, {
        variant: "success",
        message: `${data.count ?? 0} productos sincronizados`,
        description: parts.length ? parts.join(" · ") : "Sin cambios detectados",
      });
      startTransition(() => router.refresh());
    } catch (e) {
      dismiss(tid);
      toastError("Error de red al sincronizar", {
        description: e instanceof Error ? e.message : "network_error",
      });
    } finally {
      setBusy(false);
    }
  }

  const loading = busy || isPending;

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        onClick={handleSync}
        variant="primary"
        size="md"
        loading={loading}
        loadingText="Sincronizando…"
        className="w-full shadow-[0_0_18px_-6px_rgba(99,102,241,0.7)]"
      >
        Sincronizar con Amazon
      </Button>
      {lastSyncAt && (
        <span
          className="text-[11px] text-white/40"
          title={new Intl.DateTimeFormat("es-ES", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(lastSyncAt)}
        >
          Última sync: hace {formatRelativeShort(lastSyncAt)}
        </span>
      )}
    </div>
  );
}
