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
      <main className="relative min-h-screen overflow-hidden px-4 sm:px-6 py-16">
        <Backdrop />
        <div className="relative max-w-2xl mx-auto text-center">
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
      </main>
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
    <main className="relative min-h-screen overflow-hidden px-3 sm:px-5 py-6">
      <Backdrop />

      <div className="relative max-w-[1500px] mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard" className="text-xs text-white/45 hover:text-white/80">
            ← Dashboard
          </Link>
          <span className="text-white/20">/</span>
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
            Centro de <span className="text-gradient-neon">control</span>
          </h1>
        </div>

        {/* ── PANEL ÚNICO ─────────────────────────────────────────── */}
        <div className="neon-border rounded-3xl overflow-hidden shadow-[0_0_90px_-20px_rgba(99,102,241,0.5)]">
          {/* Barra de administración */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 bg-[rgba(8,6,18,0.7)] border-b border-white/10">
            <Stat label="Productos" value={String(listings.length)} />
            <Stat label="Con precio" value={`${withPrice}/${listings.length}`} />
            <Stat label="Reprecio activo" value={`${active}/${listings.length}`} />
            <Stat
              label="Valor catálogo"
              value={catalogValue > 0 ? Math.round(catalogValue).toLocaleString("es-ES") + " €" : "—"}
            />
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <SyncButton lastSyncAt={account.lastSyncAt} />
              <RunNowButton />
              <Link
                href="/dashboard/repricer"
                className="text-sm text-white/55 hover:text-white underline underline-offset-4"
              >
                Facturación
              </Link>
              <DisconnectButton />
            </div>
          </div>

          {/* Lienzo espacial */}
          <div className="relative w-full h-[74vh] min-h-[560px] bg-[#020207]">
            {hasListings ? (
              <ProductNetwork nodes={nodes} />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-center px-6">
                <div>
                  <p className="text-white/70">
                    No hay productos en la red. Pulsa{" "}
                    <strong className="text-white">&ldquo;Sincronizar con Amazon&rdquo;</strong> arriba.
                  </p>
                  <p className="mt-3 text-xs text-white/40">
                    Se traerán todos los listings publicados en tu cuenta de Seller Central.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-white/35">
          Haz clic en un nodo para definir mín/máx y activar el reprecio. Verde = repreciando ·
          Ámbar = configurable · Gris = sin oferta en Amazon.
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center sm:text-left">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</div>
      <div className="font-mono text-xl sm:text-2xl font-extrabold text-amber-300 amber-glow tabular-nums">
        {value}
      </div>
    </div>
  );
}

/** Fondo espacial profundo (nebulosas) — el lienzo tiene el detalle animado. */
function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#020207]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-5%,rgba(99,102,241,0.16),transparent_60%)]" />
      <div className="absolute top-[18%] left-[-10%] h-[620px] w-[780px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.10),transparent_62%)]" />
      <div className="absolute bottom-[-12%] right-[-8%] h-[640px] w-[840px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(217,70,239,0.10),transparent_62%)]" />
    </div>
  );
}
