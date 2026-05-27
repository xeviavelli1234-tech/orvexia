import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { REPRICER_ENABLED, REPRICER_PUBLIC } from "@/lib/featureFlags";
import RepricerComingSoon from "@/components/RepricerComingSoon";

export const metadata = {
  title: "Repricer · Orvexia",
  robots: REPRICER_PUBLIC ? undefined : { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const STATUS_MSG: Record<
  string,
  { kind: "ok" | "err" | "info"; text: string }
> = {
  connected: {
    kind: "ok",
    text: "Cuenta de Amazon conectada correctamente.",
  },
  demo_connected: {
    kind: "ok",
    text: "Modo demo activado. Datos de prueba, sin tocar Amazon real.",
  },
  manual_connected: {
    kind: "ok",
    text: "Modo manual activado. Sube tu catálogo en CSV para empezar.",
  },
  disconnected: { kind: "info", text: "Cuenta de Amazon desconectada." },
  error_state_mismatch: {
    kind: "err",
    text: "Verificación CSRF fallida. Reintenta la conexión.",
  },
  error_token_exchange: {
    kind: "err",
    text: "No pudimos canjear el código con Amazon.",
  },
  error_persist: {
    kind: "err",
    text: "No pudimos guardar la conexión. Reintenta.",
  },
  error_selfconnect_env: {
    kind: "err",
    text: "Faltan SP_API_REFRESH_TOKEN o SP_API_SELLER_ID en las variables de entorno.",
  },
  error_not_production: {
    kind: "err",
    text: "SP_API_ENV no está en 'production'. Revisa las variables de entorno.",
  },
};

/**
 * Pantalla de conexión inicial del repricer.
 *
 * Si la cuenta ya está conectada y activa, se redirige al Centro de control
 * (/sellers/productos). Por eso aquí solo vive la UI de "todavía no estás
 * conectado / acabas de conectar / hubo error".
 */
export default async function RepricerPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!REPRICER_ENABLED) return <RepricerComingSoon />;

  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/repricer");

  const { status } = await searchParams;
  const statusCfg = status
    ? (STATUS_MSG[status] ??
      (status.startsWith("error_")
        ? { kind: "err" as const, text: `Error: ${status.replace("error_", "")}` }
        : null))
    : null;

  const account = await getSellerAccountByUserId(session.userId);

  // Si ya está conectado y activo, todo vive en el Centro de control.
  if (account?.active) redirect("/sellers/productos");

  return (
    <main className="min-h-screen px-4 sm:px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <Header />
        <StatusBanner cfg={statusCfg} />
        <div className="mt-6 neon-border rounded-3xl overflow-hidden">
          <div
            className="relative bg-grid-cyber rounded-[calc(1.5rem-1px)] p-10 sm:p-16 text-center"
            style={{
              background:
                "linear-gradient(150deg,#0b0d1c,#08091a 50%,#050913)",
            }}
          >
            <div className="absolute inset-0 bg-grid-cyber-fine opacity-40 pointer-events-none" />
            <div
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full halo-breathe pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse,rgba(129,140,248,0.25),transparent 65%)",
              }}
            />
            <div className="relative">
              <div className="text-5xl mb-5">⚡</div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Activa tu repricer
              </h2>
              <p className="mt-3 text-white/55 text-sm max-w-md mx-auto leading-relaxed">
                Conecta tu cuenta de Amazon Seller, sube tu propio catálogo en
                CSV, o pruébalo con datos de demo.
              </p>
              <div className="mt-7 flex flex-wrap gap-3 justify-center">
                {/* OAuth multi-cliente: SOLO cuando la app SP-API está
                    publicada por Amazon. Si no, daría MD1000 a cualquiera. */}
                {process.env.SP_API_APP_PUBLISHED === "true" && (
                  <a
                    href="/api/sellers/amazon/oauth/start"
                    className="rounded-xl bg-white text-[#0b0d1c] px-6 py-3 text-sm font-bold hover:bg-white/90 transition-colors"
                  >
                    Conectar mi cuenta de Amazon
                  </a>
                )}
                <form action="/api/sellers/manual/connect" method="post">
                  <button
                    type="submit"
                    className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-100 px-6 py-3 text-sm font-semibold hover:bg-cyan-400/20 hover:border-cyan-400/60 transition-colors shadow-[0_0_18px_-8px_rgba(34,211,238,0.7)]"
                  >
                    Empezar sin Amazon
                  </button>
                </form>
                <form action="/api/sellers/demo/connect" method="post">
                  <button
                    type="submit"
                    className="rounded-xl border border-white/20 text-white px-6 py-3 text-sm font-semibold hover:bg-white/[0.06] transition-colors"
                  >
                    Probar en modo demo
                  </button>
                </form>
              </div>
              <p className="mt-4 text-xs text-white/45 max-w-lg mx-auto leading-relaxed">
                <strong className="text-cyan-200/90">Modo sin Amazon:</strong>{" "}
                Sube tu catálogo en CSV (Shopify, WooCommerce, tienda propia,
                físico…) y nuestro motor te devuelve un plan de precios
                sugerido para cada SKU. Tú decides cuándo y dónde aplicarlo.
                Nunca escribimos en Amazon ni en ninguna tienda externa.
              </p>
              {process.env.SP_API_APP_PUBLISHED !== "true" && (
                <p className="mt-3 text-xs text-white/40 max-w-md mx-auto">
                  La conexión de tu cuenta de Amazon estará disponible en
                  cuanto Amazon apruebe la publicación de la app. Mientras
                  tanto puedes usar el <strong>modo sin Amazon</strong> o el
                  <strong> modo demo</strong>.
                </p>
              )}
              {process.env.SP_API_ENV === "production" && (
                <form
                  action="/api/sellers/amazon/self-connect"
                  method="post"
                  className="mt-3"
                >
                  <button
                    type="submit"
                    className="text-[11px] text-white/35 hover:text-white/70 underline underline-offset-4"
                  >
                    (Solo dueño: conectar con las credenciales del servidor)
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/dashboard"
          className="text-white/40 hover:text-white text-sm transition-colors"
        >
          ← Panel
        </Link>
        <span className="text-white/20">/</span>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
          Orvexia <span className="text-gradient-neon">Repricer</span>
        </h1>
      </div>
    </div>
  );
}

function StatusBanner({
  cfg,
}: {
  cfg: { kind: "ok" | "err" | "info"; text: string } | null;
}) {
  if (!cfg) return null;
  return (
    <div
      className={`mt-5 rounded-lg border px-4 py-2.5 text-sm ${
        cfg.kind === "ok"
          ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
          : cfg.kind === "err"
            ? "border-red-400/25 bg-red-400/[0.08] text-red-300"
            : "border-[var(--brand-400)]/25 bg-[var(--brand-500)]/[0.08] text-[var(--brand-300)]"
      }`}
    >
      {cfg.text}
    </div>
  );
}
