import AnalyticsTrigger from "./AnalyticsTrigger";

export interface EventDTO {
  id: string;
  title: string;
  reason: string;
  priceBefore: number;
  priceAfter: number;
  competitorPrice: number | null;
  success: boolean;
  buyBox: "WON" | "LOST" | "UNKNOWN";
  simulated: boolean;
  errorMessage: string | null;
  createdAt: string; // ISO
}

function relTime(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
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
  const changes = events.filter(
    (e) => e.success && Math.abs(e.priceAfter - e.priceBefore) > 0.0001,
  ).length;
  const bbWon = events.filter((e) => e.buyBox === "WON").length;
  const bbTot = bbWon + events.filter((e) => e.buyBox === "LOST").length;
  const bbPct = bbTot > 0 ? Math.round((bbWon / bbTot) * 100) : null;
  const lastChange = events.find(
    (e) => e.success && Math.abs(e.priceAfter - e.priceBefore) > 0.0001,
  );

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

      {/* Mini-resumen de actividad */}
      <div className="grid grid-cols-3 gap-1.5">
        <MiniStat label="Eventos" value={String(events.length)} />
        <MiniStat label="Cambios" value={String(changes)} tone="cyan" />
        <MiniStat
          label="Errores"
          value={String(errors)}
          tone={errors > 0 ? "red" : undefined}
        />
        <MiniStat
          label="% Buy Box"
          value={bbPct != null ? `${bbPct}%` : "—"}
          tone={bbPct != null ? (bbPct >= 50 ? "emerald" : "red") : undefined}
        />
        <MiniStat
          label="Últ. cambio"
          value={lastChange ? relTime(lastChange.createdAt) : "—"}
        />
        <MiniStat
          label="Simulados"
          value={String(events.filter((e) => e.simulated).length)}
        />
      </div>

      {/* Disparador del overlay de analíticas (global) */}
      <AnalyticsTrigger count={events.length} errors={errors} />
    </>
  );
}

function MiniStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "cyan" | "emerald" | "red";
}) {
  const c =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "red"
        ? "text-red-300"
        : tone === "cyan"
          ? "text-cyan-300"
          : "text-white/85";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
      <div className="text-[8.5px] uppercase tracking-[0.1em] text-white/40 truncate">
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-sm font-bold tabular-nums ${c}`}>
        {value}
        {sub && <span className="ml-1 text-[9px] text-white/35">{sub}</span>}
      </div>
    </div>
  );
}
