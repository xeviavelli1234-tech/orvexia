import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { listListingsByAccount } from "@/lib/db/sellerListing";
import { SyncButton } from "./SyncButton";
import ProductNetwork, { type NetNode } from "./ProductNetwork";

export const metadata = { title: "Mis productos · Orvexia Repricer" };
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
            Mis productos
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
  const catalogValue = listings.reduce((s, l) => s + (l.priceCurrent || 0), 0);

  const nodes: NetNode[] = listings.map((l) => ({
    id: l.id,
    title: l.title,
    asin: l.asin,
    sku: l.sku,
    imageUrl: l.imageUrl,
    priceCurrent: l.priceCurrent,
    currency: l.currency,
  }));

  return (
    <main className="relative min-h-screen overflow-hidden px-4 sm:px-6 py-10">
      <Backdrop />

      <div className="relative max-w-7xl mx-auto">
        {/* ── Barra HUD ───────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/repricer" className="text-xs text-white/45 hover:text-white/80">
              ← Panel
            </Link>
            <span className="text-white/20">/</span>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
              Red de <span className="text-gradient-neon">productos</span>
            </h1>
          </div>
          <SyncButton lastSyncAt={account.lastSyncAt} />
        </div>

        <div className="mt-5 neon-border rounded-2xl">
          <div className="grid grid-cols-3 divide-x divide-white/10 rounded-2xl bg-[rgba(10,7,4,0.6)]">
            <HudStat label="Productos" value={String(listings.length)} />
            <HudStat label="Con precio" value={`${withPrice}/${listings.length}`} />
            <HudStat
              label="Valor catálogo"
              value={
                catalogValue > 0
                  ? catalogValue.toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €"
                  : "—"
              }
            />
          </div>
        </div>

        {/* ── Grafo ───────────────────────────────────────────────── */}
        {!hasListings ? (
          <div className="mt-8 neon-border rounded-3xl p-12 text-center glass">
            <p className="text-white/70">
              Aún no hay productos en la red. Pulsa{" "}
              <strong className="text-white">&ldquo;Sincronizar con Amazon&rdquo;</strong> arriba.
            </p>
            <p className="mt-3 text-xs text-white/40">
              Se mostrarán todos los listings publicados en tu cuenta de Seller Central.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-indigo-400/15 bg-black/40 p-1.5 sm:p-2 shadow-[0_0_80px_-20px_rgba(99,102,241,0.45)] overflow-hidden">
            <div className="rounded-[20px] overflow-hidden">
              <ProductNetwork nodes={nodes} />
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-white/35">
          Pasa el ratón por un nodo para ver el detalle. Solo visualización — la
          configuración de reprecio se añadirá más adelante.
        </p>
      </div>
    </main>
  );
}

function HudStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4 text-center">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</div>
      <div className="mt-1 font-mono text-2xl sm:text-3xl font-extrabold text-amber-300 amber-glow tabular-nums">
        {value}
      </div>
    </div>
  );
}

/** Fondo espacial profundo (nebulosas). */
function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#030308]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-5%,rgba(99,102,241,0.18),transparent_60%)]" />
      <div className="absolute top-[20%] left-[-10%] h-[600px] w-[760px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.12),transparent_62%)]" />
      <div className="absolute bottom-[-12%] right-[-8%] h-[620px] w-[820px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(217,70,239,0.12),transparent_62%)]" />
      <div className="absolute bottom-[10%] left-[15%] h-[420px] w-[560px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(129,140,248,0.10),transparent_60%)]" />
    </div>
  );
}
