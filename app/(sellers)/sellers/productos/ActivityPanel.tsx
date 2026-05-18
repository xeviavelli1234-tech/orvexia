"use client";

import { useState } from "react";

export interface EventDTO {
  id: string;
  title: string;
  reason: string;
  priceBefore: number;
  priceAfter: number;
  competitorPrice: number | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string; // ISO
}

interface PlanInfo {
  label: string;
  isTrial: boolean;
  trialDaysLeft: number;
  trialTotal: number;
  intervalMinutes: number;
  trialExpired: boolean;
}

const REASON: Record<string, { label: string; cls: string }> = {
  competitor_undercut: { label: "Bajo competidor", cls: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20" },
  competitor_match: { label: "Igualado", cls: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20" },
  fixed_price: { label: "Precio fijo", cls: "text-indigo-300 bg-indigo-400/10 border-indigo-400/20" },
  margin_floor: { label: "Suelo margen", cls: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
  no_competition: { label: "Sin competencia", cls: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
  min_floor: { label: "Suelo (mín)", cls: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
  max_ceiling: { label: "Techo (máx)", cls: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
  hold: { label: "Mantener", cls: "text-white/50 bg-white/[0.05] border-white/10" },
  no_change: { label: "Sin cambio", cls: "text-white/40 bg-white/[0.04] border-white/10" },
};

function eur(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function rel(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

export default function ActivityPanel({
  events,
  plan,
  lastRunAt,
  proHref,
}: {
  events: EventDTO[];
  plan: PlanInfo;
  lastRunAt: string | null;
  proHref: string;
}) {
  const [open, setOpen] = useState(false);
  const pct = plan.isTrial
    ? Math.max(0, Math.min(100, (plan.trialDaysLeft / plan.trialTotal) * 100))
    : 100;
  const errors = events.filter((e) => !e.success).length;

  return (
    <>
      {/* Tarjeta de plan */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white/90">{plan.label}</span>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              plan.isTrial
                ? "text-[var(--brand-300)] bg-[var(--brand-500)]/15"
                : "text-emerald-300 bg-emerald-400/15"
            }`}
          >
            {plan.isTrial ? "Trial" : "Pro"}
          </span>
        </div>
        {plan.isTrial && (
          <>
            <div className="mt-2 text-[11px] text-white/45">
              {plan.trialExpired
                ? "Prueba expirada"
                : `${plan.trialDaysLeft}/${plan.trialTotal} días restantes`}
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--brand-500)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-white/40">Ciclo cada {plan.intervalMinutes} min</span>
          {plan.isTrial && (
            <a
              href={proHref}
              className="text-[var(--brand-300)] hover:text-white font-semibold"
            >
              Pasar a Pro →
            </a>
          )}
        </div>
      </div>

      {/* Botón actividad */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Actividad reciente
        </span>
        <span className="text-[11px] text-white/40">
          {events.length}
          {errors > 0 && <span className="text-red-400"> · {errors} err</span>}
        </span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[55] grid place-items-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[82vh] flex flex-col rounded-2xl border border-cyan-400/20 bg-[rgba(8,8,18,0.98)] shadow-[0_24px_70px_-18px_rgba(34,211,238,0.4)] fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold text-white/90">Actividad reciente</h3>
                <p className="text-[11px] text-white/40">
                  {lastRunAt ? `Último ciclo ${rel(lastRunAt)}` : "Aún sin ciclos"}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="h-7 w-7 grid place-items-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            {events.length === 0 ? (
              <div className="p-10 text-center text-sm text-white/50">
                Aún no hay actividad. Pulsa “Ejecutar reprecio ahora” o espera al ciclo
                automático.
              </div>
            ) : (
              <ul className="overflow-y-auto divide-y divide-white/[0.05]">
                {events.map((e) => {
                  const r = REASON[e.reason] ?? REASON.no_change;
                  const delta = e.priceAfter - e.priceBefore;
                  const up = delta > 0.0001;
                  const down = delta < -0.0001;
                  return (
                    <li key={e.id} className="px-5 py-3 flex items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate text-white/85">
                          {e.title}
                        </div>
                        <div className="mt-0.5 text-[11px] text-white/40 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span
                            className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${r.cls}`}
                          >
                            {r.label}
                          </span>
                          {e.competitorPrice != null && (
                            <span>comp. {eur(e.competitorPrice)}</span>
                          )}
                          <span>· {rel(e.createdAt)}</span>
                          {!e.success && <span className="text-red-400">· error</span>}
                        </div>
                        {!e.success && e.errorMessage && (
                          <div
                            className="mt-1 text-[10px] text-red-400/80 break-words"
                            title={e.errorMessage}
                          >
                            {e.errorMessage}
                          </div>
                        )}
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <div className="text-sm font-mono text-white/55">
                          {eur(e.priceBefore)}
                          <span className="mx-1.5 text-white/30">→</span>
                          <span
                            className={
                              down
                                ? "text-emerald-300 font-bold"
                                : up
                                  ? "text-cyan-300 font-bold"
                                  : "text-white/55"
                            }
                          >
                            {eur(e.priceAfter)}
                          </span>
                        </div>
                        {(up || down) && (
                          <div
                            className={`text-[10px] font-mono ${down ? "text-emerald-400" : "text-cyan-400"}`}
                          >
                            {down ? "▼" : "▲"} {eur(Math.abs(delta))}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
