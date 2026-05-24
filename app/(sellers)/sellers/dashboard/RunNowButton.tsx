"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface RunResponse {
  ok?: boolean;
  error?: string;
  listingsProcessed?: number;
  listingsRepriced?: number;
  errors?: number;
}

export function RunNowButton() {
  const router = useRouter();
  const { error: toastError, loading: toastLoading, update, dismiss } = useToast();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (busy) return;
    setBusy(true);
    const tid = toastLoading("Ejecutando ciclo de reprecio…", {
      description: "Consultando precios en Amazon y aplicando estrategia.",
    });
    try {
      const res = await fetch("/api/sellers/reprice/run", { method: "POST" });
      const data = (await res.json()) as RunResponse;
      if (!res.ok || !data.ok) {
        update(tid, {
          variant: "error",
          message: "No se pudo ejecutar el ciclo",
          description: data.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      update(tid, {
        variant: "success",
        message: "Ciclo de reprecio completado",
        description: `${data.listingsProcessed ?? 0} procesados · ${data.listingsRepriced ?? 0} reprecidos · ${data.errors ?? 0} errores`,
      });
      startTransition(() => router.refresh());
    } catch (e) {
      dismiss(tid);
      toastError("Error de red al ejecutar el ciclo", {
        description: e instanceof Error ? e.message : "network_error",
      });
    } finally {
      setBusy(false);
    }
  }

  const loading = busy || isPending;

  return (
    <Button
      type="button"
      onClick={run}
      variant="neon"
      size="md"
      loading={loading}
      loadingText="Repreciando…"
      className="w-full"
    >
      Ejecutar reprecio ahora
    </Button>
  );
}
