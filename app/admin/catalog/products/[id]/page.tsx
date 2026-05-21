import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  deleteProductAction,
  deleteOfferAction,
  updateOfferPriceAction,
  updateProductImageAction,
} from "../../actions";

export const metadata = { title: "Admin · Producto · Orvexia" };
export const dynamic = "force-dynamic";

function fmt(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function dt(d: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export default async function ProductDetailAdmin({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/catalog/products");
  const admin = await isAdminUser(session.userId);
  if (!admin) {
    return (
      <main className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="text-3xl font-bold text-white">403 · No autorizado</h1>
      </main>
    );
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      offers: { orderBy: { priceCurrent: "asc" } },
      priceHistory: { orderBy: { recordedAt: "desc" }, take: 20 },
    },
  });
  if (!product) notFound();

  const inp =
    "rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none";

  return (
    <main className="max-w-5xl mx-auto px-5 py-12">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link
            href="/admin/catalog/products"
            className="text-xs text-white/45 hover:text-cyan-300"
          >
            ← Todos los productos
          </Link>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white">
            {product.name}
          </h1>
          <p className="text-sm text-white/55 mt-0.5">
            <span className="font-semibold">{product.brand}</span> · {product.model} ·{" "}
            <span className="font-mono">/{product.slug}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/productos/${product.slug}`}
            target="_blank"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 transition-colors"
          >
            Ver ficha pública ↗
          </Link>
          <form action={deleteProductAction}>
            <input type="hidden" name="id" value={product.id} />
            <button
              type="submit"
              className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-rose-200 hover:bg-rose-500/20 transition-colors text-sm"
            >
              ☠ Borrar producto
            </button>
          </form>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5 mb-8">
        <div>
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              className="w-full aspect-square object-contain rounded-xl border border-white/10 bg-white/[0.03]"
            />
          ) : (
            <div className="w-full aspect-square grid place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-white/30 text-sm">
              Sin imagen
            </div>
          )}
          <form action={updateProductImageAction} className="mt-2 space-y-2">
            <input type="hidden" name="id" value={product.id} />
            <input
              name="image"
              defaultValue={product.image ?? ""}
              placeholder="URL de imagen…"
              className={`${inp} w-full text-xs`}
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-cyan-500/90 text-black text-xs font-semibold py-1.5 hover:bg-cyan-400 transition-colors"
            >
              Guardar imagen
            </button>
          </form>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/75">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
              Descripción
            </div>
            {product.description || (
              <span className="text-white/30">Sin descripción</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Categoría" value={product.category.replace(/_/g, " ").toLowerCase()} />
            <Stat label="Ofertas activas" value={String(product.offers.length)} />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-white mb-3">
          Ofertas <span className="text-white/40 text-sm">· {product.offers.length}</span>
        </h2>
        {product.offers.length === 0 ? (
          <p className="text-sm text-white/45 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            Este producto no tiene ofertas todavía. Sube un CSV con filas para añadirlas
            (con <code className="text-cyan-300">store, price, external_url</code>).
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/45">
                <tr>
                  <th className="px-3 py-2 text-left">Tienda</th>
                  <th className="px-3 py-2 text-right">Precio actual</th>
                  <th className="px-3 py-2 text-right">Precio anterior</th>
                  <th className="px-3 py-2 text-right">%</th>
                  <th className="px-3 py-2 text-center">Stock</th>
                  <th className="px-3 py-2 text-left">URL</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {product.offers.map((o) => (
                  <tr key={o.id} className="border-t border-white/5">
                    <td className="px-3 py-2 text-white/85 font-semibold">{o.store}</td>
                    <td className="px-3 py-2 text-right">
                      <form
                        action={updateOfferPriceAction}
                        className="inline-flex items-center gap-1 justify-end"
                      >
                        <input type="hidden" name="id" value={o.id} />
                        <input
                          name="price"
                          defaultValue={o.priceCurrent}
                          inputMode="decimal"
                          className={`${inp} w-24 text-right`}
                        />
                        <input
                          name="priceOld"
                          defaultValue={o.priceOld ?? ""}
                          placeholder="—"
                          inputMode="decimal"
                          className={`${inp} w-20 text-right text-xs`}
                          title="Precio anterior (opcional, tachado)"
                        />
                        <button
                          type="submit"
                          className="rounded bg-cyan-500/80 text-black text-[11px] px-2 py-1 font-semibold hover:bg-cyan-400"
                        >
                          ✓
                        </button>
                      </form>
                    </td>
                    <td className="px-3 py-2 text-right text-white/40 line-through text-xs">
                      {o.priceOld ? `${fmt(o.priceOld)} €` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {o.discountPercent ? (
                        <span className="text-emerald-300 text-xs font-semibold">
                          -{o.discountPercent}%
                        </span>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          o.inStock ? "bg-emerald-400" : "bg-rose-400"
                        }`}
                        title={o.inStock ? "Disponible" : "Sin stock"}
                      />
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <a
                        href={o.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-300 hover:underline truncate inline-block max-w-[220px]"
                      >
                        {new URL(o.externalUrl).hostname}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <form action={deleteOfferAction} className="inline">
                        <input type="hidden" name="id" value={o.id} />
                        <button
                          type="submit"
                          className="text-rose-300 hover:underline text-xs"
                        >
                          quitar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-3">
          Historial de precios{" "}
          <span className="text-white/40 text-sm">· últimos {product.priceHistory.length}</span>
        </h2>
        {product.priceHistory.length === 0 ? (
          <p className="text-sm text-white/45">Sin historial todavía.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/45">
                <tr>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Tienda</th>
                  <th className="px-3 py-2 text-right">Precio</th>
                </tr>
              </thead>
              <tbody>
                {product.priceHistory.map((h) => (
                  <tr key={h.id} className="border-t border-white/5">
                    <td className="px-3 py-2 text-xs text-white/55">{dt(h.recordedAt)}</td>
                    <td className="px-3 py-2 text-white/80">{h.store}</td>
                    <td className="px-3 py-2 text-right text-white/85 tabular-nums">
                      {fmt(h.price)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="text-sm font-semibold text-white/85 mt-0.5 capitalize">{value}</div>
    </div>
  );
}
