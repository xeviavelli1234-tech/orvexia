import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { listListingsByAccount } from "@/lib/db/sellerListing";
import { SyncButton } from "./SyncButton";

export const metadata = { title: "Mis productos · Orvexia Repricer" };
export const dynamic = "force-dynamic";

function currencySymbol(code: string): string {
  if (code === "EUR") return "€";
  if (code === "USD") return "$";
  if (code === "GBP") return "£";
  return code;
}

export default async function ProductosPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/sellers/productos");

  const account = await getSellerAccountByUserId(session.userId);
  if (!account || !account.active) {
    return (
      <main className="relative min-h-screen overflow-hidden px-4 sm:px-6 py-16">
        <NetworkBackdrop />
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

  return (
    <main className="relative min-h-screen overflow-hidden px-4 sm:px-6 py-12">
      <NetworkBackdrop />

      <div className="relative max-w-6xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gradient-neon">
              Mis productos
            </h1>
            <p className="mt-2 text-sm text-white/55">
              Todos los productos publicados en tu cuenta de Amazon, sincronizados en tiempo real.
            </p>
          </div>
          <SyncButton lastSyncAt={account.lastSyncAt} />
        </div>

        {hasListings && (
          <div className="mt-6 flex flex-wrap gap-3">
            <Chip label="Productos" value={listings.length} />
            <Chip label="Con precio" value={`${withPrice} / ${listings.length}`} />
          </div>
        )}

        {!hasListings ? (
          <div className="mt-10 neon-border rounded-3xl p-12 text-center glass">
            <p className="text-white/70">
              Aún no hay productos importados. Pulsa{" "}
              <strong className="text-white">&ldquo;Sincronizar con Amazon&rdquo;</strong> arriba.
            </p>
            <p className="mt-3 text-xs text-white/40">
              Se mostrarán todos los listings publicados en tu cuenta de Seller Central.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <article
                key={l.id}
                className="glow-on-hover relative rounded-2xl glass p-4 flex gap-4"
              >
                <span
                  className="node-pulse absolute top-3 right-3 h-2 w-2 rounded-full bg-cyan-300"
                  aria-hidden
                />
                <div className="shrink-0">
                  {l.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.imageUrl}
                      alt={l.title}
                      className="w-16 h-16 object-contain rounded-lg bg-white/[0.04] border border-white/10"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-lg border border-white/10 bg-grid-cyber-fine"
                      aria-hidden
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold leading-tight text-white/90 line-clamp-2">
                    {l.title}
                  </h3>
                  <div className="mt-1 text-[11px] font-mono text-white/35 truncate">
                    {l.asin || "sin ASIN"} · {l.sku}
                  </div>
                  <div className="mt-3">
                    {l.priceCurrent > 0 ? (
                      <span className="text-lg font-bold text-cyan-300 text-glow-cyan">
                        {l.priceCurrent.toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        {currencySymbol(l.currency)}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-amber-300">Sin precio</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-8 text-xs text-white/35">
          Solo visualización. La configuración de reprecio (mín/máx por producto) se añadirá
          más adelante.
        </p>
      </div>
    </main>
  );
}

function Chip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2">
      <span className="text-[11px] uppercase tracking-wider text-white/45">{label}</span>
      <span className="ml-2 text-base font-bold text-white">{value}</span>
    </div>
  );
}

/** Fondo decorativo: rejilla + halos + red de nodos SVG (no interactivo). */
function NetworkBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid-cyber opacity-60" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[480px] w-[820px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.10),transparent_60%)]" />
      <div className="absolute bottom-0 right-0 h-[420px] w-[620px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.10),transparent_60%)]" />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.18]"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 800 600"
        fill="none"
      >
        <g stroke="rgba(94,234,212,0.5)" strokeWidth="0.6">
          <path d="M60 80 L220 180 L160 360 L60 80 Z" />
          <path d="M220 180 L420 120 L520 300 L160 360 Z" />
          <path d="M420 120 L640 200 L720 420 L520 300 Z" />
          <path d="M160 360 L320 520 L520 300" />
          <path d="M520 300 L640 480 L720 420" />
        </g>
        <g fill="rgba(94,234,212,0.85)">
          {[
            [60, 80],
            [220, 180],
            [420, 120],
            [640, 200],
            [160, 360],
            [520, 300],
            [720, 420],
            [320, 520],
            [640, 480],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="2.6" />
          ))}
        </g>
      </svg>
    </div>
  );
}
