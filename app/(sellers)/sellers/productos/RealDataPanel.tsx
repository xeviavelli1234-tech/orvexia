"use client";

import { useEffect, useState } from "react";
import { syncOrdersAction } from "./actions";

interface SalesKpis {
  ordersTotal: number;
  unitsTotal: number;
  revenueTotal: number;
  ordersByDay: Array<{ day: string; orders: number; units: number; revenue: number }>;
  topSkus: Array<{ sku: string; title: string; units: number; revenue: number }>;
  hourlyDistribution: number[];
}

interface Quota {
  day: string;
  patchCount: number;
  patchRetries: number;
  errorCount: number;
  rateLimitedCount: number;
}

interface BootstrapData {
  quotaToday: Quota | null;
  quotaSeries: Quota[];
  sales: SalesKpis;
}

function fmt(n: number) {
  return n.toLocaleString("es-ES");
}
function eur(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function RealDataButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("orvexia:open-realdata"))}
      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors text-left"
    >
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
        Datos reales
      </span>
      <span className="text-[11px] text-white/40">ventas · cuota →</span>
    </button>
  );
}

export default function RealDataPanel({ open: openProp, onClose }: { open?: boolean; onClose?: () => void } = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  function close() {
    setInternalOpen(false);
    onClose?.();
  }
  // Escucha el evento global como hacen los otros paneles
  useEffect(() => {
    function onOpenEvt() {
      setInternalOpen(true);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("orvexia:open-realdata", onOpenEvt);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("orvexia:open-realdata", onOpenEvt);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <RealDataPanelInner open={open} onClose={close} />;
}

function RealDataPanelInner({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<BootstrapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, days]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [sRes, qRes] = await Promise.all([
        fetch(`/api/sellers/sales?days=${days}`),
        fetch(`/api/sellers/quota`),
      ]);
      if (!sRes.ok) throw new Error("sales endpoint failed");
      const sJson = await sRes.json();
      const qJson = qRes.ok ? await qRes.json() : { ok: false };
      setData({
        sales: sJson.kpis,
        quotaToday: qJson.today ?? null,
        quotaSeries: qJson.series ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function doSync() {
    setSyncing(true);
    try {
      const res = await syncOrdersAction();
      if (res?.ok) await load();
    } finally {
      setSyncing(false);
    }
  }

  if (!open) return null;
  const maxHour = data ? Math.max(1, ...data.sales.hourlyDistribution) : 1;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 backdrop-blur-sm fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[min(800px,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-400/25 bg-[rgba(7,7,18,0.97)] shadow-[0_20px_60px_-20px_rgba(34,211,238,0.55)]"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5 bg-[rgba(7,7,18,0.97)] backdrop-blur-xl">
          <div>
            <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300">
              ▸ datos reales · ventas + cuota
            </p>
            <h3 className="text-base font-bold text-white">Datos reales del repricer</h3>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-xs text-white focus:border-cyan-400/60 focus:outline-none"
            >
              <option value={7}>7 d</option>
              <option value={14}>14 d</option>
              <option value={30}>30 d</option>
              <option value={90}>90 d</option>
            </select>
            <button
              onClick={doSync}
              disabled={syncing}
              className="rounded-lg bg-cyan-500/90 px-3 py-1.5 text-xs font-semibold text-black hover:bg-cyan-400 transition-colors disabled:opacity-50"
            >
              {syncing ? "Sincronizando…" : "↺ Sincronizar pedidos"}
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 grid place-items-center rounded-md text-white/40 hover:text-white hover:bg-white/10"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </header>

        <div className="px-5 py-4 space-y-5">
          {loading && (
            <p className="text-sm text-white/55">Cargando…</p>
          )}
          {error && (
            <p className="text-xs text-rose-300 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2">
              {error}
            </p>
          )}

          {data && (
            <>
              {/* Ventas KPIs */}
              <section>
                <h4 className="text-xs uppercase tracking-wider text-white/45 mb-2">
                  Ventas reales (SP-API Orders)
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <Kpi label="Pedidos" value={fmt(data.sales.ordersTotal)} />
                  <Kpi label="Unidades" value={fmt(data.sales.unitsTotal)} />
                  <Kpi label="Facturación" value={eur(data.sales.revenueTotal)} tone="ok" />
                </div>
              </section>

              {/* Distribución horaria */}
              {data.sales.unitsTotal > 0 && (
                <section>
                  <h4 className="text-xs uppercase tracking-wider text-white/45 mb-2">
                    Heatmap horario (mejor franja de venta)
                  </h4>
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="grid grid-cols-24 gap-0.5">
                      {data.sales.hourlyDistribution.map((v, h) => (
                        <div
                          key={h}
                          title={`${String(h).padStart(2, "0")}:00 — ${v} pedidos`}
                          className="rounded-sm"
                          style={{
                            backgroundColor: `rgba(34, 211, 238, ${Math.min(1, 0.1 + (v / maxHour) * 0.9)})`,
                            height: "32px",
                          }}
                        />
                      ))}
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px] text-white/40">
                      <span>00 h</span>
                      <span>06 h</span>
                      <span>12 h</span>
                      <span>18 h</span>
                      <span>23 h</span>
                    </div>
                  </div>
                </section>
              )}

              {/* Top SKUs */}
              {data.sales.topSkus.length > 0 && (
                <section>
                  <h4 className="text-xs uppercase tracking-wider text-white/45 mb-2">
                    Top SKUs ({data.sales.topSkus.length})
                  </h4>
                  <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/45">
                        <tr>
                          <th className="px-3 py-1.5 text-left">SKU</th>
                          <th className="px-3 py-1.5 text-left">Producto</th>
                          <th className="px-3 py-1.5 text-right">Unidades</th>
                          <th className="px-3 py-1.5 text-right">Ingresos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.sales.topSkus.map((s) => (
                          <tr key={s.sku} className="border-t border-white/5">
                            <td className="px-3 py-1.5 font-mono text-xs text-white/65">
                              {s.sku}
                            </td>
                            <td className="px-3 py-1.5 text-white/85 truncate max-w-[260px]">
                              {s.title}
                            </td>
                            <td className="px-3 py-1.5 text-right text-white/85">{s.units}</td>
                            <td className="px-3 py-1.5 text-right text-emerald-300 tabular-nums">
                              {eur(s.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Cuota PATCH */}
              <section>
                <h4 className="text-xs uppercase tracking-wider text-white/45 mb-2">
                  Cuota del motor de hoy
                </h4>
                {data.quotaToday ? (
                  <div className="grid grid-cols-4 gap-3">
                    <Kpi label="PATCH aplicados" value={fmt(data.quotaToday.patchCount)} />
                    <Kpi
                      label="Reintentos"
                      value={fmt(data.quotaToday.patchRetries)}
                      tone={data.quotaToday.patchRetries > data.quotaToday.patchCount ? "warn" : "neutral"}
                    />
                    <Kpi
                      label="Rate-limited"
                      value={fmt(data.quotaToday.rateLimitedCount)}
                      tone={data.quotaToday.rateLimitedCount > 0 ? "warn" : "neutral"}
                    />
                    <Kpi
                      label="Errores"
                      value={fmt(data.quotaToday.errorCount)}
                      tone={data.quotaToday.errorCount > 0 ? "err" : "ok"}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-white/45">
                    Sin ciclo todavía hoy. Lanza un reprecio manual para empezar a contar.
                  </p>
                )}
              </section>

              {data.sales.ordersTotal === 0 && (
                <div className="rounded-lg border border-amber-400/25 bg-amber-500/[0.06] p-3 text-xs text-amber-200/85">
                  No hay pedidos importados todavía. Pulsa <strong>↺ Sincronizar pedidos</strong>{" "}
                  para traerlos desde Amazon. En modo demo se generan pedidos sintéticos.
                  Para datos reales necesitas la app SP-API con rol <em>Orders</em> aprobado.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "err" | "neutral";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "err"
          ? "text-rose-300"
          : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className={`mt-0.5 text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
