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
  }));

  return (
    <div className="fixed inset-0 z-50 flex bg-[#020207] text-white">
      {/* ── Zona de herramientas (izquierda) ─────────────────────── */}
      <aside className="flex h-full w-60 sm:w-72 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[rgba(6,6,16,0.94)] backdrop-blur-xl">
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/dashboard" className="text-[11px] text-white/45 hover:text-white/80">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-lg font-extrabold tracking-tight">
            Centro de <span className="text-gradient-neon">control</span>
          </h1>
        </div>

        <div className="px-5 py-5 grid grid-cols-2 gap-x-3 gap-y-4 border-b border-white/10">
          <Stat label="Productos" value={String(listings.length)} />
          <Stat label="Con precio" value={`${withPrice}/${listings.length}`} />
          <Stat label="Reprecio" value={`${active}/${listings.length}`} />
          <Stat
            label="Valor"
            value={catalogValue > 0 ? Math.round(catalogValue).toLocaleString("es-ES") + " €" : "—"}
          />
        </div>

        <div className="px-5 py-5 flex flex-col gap-4 border-b border-white/10">
          <SyncButton lastSyncAt={account.lastSyncAt} />
          <RunNowButton />
        </div>

        <div className="px-5 py-5 flex flex-col gap-3 text-sm">
          <Link
            href="/dashboard/repricer"
            className="text-white/55 hover:text-white underline underline-offset-4"
          >
            Facturación y plan
          </Link>
          <DisconnectButton />
        </div>

        <div className="mt-auto px-5 py-5 border-t border-white/10 text-[11px] leading-relaxed text-white/35">
          Clic en un nodo para definir mín/máx y activar el reprecio.
          <div className="mt-2 space-y-1">
            <Legend color="bg-emerald-400" text="Repreciando" />
            <Legend color="bg-blue-400" text="Configurable" />
            <Legend color="bg-slate-500" text="Sin oferta en Amazon" />
          </div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">{label}</div>
      <div className="font-mono text-xl font-extrabold text-cyan-300 text-glow-cyan tabular-nums">
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
