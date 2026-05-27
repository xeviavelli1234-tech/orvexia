import AnalyticsTrigger from "./AnalyticsTrigger";
import { formatRelativeShort } from "@/lib/format/relative";
import { MiniStat } from "@/components/ui/Stat";

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

interface PlanInfo {
  label: string;
  isTrial: boolean;
  trialDaysLeft: number;
  trialTotal: number;
  intervalMinutes: number;
  trialExpired: boolean;
  /**
   * Días restantes del trial de Stripe cuando el plan es PRO pero la
   * suscripción está dentro del trial gratuito (14 días). Si > 0 mostramos
   * la barra de progreso también en PRO. null o 0 = no aplicable.
   */
  proTrialDaysLeft?: number | null;
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
  // ¿Hay un trial activo que mostrar? Puede venir de:
  //   a) plan TRIAL en la DB local (sin pago),
  //   b) plan PRO con suscripción de Stripe aún dentro de su trial de 14 días.
  const proInTrial = !plan.isTrial && (plan.proTrialDaysLeft ?? 0) > 0;
  const showTrialBar = plan.isTrial || proInTrial;
  const daysLeft = plan.isTrial ? plan.trialDaysLeft : (plan.proTrialDaysLeft ?? 0);
  const pct = showTrialBar
    ? Math.max(0, Math.min(100, (daysLeft / plan.trialTotal) * 100))
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
        {showTrialBar && (
          <>
            <div className="mt-2 text-[11px] text-white/45">
              {plan.trialExpired
                ? "Prueba expirada"
                : proInTrial
                  ? `Prueba Pro: ${daysLeft}/${plan.trialTotal} días gratis restantes`
                  : `${daysLeft}/${plan.trialTotal} días restantes`}
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
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          <a
            href={proHref}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-center text-[11px] text-white/70 hover:bg-white/[0.06] transition-colors"
          >
            Facturación
          </a>
          <a
            href="/sellers/facturacion/factura"
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-center text-[11px] text-white/70 hover:bg-white/[0.06] transition-colors"
          >
            Factura (IVA)
          </a>
        </div>
      </div>

      {/* Mini-resumen de actividad — labels cortas para que entren a 3 col. */}
      <div className="grid grid-cols-3 gap-1.5">
        <MiniStat label="Eventos" value={String(events.length)} />
        <MiniStat label="Cambios" value={String(changes)} tone="cyan" />
        <MiniStat
          label="Errores"
          value={String(errors)}
          tone={errors > 0 ? "red" : undefined}
        />
        <MiniStat
          label="Buy Box"
          value={bbPct != null ? `${bbPct}%` : "—"}
          tone={bbPct != null ? (bbPct >= 50 ? "emerald" : "red") : undefined}
        />
        <MiniStat
          label="Últ. cambio"
          value={lastChange ? formatRelativeShort(lastChange.createdAt) : "—"}
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

