"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RunNowButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/sellers/reprice/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setMsg(
        `Ciclo OK · ${data.listingsProcessed} procesados, ${data.listingsRepriced} reprecciados, ${data.errors} errores`,
      );
      startTransition(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "network_error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        className="rounded-lg border border-[var(--brand-600)] text-[var(--brand-600)] px-5 py-2.5 font-semibold hover:bg-[var(--brand-600)] hover:text-white transition-colors text-sm disabled:opacity-50"
      >
        {isPending ? "Repreciando…" : "Ejecutar reprecio ahora"}
      </button>
      {msg && <span className="text-xs text-[var(--accent-700)]">{msg}</span>}
      {err && <span className="text-xs text-red-600">Error: {err}</span>}
    </div>
  );
}
