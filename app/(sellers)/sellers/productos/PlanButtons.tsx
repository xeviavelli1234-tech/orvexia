"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface GenResponse {
  ok?: boolean;
  processed?: number;
  generated?: number;
  skipped?: number;
  error?: string;
}

/**
 * Botón "Generar plan de precios" — modo manual.
 *
 * Lanza el motor de sugerencias contra todos los listings del vendedor.
 * Reemplaza al botón "Ejecutar reprecio" del modo Amazon. No escribe en
 * ninguna tienda; solo cachea sugerencias en BD para que el export las
 * sirva sin recomputar.
 */
export function GeneratePlanButton({ hasListings }: { hasListings: boolean }) {
  const router = useRouter();
  const { loading: toastLoading, error: toastErr, update, dismiss } = useToast();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (busy) return;
    setBusy(true);
    const tid = toastLoading("Generando plan de precios…", {
      description: "Calculando precio sugerido para cada SKU.",
    });
    try {
      const res = await fetch("/api/sellers/plan/generate", { method: "POST" });
      const data = (await res.json()) as GenResponse;
      if (!res.ok || !data.ok) {
        update(tid, {
          variant: "error",
          message: "No se pudo generar el plan",
          description: data.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      update(tid, {
        variant: "success",
        message: `${data.generated ?? 0} precios sugeridos`,
        description:
          (data.skipped ?? 0) > 0
            ? `${data.processed ?? 0} procesados · ${data.skipped} sin precio actual`
            : "Listo. Pulsa “Exportar plan CSV” para descargarlo.",
      });
      router.refresh();
    } catch (e) {
      dismiss(tid);
      toastErr("Error de red al generar el plan", {
        description: e instanceof Error ? e.message : "network_error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={run}
      variant="neon"
      size="md"
      loading={busy}
      loadingText="Generando…"
      disabled={!hasListings}
      className="w-full"
    >
      Generar plan de precios
    </Button>
  );
}

/**
 * Botón "Exportar plan CSV" — modo manual.
 *
 * Descarga el plan ya generado. El endpoint sirve un CSV con sku, precio
 * actual, precio sugerido, confianza, estrategia y razón. Listo para abrir
 * en Excel o pegar en el panel de la tienda del vendedor.
 */
export function ExportPlanButton({ enabled }: { enabled: boolean }) {
  return (
    <ButtonLink
      href="/api/sellers/plan/export"
      variant="secondary"
      size="md"
      className={`w-full ${!enabled ? "opacity-50 pointer-events-none" : ""}`}
      aria-disabled={!enabled}
    >
      Exportar plan CSV
    </ButtonLink>
  );
}
