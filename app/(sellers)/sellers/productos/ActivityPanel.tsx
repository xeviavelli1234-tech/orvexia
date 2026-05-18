import Link from "next/link";

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

export default function ActivityPanel({
  events,
  plan,
  proHref,
}: {
  events: EventDTO[];
  plan: PlanInfo;
  lastRunAt?: string | null;
  proHref: string;
}) {
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
            <a href={proHref} className="text-[var(--brand-300)] hover:text-white font-semibold">
              Pasar a Pro →
            </a>
          )}
        </div>
      </div>

      {/* Enlace a la página de analíticas */}
      <Link
        href="/sellers/analiticas"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] px-3 py-2.5 text-sm text-white/85 hover:bg-cyan-400/10 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Analíticas y actividad
        </span>
        <span className="text-[11px] text-white/40">
          {events.length}
          {errors > 0 && <span className="text-red-400"> · {errors} err</span>}
          <span className="ml-1 text-white/50">→</span>
        </span>
      </Link>
    </>
  );
}
