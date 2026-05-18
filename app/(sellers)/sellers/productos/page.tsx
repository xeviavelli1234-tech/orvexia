import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { listListingsByAccount } from "@/lib/db/sellerListing";
import { SyncButton } from "./SyncButton";
import ProductNetwork, { type NetNode } from "./ProductNetwork";
import { RunNowButton } from "@/app/(sellers)/sellers/dashboard/RunNowButton";
import { DisconnectButton } from "@/app/(sellers)/sellers/dashboard/DisconnectButton";

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

  const nodes: NetNode[] = listings.map((l) => ({
    id: l.id,
    title: l.title,
    asin: l.asin,
    sku: l.sku,
    imageUrl: l.imageUrl,
    priceCurrent: l.priceCurrent,
    currency: l.currency,
    priceMin: l.priceMin,
    priceMax: l.priceMax,
    repricingEnabled: l.repricingEnabled,
    strategy: l.strategy,
    undercutType: l.undercutType,
    undercutValue: l.undercutValue,
    fixedPrice: l.fixedPrice,
    cost: l.cost,
    feePercent: l.feePercent,
    targetMargin: l.targetMargin,
    noCompetition: l.noCompetition,
  }));

  return (
    <div className="fixed inset-0 z-50 flex bg-[#020207] text-white">
      {/* ── Zona de herramientas (izquierda) ─────────────────────── */}
      <aside className="flex h-full w-60 sm:w-72 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[rgba(6,6,16,0.94)] backdrop-blur-xl">
        <div className="px-5 py-5 border-b border-white/10">
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

        <div className="px-5 py-5 border-b border-white/10">
          <Eyebrow>Resumen</Eyebrow>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Stat label="Productos" value={String(listings.length)} />
            <Stat label="Con precio" value={`${withPrice}/${listings.length}`} />
            <Stat label="Repreciando" value={`${active}/${listings.length}`} accent />
            <Stat
              label="Valor catálogo"
              value={
                catalogValue > 0
                  ? Math.round(catalogValue).toLocaleString("es-ES") + " €"
                  : "—"
              }
            />
          </div>
        </div>

        <div className="px-5 py-5 flex flex-col gap-3 border-b border-white/10">
          <Eyebrow>Acciones</Eyebrow>
          <SyncButton lastSyncAt={account.lastSyncAt} />
          <RunNowButton />
        </div>

        <div className="px-5 py-5 flex flex-col gap-3 border-b border-white/10">
          <Eyebrow>Cuenta</Eyebrow>
          <Link
            href="/dashboard/repricer"
            className="text-sm text-white/55 hover:text-white underline underline-offset-4 transition-colors"
          >
            Facturación y plan
          </Link>
          <DisconnectButton />
        </div>

        <div className="mt-auto px-5 py-5 text-[11px] leading-relaxed text-white/40">
          <Eyebrow>Leyenda</Eyebrow>
          <div className="mt-2.5 space-y-1.5">
            <Legend color="bg-emerald-400" text="Repreciando" />
            <Legend color="bg-blue-400" text="Configurable" />
            <Legend color="bg-slate-500" text="Sin oferta en Amazon" />
          </div>
          <p className="mt-3 text-white/30">
            Clic en un nodo para definir mín/máx y la estrategia.
          </p>
        </div>
      </aside>

      {/* ── Lienzo (resto de la ventana) ─────────────────────────── */}
      <section className="relative flex-1 h-full bg-[radial-gradient(ellipse_at_50%_45%,#10173a_0%,#0a0d24_45%,#05060f_100%)]">
        {hasListings ? (
          <ProductNetwork nodes={nodes} />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center px-6">
            <div>
              <p className="text-white/70">
                No hay productos en la red. Pulsa{" "}
                <strong className="text-white">&ldquo;Sincronizar con Amazon&rdquo;</strong>{" "}
                en la barra de la izquierda.
              </p>
              <p className="mt-3 text-xs text-white/40">
                Se traerán todos los listings publicados en tu cuenta de Seller Central.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="text-[9px] uppercase tracking-[0.12em] text-white/40 truncate">
        {label}
      </div>
      <div
        className={`mt-0.5 font-mono text-lg font-extrabold tabular-nums ${
          accent
            ? "text-emerald-300 [text-shadow:0_0_16px_rgba(16,185,129,0.5)]"
            : "text-cyan-300 text-glow-cyan"
        }`}
      >
        {value}
      </div>
    </div>
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
