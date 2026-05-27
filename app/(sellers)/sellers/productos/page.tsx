import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { listListingsByAccount } from "@/lib/db/sellerListing";
import { SyncButton } from "./SyncButton";
import { UploadCsvButton } from "./UploadCsvButton";
import { GeneratePlanButton, ExportPlanButton } from "./PlanButtons";
import ProductNetwork, { type NetNode } from "./ProductNetwork";
import AssistantWidget from "./AssistantWidget";
import type { OvEvent, OvProduct } from "./AnalyticsOverlay";
import { SettingsButton, type AccountSettingsData } from "./AccountSettings";
import { CatalogButton, PanicButton } from "./CatalogOverlay";
import { ProfitButton } from "./ProfitOverlay";
import { RealDataButton } from "./RealDataPanel";
import { ToolboxButton } from "./ToolboxPanel";
import DemoBanner from "./DemoBanner";
import { HelpButton } from "./HelpOverlay";
import { AuditButton } from "./AuditOverlay";
// Los Overlays grandes se cargan diferidos (next/dynamic + ssr:false).
// Mantenemos los Buttons como import estático porque la sidebar los
// renderiza al entrar; los Overlays solo importan JS al hidratar/montar.
import LazyOverlays from "./LazyOverlays";
import { RunNowButton } from "@/app/(sellers)/sellers/dashboard/RunNowButton";
import { DisconnectButton } from "@/app/(sellers)/sellers/dashboard/DisconnectButton";
import { prisma } from "@/lib/prisma";
import {
  getBillingState,
  repricingActiveLimit,
  TRIAL_DAYS,
  type SellerPlan,
} from "@/lib/billing";
import ActivityPanel, { type EventDTO } from "./ActivityPanel";
import ControlCenterShell from "./ControlCenterShell";
import { Eyebrow, Stat } from "@/components/ui/Stat";

export const metadata = { title: "Centro de control · Orvexia Repricer" };
export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/sellers/productos");

  const account = await getSellerAccountByUserId(session.userId);

  if (!account || !account.active) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-[#020207] px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-3xl font-extrabold tracking-tight text-gradient-neon">
            Centro de control
          </h1>
          <div className="mt-8 neon-border rounded-3xl p-10 glass">
            <p className="text-white/70">Primero conecta tu cuenta de Amazon.</p>
            <Link
              href="/dashboard/repricer"
              className="mt-6 inline-block rounded-xl bg-[var(--brand-600)] text-white px-6 py-3 font-semibold hover:bg-[var(--brand-700)] transition-colors"
            >
              Ir al panel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const listings = await listListingsByAccount(account.id);
  const hasListings = listings.length > 0;
  const withPrice = listings.filter((l) => l.priceCurrent > 0).length;
  const active = listings.filter((l) => l.repricingEnabled).length;
  const catalogValue = listings.reduce((s, l) => s + (l.priceCurrent || 0), 0);
  const isManualMode = account.mode === "manual";
  // Tope de activos según plan/tier — alimenta el banner de cuota en la
  // sidebar y se compara con `active` para detectar saturación.
  const activeLimit = repricingActiveLimit(
    account.plan as SellerPlan,
    listings.length,
  );
  const planGeneratedCount = listings.filter((l) => l.suggestedPrice != null).length;
  const planLastGeneratedAt = listings
    .map((l) => l.suggestedAt)
    .filter((d): d is Date => d != null)
    .sort((a, b) => b.getTime() - a.getTime())[0]
    ?? null;

  const billing = getBillingState(account.plan as SellerPlan, account.trialEndsAt);
  const [lastRun, runCount, rawEvents] = await Promise.all([
    prisma.repricingRun.findFirst({
      where: { sellerAccountId: account.id },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
    prisma.repricingRun.count({ where: { sellerAccountId: account.id } }),
    prisma.repricingEvent.findMany({
      where: { listing: { sellerAccountId: account.id } },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { listing: { select: { title: true } } },
    }),
  ]);
  const events: EventDTO[] = rawEvents.map((e) => ({
    id: e.id,
    title: e.listing?.title ?? "Producto",
    reason: e.reason,
    priceBefore: e.priceBefore,
    priceAfter: e.priceAfter,
    competitorPrice: e.competitorPrice,
    success: e.success,
    buyBox: e.buyBox,
    simulated: e.simulated,
    errorMessage: e.errorMessage,
    createdAt: e.createdAt.toISOString(),
  }));

  // Último evento por listing (rawEvents viene ordenado desc) → estado/color.
  const lastByListing = new Map<string, { reason: string; success: boolean }>();
  for (const e of rawEvents) {
    if (!lastByListing.has(e.listingId))
      lastByListing.set(e.listingId, { reason: e.reason, success: e.success });
  }

  const nodes: NetNode[] = listings.map((l) => {
    const le = lastByListing.get(l.id);
    return {
      id: l.id,
      title: l.title,
      asin: l.asin,
      parentAsin: l.parentAsin,
      sku: l.sku,
      imageUrl: l.imageUrl,
      source: l.source ?? "amazon",
      priceCurrent: l.priceCurrent,
      currency: l.currency,
      priceMin: l.priceMin,
      priceMax: l.priceMax,
      repricingEnabled: l.repricingEnabled,
      tags: l.tags,
      strategy: l.strategy,
      undercutType: l.undercutType,
      undercutValue: l.undercutValue,
      fixedPrice: l.fixedPrice,
      cost: l.cost,
      shippingCost: l.shippingCost,
      fbaFee: l.fbaFee,
      vatRate: l.vatRate,
      feePercent: l.feePercent,
      targetMargin: l.targetMargin,
      noCompetition: l.noCompetition,
      stepUpType: l.stepUpType,
      stepUpValue: l.stepUpValue,
      useAccountDefaults: l.useAccountDefaults,
      ignoreAmazon: l.ignoreAmazon,
      fulfillmentFilter: l.fulfillmentFilter,
      minSellerRating: l.minSellerRating,
      excludeSellers: l.excludeSellers,
      onlySellers: l.onlySellers,
      buyBoxStatus: l.buyBoxStatus,
      buyBoxPrice: l.buyBoxPrice,
      lastReason: le?.reason ?? null,
      lastSuccess: le ? le.success : null,
      suggestedPrice: l.suggestedPrice ?? null,
      suggestedAt: l.suggestedAt ? l.suggestedAt.toISOString() : null,
      suggestedConfidence: l.suggestedConfidence ?? null,
      suggestedStrategy: l.suggestedStrategy ?? null,
      suggestedReason: l.suggestedReason ?? null,
    };
  });

  const ovEvents: OvEvent[] = rawEvents.map((e) => ({
    listingId: e.listingId,
    title: e.listing?.title ?? "Producto",
    reason: e.reason,
    priceBefore: e.priceBefore,
    priceAfter: e.priceAfter,
    competitorPrice: e.competitorPrice,
    success: e.success,
    buyBox: e.buyBox,
    simulated: e.simulated,
    errorMessage: e.errorMessage,
    createdAt: e.createdAt.toISOString(),
  }));
  const ovProducts: OvProduct[] = listings.map((l) => ({
    id: l.id,
    title: l.title,
    currency: l.currency,
    asin: l.asin,
    sku: l.sku,
    strategy: l.strategy,
    repricingEnabled: l.repricingEnabled,
    priceCurrent: l.priceCurrent,
  }));

  const accountSettings: AccountSettingsData = {
    marketplaceId: account.marketplaceId,
    scheduleEnabled: account.scheduleEnabled,
    scheduleStartHour: account.scheduleStartHour,
    scheduleEndHour: account.scheduleEndHour,
    dryRun: account.dryRun,
    patchDelayMs: account.patchDelayMs,
    autoSyncHours: account.autoSyncHours,
    defaultStrategy: account.defaultStrategy,
    defaultUndercutType: account.defaultUndercutType,
    defaultUndercutValue: account.defaultUndercutValue,
    defaultNoCompetition: account.defaultNoCompetition,
    defaultStepUpType: account.defaultStepUpType,
    defaultStepUpValue: account.defaultStepUpValue,
    alertsEnabled: account.alertsEnabled,
    alertEmail: account.alertEmail ?? "",
    alertOnBuyBoxLost: account.alertOnBuyBoxLost,
    alertOnPriceFloor: account.alertOnPriceFloor,
    alertOnError: account.alertOnError,
    minChangeAmount: account.minChangeAmount,
    minChangePct: account.minChangePct,
    debounceSeconds: account.debounceSeconds,
    priceWarCycles: account.priceWarCycles,
    priceWarAction:
      account.priceWarAction === "PAUSE" ? "PAUSE" : "FLOOR",
    stepUpAccelCycles: account.stepUpAccelCycles,
    stepUpMaxMult: account.stepUpMaxMult,
  };

  const sidebar = (
    <>
      <div className="px-5 py-5 border-b border-white/10 hidden lg:block">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-[11px] text-white/45 hover:text-white/80 transition-colors"
        >
          ← Dashboard
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_2px_rgba(34,211,238,0.7)]" />
          <h1 className="text-lg font-extrabold tracking-tight">
            Centro de <span className="text-gradient-neon">control</span>
          </h1>
        </div>
      </div>

      <div id="tour-resumen" className="px-5 py-5 border-b border-white/10">
          <Eyebrow>Resumen</Eyebrow>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Stat label="Productos" value={String(listings.length)} />
            <Stat label="Con precio" value={`${withPrice}/${listings.length}`} />
            <Stat
              label="Repreciando"
              value={
                Number.isFinite(activeLimit)
                  ? `${active}/${activeLimit}`
                  : `${active}`
              }
              accent
            />
            <Stat
              label="Valor catálogo"
              value={
                catalogValue > 0
                  ? Math.round(catalogValue).toLocaleString("es-ES") + " €"
                  : "—"
              }
            />
          </div>
          {/* Banner de cuota: barra + CTA si está saturado o casi. Solo
              tiene sentido cuando hay un límite finito (TRIAL o tiers no
              unlimited). */}
          {Number.isFinite(activeLimit) && (() => {
            const pct = activeLimit > 0
              ? Math.min(100, Math.round((active / activeLimit) * 100))
              : 0;
            const tone =
              active >= activeLimit
                ? "red"
                : pct >= 90
                  ? "amber"
                  : "ok";
            const barColor =
              tone === "red"
                ? "bg-red-500"
                : tone === "amber"
                  ? "bg-amber-400"
                  : "bg-emerald-400";
            const textColor =
              tone === "red"
                ? "text-red-300"
                : tone === "amber"
                  ? "text-amber-300"
                  : "text-white/45";
            return (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className={textColor}>
                    {tone === "red"
                      ? "Cuota llena — sube de plan"
                      : tone === "amber"
                        ? "Cuota casi llena"
                        : "Plan " + billing.label}
                  </span>
                  {(tone === "red" || tone === "amber") && (
                    <Link
                      href="/sellers/facturacion"
                      className="text-[10px] font-semibold text-cyan-300 hover:text-cyan-200"
                    >
                      Subir →
                    </Link>
                  )}
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-white/35 font-mono tabular-nums">
                  {active} de {activeLimit} activos · {pct}%
                </div>
              </div>
            );
          })()}
        </div>

        <div
          id="tour-actions"
          className="px-5 py-5 flex flex-col gap-3 border-b border-white/10"
        >
          <Eyebrow>Acciones</Eyebrow>
          {isManualMode ? (
            <>
              <div id="tour-sync">
                <UploadCsvButton lastSyncAt={account.lastSyncAt} />
              </div>
              <div id="tour-run">
                <GeneratePlanButton hasListings={hasListings} />
              </div>
              <div>
                <ExportPlanButton enabled={planGeneratedCount > 0} />
                {planGeneratedCount > 0 && planLastGeneratedAt && (
                  <span className="mt-1 block text-[11px] text-white/40">
                    Plan: {planGeneratedCount} precios ·{" "}
                    {new Intl.DateTimeFormat("es-ES", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(planLastGeneratedAt)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div id="tour-sync">
                <SyncButton lastSyncAt={account.lastSyncAt} />
              </div>
              <div id="tour-run">
                <RunNowButton />
              </div>
            </>
          )}
        </div>

        <div
          id="tour-activity"
          className="px-5 py-5 flex flex-col gap-3 border-b border-white/10"
        >
          <Eyebrow>Plan y actividad</Eyebrow>
          <ActivityPanel
            events={events}
            plan={{
              label: billing.label,
              isTrial: billing.plan === "TRIAL",
              trialDaysLeft: billing.trialDaysLeft,
              trialTotal: TRIAL_DAYS,
              intervalMinutes: billing.intervalMinutes,
              trialExpired: billing.trialExpired,
            }}
            lastRunAt={lastRun?.startedAt.toISOString() ?? null}
            proHref="/sellers/facturacion"
          />
          <div id="tour-tools" className="flex flex-col gap-3">
            <CatalogButton />
            <ProfitButton />
            <RealDataButton />
            <ToolboxButton />
            <HelpButton />
            <AuditButton />
            <SettingsButton />
            <PanicButton />
            <DisconnectButton />
          </div>
        </div>

        <div
          id="tour-legend"
          className="mt-auto px-5 py-5 text-[11px] leading-relaxed text-white/40"
        >
          <Eyebrow>Leyenda</Eyebrow>
          <div className="mt-2.5 space-y-1.5">
            <Legend color="bg-emerald-400" text="Buy Box ganada" />
            <Legend color="bg-red-400" text="Buy Box perdida" />
            <Legend color="bg-amber-400" text="En precio mínimo" />
            <Legend color="bg-orange-500" text="Error de reprecio" />
            <Legend color="bg-cyan-400" text="Repreciando (sin datos)" />
            <Legend color="bg-blue-400" text="Configurable / pausado" />
            <Legend color="bg-slate-500" text="Sin oferta en Amazon" />
          </div>
          <p className="mt-3 text-white/30">
            Clic en un nodo para definir mín/máx y la estrategia.
          </p>
        </div>
      </>
    );

  const envIsProduction = process.env.SP_API_ENV === "production";
  const accountInProd = account.spApiEnv === "production";
  // Modo manual no depende de SP-API → nunca mostrar el banner de demo.
  const isDemoMode = !isManualMode && (!envIsProduction || !accountInProd);

  const canvas = hasListings ? (
    <ProductNetwork nodes={nodes} activeCount={active} />
  ) : (
    <div className="absolute inset-0 grid place-items-center text-center px-6">
      <div className="max-w-md">
        {isManualMode ? (
          <>
            <div className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300 mb-2">
              ▸ modo manual · sin amazon
            </div>
            <div className="text-2xl font-extrabold tracking-tight text-gradient-neon">
              Sube tu catálogo
            </div>
            <p className="mt-3 text-white/70">
              Pulsa{" "}
              <strong className="text-white">&ldquo;Subir catálogo CSV&rdquo;</strong>{" "}
              <span className="hidden lg:inline">en la barra de la izquierda</span>
              <span className="lg:hidden">en el menú</span>{" "}
              para importar tus productos.
            </p>
            <p className="mt-2 text-xs text-white/40">
              Formato mínimo: <code className="text-cyan-300">sku, title, price</code>. Opcionales:{" "}
              <code className="text-white/70">min, max, cost</code>. Luego &laquo;Generar plan de
              precios&raquo; y &laquo;Exportar plan CSV&raquo; para aplicarlo donde vendas.
            </p>
          </>
        ) : isDemoMode ? (
          <>
            <div className="font-mono-ui text-[10px] uppercase tracking-wider text-amber-300 mb-2">
              ▸ app sp-api · pendiente de aprobación
            </div>
            <div className="text-2xl font-extrabold tracking-tight text-gradient-neon">
              Esperando luz verde de Amazon
            </div>
            <p className="mt-3 text-white/70">
              Tu panel está limpio. En cuanto Amazon apruebe tu app SP-API y
              configures <code className="text-amber-300">SP_API_ENV=production</code> en
              Vercel, podrás reconectar y se traerán tus listings reales de Seller Central.
            </p>
            <p className="mt-2 text-xs text-white/40">
              Mientras tanto puedes <strong className="text-white">Sincronizar</strong>{" "}
              para sembrar 4 productos demo (Bosch, Balay, LG, Samsung) y probar
              estrategias, calculadora de margen, rentabilidad, IA, etc.
            </p>
          </>
        ) : (
          <>
            <div className="text-2xl font-extrabold tracking-tight text-gradient-neon">
              Empieza aquí
            </div>
            <p className="mt-3 text-white/70">
              Pulsa{" "}
              <strong className="text-white">&ldquo;Sincronizar con Amazon&rdquo;</strong>{" "}
              <span className="hidden lg:inline">en la barra de la izquierda</span>
              <span className="lg:hidden">en el menú</span>{" "}
              para traer tus productos.
            </p>
            <p className="mt-2 text-xs text-white/40">
              Se importan todos los listings de tu Seller Central. Luego clic en un
              producto → define mín/máx → estrategia → activa → «Ejecutar reprecio
              ahora».
            </p>
          </>
        )}
        <div className="mt-5 inline-block w-64">
          <HelpButton />
        </div>
      </div>
    </div>
  );

  return (
    <ControlCenterShell
      sidebar={sidebar}
      canvas={canvas}
      banner={
        isDemoMode ? (
          <DemoBanner
            spApiEnv={account.spApiEnv}
            envIsProduction={envIsProduction}
            listingsCount={listings.length}
          />
        ) : null
      }
      overlays={
        <>
          <AssistantWidget />
          <LazyOverlays
            analytics={{
              products: ovProducts,
              events: ovEvents,
              plan: { label: billing.label, intervalMinutes: billing.intervalMinutes },
              runCount,
              lastRunAt: lastRun?.startedAt.toISOString() ?? null,
            }}
            accountSettings={accountSettings}
            items={nodes}
            toolboxInitial={{
              vacationFrom: account.vacationFrom
                ? account.vacationFrom.toISOString().slice(0, 16)
                : null,
              vacationTo: account.vacationTo
                ? account.vacationTo.toISOString().slice(0, 16)
                : null,
              vacationNote: account.vacationNote,
            }}
          />
        </>
      }
    />
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span>{text}</span>
    </div>
  );
}
