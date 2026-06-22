import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { getProfitSummary } from "@/lib/reprice/profit-data";

export const metadata = { title: "Beneficios · Orvexia Repricer" };
export const dynamic = "force-dynamic";

const PERIODS = [
  { d: 7, label: "7 días" },
  { d: 30, label: "30 días" },
  { d: 90, label: "90 días" },
];

function eur(n: number) {
  return (
    n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
    " €"
  );
}
function pct(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";
}

export default async function BeneficiosPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/sellers/beneficios");
  const account = await getSellerAccountByUserId(session.userId);
  if (!account || !account.active) redirect("/dashboard/repricer");

  const { d } = await searchParams;
  const days = PERIODS.some((p) => String(p.d) === d) ? Number(d) : 30;

  const report = await getProfitSummary(session.userId, days);
  const { totals, bySku } = report;
  const profitPositive = totals.profit >= 0;

  return (
    <main className="min-h-screen bg-[#05060f] text-white px-4 sm:px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Cabecera */}
        <div className="flex items-center gap-3">
          <Link
            href="/sellers/productos"
            className="text-xs text-white/45 hover:text-white/80 transition-colors"
          >
            ← Centro de control
          </Link>
          <span className="text-white/20">/</span>
          <h1 className="section-title text-2xl sm:text-3xl">
            Beneficio <span className="text-gradient-neon">real</span>
          </h1>
          <div className="ml-auto flex items-center gap-1.5">
            {PERIODS.map((p) => {
              const active = p.d === days;
              return (
                <Link
                  key={p.d}
                  href={`/sellers/beneficios?d=${p.d}`}
                  className={`btn btn-sm ${active ? "btn-accent" : "btn-ghost"}`}
                >
                  {p.label}
                </Link>
              );
            })}
          </div>
        </div>
        <p className="mt-2 text-sm text-fg-subtle max-w-2xl">
          Beneficio realizado a partir de tus ventas reales en Amazon (últimos {days} días),
          descontando IVA, comisión de Amazon y tu coste por producto.
        </p>

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Kpi
            label="Beneficio neto"
            value={eur(totals.profit)}
            accent={profitPositive ? "emerald" : "red"}
          />
          <Kpi label="Margen" value={pct(totals.marginPct)} accent={profitPositive ? "emerald" : "red"} />
          <Kpi label="Ingreso" value={eur(totals.revenue)} />
          <Kpi label="Coste producto" value={eur(totals.cost)} />
          <Kpi label="Unidades" value={String(totals.units)} accent="cyan" />
          <Kpi label="SKUs vendidos" value={String(bySku.length)} />
        </div>

        {/* Avisos de honestidad de los datos */}
        {(report.skusMissingCost > 0 || totals.hasEstimated) && (
          <div className="mt-3 space-y-1.5 text-[11px]">
            {report.skusMissingCost > 0 && (
              <p className="rounded-lg border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2 text-amber-200/90">
                ⚠ {report.skusMissingCost}{" "}
                {report.skusMissingCost === 1 ? "SKU vendido no tiene" : "SKUs vendidos no tienen"}{" "}
                coste de producto definido: su beneficio aparece <strong>antes de coste</strong> (solo
                descuenta IVA y comisión). Añade el coste en el Centro de control para verlo completo.
              </p>
            )}
            {totals.hasEstimated && (
              <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white/55">
                ℹ {totals.estimatedUnits}{" "}
                {totals.estimatedUnits === 1 ? "unidad usa" : "unidades usan"} precio estimado porque
                Amazon no devolvió el importe de venta; se calculó con el precio actual del listing.
              </p>
            )}
          </div>
        )}

        {/* Tabla por SKU */}
        <section className="mt-6 card card-pad">
          <p className="eyebrow mb-1">▸ por SKU</p>
          <h2 className="text-base font-bold text-fg mb-4">Rentabilidad por producto</h2>
          {bySku.length === 0 ? (
            <p className="text-sm text-white/45">
              {report.hasAccount
                ? "Aún no hay ventas en este periodo. En cuanto entren pedidos, verás aquí tu beneficio real por producto."
                : "Conecta tu cuenta de Amazon para ver tu beneficio real."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-white/40">
                  <tr>
                    <th className="py-2 pr-3">Producto</th>
                    <th className="py-2 px-3 text-right">Uds.</th>
                    <th className="py-2 px-3 text-right">Ingreso</th>
                    <th className="py-2 px-3 text-right">Coste</th>
                    <th className="py-2 px-3 text-right">Beneficio</th>
                    <th className="py-2 px-3 text-right">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {bySku.map((s) => {
                    const loss = s.profit < 0;
                    return (
                      <tr key={s.sku} className="border-t border-white/[0.06]">
                        <td className="py-2 pr-3 max-w-[300px]">
                          <div className="truncate text-white/85">{s.title || s.sku}</div>
                          <div className="font-mono text-[10px] text-white/35">
                            {s.asin || "sin ASIN"} · {s.sku}
                            {s.hasEstimated && (
                              <span className="badge badge-hot ml-2 !text-[10px] !py-0">estimado</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-white/60">{s.units}</td>
                        <td className="py-2 px-3 text-right font-mono text-white/70">
                          {eur(s.revenue)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-white/50">
                          {s.cost > 0 ? eur(s.cost) : "—"}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold ${
                            loss ? "text-red-300" : "text-emerald-300"
                          }`}
                        >
                          {eur(s.profit)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono ${
                            loss ? "text-red-300" : "text-white/70"
                          }`}
                        >
                          {pct(s.marginPct)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-4 text-[11px] text-white/35">
          El beneficio es una estimación bien fundada: la comisión se calcula con el % configurado en
          cada listing (no la comisión exacta cobrada por Amazon) y se usa el coste actual del
          producto, no el del día de la venta.
        </p>
      </div>
    </main>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "cyan" | "emerald" | "red";
}) {
  const c =
    accent === "emerald"
      ? "text-accent-300"
      : accent === "red"
        ? "text-danger-500"
        : accent === "cyan"
          ? "text-cyan-300"
          : "text-fg-strong";
  return (
    <div className="card card-hover px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-fg-subtle truncate">{label}</div>
      <div className={`mt-1 font-mono-ui text-xl font-extrabold tabular ${c}`}>{value}</div>
    </div>
  );
}
