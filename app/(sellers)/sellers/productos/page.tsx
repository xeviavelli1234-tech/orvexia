import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { listListingsByAccount } from "@/lib/db/sellerListing";
import { SyncButton } from "./SyncButton";
import { RangeRow } from "./RangeRow";

export const metadata = { title: "Mis productos · Orvexia Repricer" };

export default async function ProductosPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/sellers/productos");

  const account = await getSellerAccountByUserId(session.userId);
  if (!account || !account.active) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Mis productos</h1>
        <div className="mt-8 rounded-2xl border border-fg/10 bg-bg p-8 text-center">
          <p className="text-fg/70">Primero conecta tu cuenta de Amazon.</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-lg bg-[var(--brand-600)] text-white px-6 py-3 font-semibold hover:bg-[var(--brand-700)] transition-colors"
          >
            Ir al panel
          </Link>
        </div>
      </div>
    );
  }

  const listings = await listListingsByAccount(account.id);
  const hasListings = listings.length > 0;
  const configured = listings.filter((l) => l.priceMin != null && l.priceMax != null).length;
  const active = listings.filter((l) => l.repricingEnabled).length;

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis productos</h1>
          <p className="mt-2 text-fg/60 text-sm">
            Define un precio mínimo y máximo por producto. El motor reprecia automáticamente
            dentro de ese rango.
          </p>
        </div>
        <SyncButton lastSyncAt={account.lastSyncAt} />
      </div>

      {hasListings && (
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          <Stat label="Productos" value={listings.length} />
          <Stat label="Con rango definido" value={`${configured} / ${listings.length}`} />
          <Stat label="Reprecio activo" value={`${active} / ${listings.length}`} />
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-fg/10 bg-bg overflow-hidden">
        {!hasListings ? (
          <div className="p-12 text-center">
            <p className="text-fg/70">
              Aún no tienes productos importados. Pulsa{" "}
              <strong>&ldquo;Sincronizar con Amazon&rdquo;</strong> arriba para empezar.
            </p>
            <p className="mt-3 text-xs text-fg/50">
              Si tu cuenta es nueva en Amazon Seller, primero crea al menos un listing en
              Seller Central.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs uppercase tracking-wider text-fg/60 bg-fg/[0.02]">
                <tr>
                  <th className="py-3 px-2 w-16">Imagen</th>
                  <th className="py-3 px-2">Producto</th>
                  <th className="py-3 px-2 whitespace-nowrap">Precio actual</th>
                  <th className="py-3 px-2">Mín €</th>
                  <th className="py-3 px-2">Máx €</th>
                  <th className="py-3 px-2">Reprecio</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <RangeRow key={l.id} listing={l} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-fg/50">
        Tip: el toggle de reprecio solo puede activarse si ambos límites (min y max) están
        definidos. Cambios guardados automáticamente al salir del campo.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-fg/10 bg-bg px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-fg/60">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
