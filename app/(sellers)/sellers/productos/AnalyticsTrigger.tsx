"use client";

export function openAnalytics(productId?: string) {
  window.dispatchEvent(
    new CustomEvent("orvexia:open-analytics", { detail: { productId } }),
  );
}

export default function AnalyticsTrigger({
  count,
  errors,
}: {
  count: number;
  errors: number;
}) {
  return (
    <button
      type="button"
      onClick={() => openAnalytics()}
      className="flex items-center justify-between rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] px-3 py-2.5 text-sm text-white/85 hover:bg-cyan-400/10 transition-colors text-left"
    >
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="flex flex-col leading-tight">
          <span>Analíticas y actividad</span>
          <span className="text-[10px] text-white/35">Global · todos los productos</span>
        </span>
      </span>
      <span className="text-[11px] text-white/40">
        {count}
        {errors > 0 && <span className="text-red-400"> · {errors} err</span>}
      </span>
    </button>
  );
}
