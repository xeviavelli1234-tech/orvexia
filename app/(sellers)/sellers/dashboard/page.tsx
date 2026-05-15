import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { prisma } from "@/lib/prisma";
import { DisconnectButton } from "./DisconnectButton";
import { RunNowButton } from "./RunNowButton";

export const metadata = { title: "Tu panel · Orvexia Repricer" };

const STATUS_MESSAGES: Record<string, { kind: "success" | "error" | "info"; text: string }> = {
  connected: { kind: "success", text: "Cuenta de Amazon conectada correctamente." },
  demo_connected: {
    kind: "success",
    text: "Modo demo activado. Todo el flujo funciona con datos de prueba (sin tocar Amazon real).",
  },
  disconnected: { kind: "info", text: "Cuenta de Amazon desconectada." },
  error_state_mismatch: {
    kind: "error",
    text: "La verificación de seguridad (CSRF) falló. Vuelve a intentar la conexión.",
  },
  error_missing_params: {
    kind: "error",
    text: "Amazon no devolvió los datos esperados. Reintenta.",
  },
  error_token_exchange: {
    kind: "error",
    text: "No pudimos canjear el código con Amazon. Revisa que las credenciales LWA en .env sean correctas.",
  },
  error_persist: {
    kind: "error",
    text: "No pudimos guardar la conexión en la base de datos. Reintenta o contacta soporte.",
  },
};

function Banner({ status }: { status: string }) {
  const config = STATUS_MESSAGES[status] ?? (status.startsWith("error_")
    ? { kind: "error" as const, text: `Error de Amazon: ${status.replace("error_", "")}` }
    : null);
  if (!config) return null;
  const styles =
    config.kind === "success"
      ? "bg-[var(--accent-50)] text-[var(--accent-700)] border-[var(--accent-300)]"
      : config.kind === "error"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-[var(--brand-50)] text-[var(--brand-700)] border-[var(--brand-200)]";
  return (
    <div className={`mb-8 rounded-lg border px-4 py-3 text-sm ${styles}`}>{config.text}</div>
  );
}

export default async function SellerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/sellers/dashboard");
  }

  const { status } = await searchParams;
  const account = await getSellerAccountByUserId(session.userId);
  const isConnected = !!account?.active;
  const isDemo = account?.spApiEnv !== "production";

  const lastRun = account
    ? await prisma.repricingRun.findFirst({
        where: { sellerAccountId: account.id },
        orderBy: { startedAt: "desc" },
      })
    : null;

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Tu panel</h1>
      <p className="mt-2 text-fg/60">Hola {session.name}, gestiona aquí tu conexión con Amazon.</p>

      {status && <div className="mt-8"><Banner status={status} /></div>}

      <div className="mt-8 rounded-2xl border border-fg/10 bg-bg p-8">
        {!isConnected ? (
          <>
            <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-3">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                🚧 Integración con Amazon en desarrollo
              </p>
              <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                La conexión OAuth con Amazon SP-API está pendiente de aprobación de
                Amazon (verificación de identidad de desarrollador). El botón de abajo
                ya está implementado y funcionará automáticamente en cuanto Amazon
                habilite el acceso. El resto del producto (rangos de precio, motor de
                reprecio) está operativo.
              </p>
            </div>
            <h2 className="text-xl font-semibold">Conecta tu cuenta de Amazon Seller</h2>
            <p className="mt-2 text-fg/70 text-sm leading-relaxed">
              Te llevaremos a Amazon para que autorices Orvexia Repricer. Es un flujo OAuth oficial:
              nunca vemos tu contraseña, solo recibimos un token revocable.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="/api/sellers/amazon/oauth/start"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-600)] text-white px-6 py-3 font-semibold hover:bg-[var(--brand-700)] transition-colors"
              >
                Conectar mi cuenta de Amazon
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded">
                  Beta
                </span>
              </a>
              <form action="/api/sellers/demo/connect" method="post">
                <button
                  type="submit"
                  className="rounded-lg border border-fg/20 px-6 py-3 font-semibold hover:bg-fg/5 transition-colors"
                >
                  Probar en modo demo →
                </button>
              </form>
            </div>
            <p className="mt-4 text-xs text-fg/50">
              <strong>Modo demo:</strong> prueba todo el flujo (sincronizar productos,
              definir min/max, motor de reprecio) con datos de prueba, sin tocar Amazon
              real ni necesitar plan Profesional. Para producción real necesitas plan
              Profesional + app SP-API aprobada con rol Pricing.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent-500)]" />
              <h2 className="text-xl font-semibold">
                {isDemo ? "Modo demo activo" : "Cuenta conectada"}
              </h2>
              {isDemo && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400 px-2 py-0.5 rounded-full">
                  Datos de prueba
                </span>
              )}
            </div>
            <dl className="mt-6 space-y-3 text-sm">
              <Row label="Seller ID" value={account!.amazonSellerId} mono />
              <Row label="Marketplace" value="Amazon.es" />
              <Row label="Entorno" value={account!.spApiEnv} />
              <Row label="Plan" value={account!.plan} />
              {account!.trialEndsAt && (
                <Row
                  label="Trial termina"
                  value={new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(
                    account!.trialEndsAt,
                  )}
                />
              )}
              <Row
                label="Intervalo reprecio"
                value={`${Math.round(account!.intervalSeconds / 60)} min`}
              />
            </dl>

            <div className="mt-8 pt-6 border-t border-fg/10">
              <h3 className="text-sm font-semibold text-fg/70 uppercase tracking-wide">
                Última ejecución del motor
              </h3>
              {lastRun ? (
                <dl className="mt-3 space-y-2 text-sm">
                  <Row
                    label="Cuándo"
                    value={new Intl.DateTimeFormat("es-ES", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(lastRun.startedAt)}
                  />
                  <Row label="Procesados" value={String(lastRun.listingsProcessed)} />
                  <Row label="Reprecciados" value={String(lastRun.listingsRepriced)} />
                  <Row label="Errores" value={String(lastRun.errors)} />
                </dl>
              ) : (
                <p className="mt-2 text-sm text-fg/50">
                  Aún no se ha ejecutado ningún ciclo. Pulsa &ldquo;Ejecutar reprecio
                  ahora&rdquo; o espera al cron ({Math.round(account!.intervalSeconds / 60)}{" "}
                  min).
                </p>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-fg/10 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-3 flex-wrap">
                <Link
                  href="/sellers/productos"
                  className="rounded-lg bg-[var(--brand-600)] text-white px-5 py-2.5 font-semibold hover:bg-[var(--brand-700)] transition-colors text-sm"
                >
                  Ver mis productos →
                </Link>
                <RunNowButton />
              </div>
              <DisconnectButton />
            </div>
          </>
        )}
      </div>

      <div className="mt-12 text-sm text-fg/50">
        <p>
          ¿Problemas? Asegúrate de tener configuradas las variables{" "}
          <code className="text-xs bg-fg/5 px-1.5 py-0.5 rounded">LWA_CLIENT_ID</code>,{" "}
          <code className="text-xs bg-fg/5 px-1.5 py-0.5 rounded">LWA_CLIENT_SECRET</code>,{" "}
          <code className="text-xs bg-fg/5 px-1.5 py-0.5 rounded">SP_API_APP_ID</code> y{" "}
          <code className="text-xs bg-fg/5 px-1.5 py-0.5 rounded">ENCRYPTION_KEY</code> en{" "}
          <code className="text-xs bg-fg/5 px-1.5 py-0.5 rounded">.env.local</code>.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-36 text-fg/60">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : ""}>{value}</dd>
    </div>
  );
}
