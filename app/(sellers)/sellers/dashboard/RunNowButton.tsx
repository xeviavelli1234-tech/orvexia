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
        className="w-full rounded-xl border border-cyan-400/40 text-cyan-200 px-4 py-2.5 font-semibold hover:bg-cyan-400/10 transition-colors text-sm disabled:opacity-50"
      >
        {isPending ? "Repreciando…" : "Ejecutar reprecio ahora"}
      </button>
      {msg && <span className="text-[11px] text-emerald-300">{msg}</span>}
      {err && <span className="text-[11px] text-red-300">Error: {err}</span>}
    </div>
  );
}
