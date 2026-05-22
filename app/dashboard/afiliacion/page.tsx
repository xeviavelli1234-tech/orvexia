export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Afiliación · Orvexia" };

interface StoreStat {
  store: string;
  clicks: bigint;
  conversions: bigint;
  approvedRevenue: number | null;
  approvedCommission: number | null;
}

interface TopProduct {
  productId: string;
  name: string;
  slug: string;
  clicks: bigint;
}

interface RecentConversion {
  id: string;
  store: string;
  amount: number;
  commission: number;
  currency: string;
  status: string;
  receivedAt: Date;
  network: string;
  transactionId: string;
}

interface DailyClicks {
  day: Date;
  clicks: bigint;
}

function fmtEur(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtInt(n: bigint | number): string {
  return new Intl.NumberFormat("es-ES").format(Number(n));
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(2)} %`;
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AfiliacionDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/afiliacion");
  const admin = await isAdminUser(session.userId);
  if (!admin) notFound();

  const [
    clicks24h,
    clicks7d,
    clicks30d,
    conversionsTotals,
    storeStats,
    topProducts,
    recent,
    dailyClicks,
  ] = await Promise.all([
    prisma.affiliateClickEvent.count({
      where: { clickedAt: { gte: new Date(Date.now() - 24 * 3600_000) } },
    }),
    prisma.affiliateClickEvent.count({
      where: { clickedAt: { gte: new Date(Date.now() - 7 * 24 * 3600_000) } },
    }),
    prisma.affiliateClickEvent.count({
      where: { clickedAt: { gte: new Date(Date.now() - 30 * 24 * 3600_000) } },
    }),
    prisma.affiliateConversion.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { amount: true, commission: true },
    }),
    prisma.$queryRaw<StoreStat[]>`
      WITH c AS (
        SELECT "selectedRetailer" AS store, COUNT(*)::bigint AS clicks
        FROM "AffiliateClickEvent"
        WHERE "clickedAt" >= NOW() - INTERVAL '7 days'
        GROUP BY "selectedRetailer"
      ),
      v AS (
        SELECT store,
               COUNT(*)::bigint AS conversions,
               SUM(CASE WHEN status = 'APPROVED' THEN amount     ELSE 0 END) AS "approvedRevenue",
               SUM(CASE WHEN status = 'APPROVED' THEN commission ELSE 0 END) AS "approvedCommission"
        FROM "AffiliateConversion"
        WHERE "receivedAt" >= NOW() - INTERVAL '7 days'
        GROUP BY store
      )
      SELECT
        COALESCE(c.store, v.store) AS store,
        COALESCE(c.clicks, 0::bigint) AS clicks,
        COALESCE(v.conversions, 0::bigint) AS conversions,
        v."approvedRevenue",
        v."approvedCommission"
      FROM c FULL OUTER JOIN v ON c.store = v.store
      ORDER BY clicks DESC, conversions DESC
      LIMIT 20
    `,
    prisma.$queryRaw<TopProduct[]>`
      SELECT p.id AS "productId", p.name, p.slug, COUNT(*)::bigint AS clicks
      FROM "AffiliateClickEvent" e
      JOIN "Product" p ON p.id = e."productId"
      WHERE e."clickedAt" >= NOW() - INTERVAL '7 days'
      GROUP BY p.id, p.name, p.slug
      ORDER BY clicks DESC
      LIMIT 10
    `,
    prisma.affiliateConversion.findMany({
      orderBy: { receivedAt: "desc" },
      take: 20,
      select: {
        id: true, store: true, amount: true, commission: true, currency: true,
        status: true, receivedAt: true, network: true, transactionId: true,
      },
    }),
    prisma.$queryRaw<DailyClicks[]>`
      SELECT DATE_TRUNC('day', "clickedAt") AS day, COUNT(*)::bigint AS clicks
      FROM "AffiliateClickEvent"
      WHERE "clickedAt" >= NOW() - INTERVAL '14 days'
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 14
    `,
  ]);

  const convByStatus = Object.fromEntries(
    conversionsTotals.map((g) => [g.status, {
      count: g._count.id,
      amount: g._sum.amount ?? 0,
      commission: g._sum.commission ?? 0,
    }]),
  ) as Record<string, { count: number; amount: number; commission: number }>;

  const totalConv = (convByStatus.APPROVED?.count ?? 0) +
                    (convByStatus.PENDING?.count ?? 0) +
                    (convByStatus.REJECTED?.count ?? 0);

  const ctr7d = clicks7d > 0 ? (convByStatus.APPROVED?.count ?? 0) / clicks7d : 0;
  const maxDaily = dailyClicks.length
    ? Math.max(...dailyClicks.map((d) => Number(d.clicks)))
    : 1;

  const hasPostbackSecret = !!process.env.AFFILIATE_POSTBACK_SECRET;

  return (
    <main className="min-h-screen bg-bg-subtle">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-1">
              Admin · Tracking
            </p>
            <h1 className="text-3xl font-extrabold text-fg tracking-tight">Afiliación</h1>
            <p className="text-sm text-fg-subtle mt-1">
              Clicks salientes a tiendas y conversiones recibidas por postback.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            ← Volver al panel
          </Link>
        </div>

        {/* Warning si falta la env */}
        {!hasPostbackSecret && (
          <div className="mb-6 rounded-2xl border border-warn-500/40 bg-warn-500/5 p-4 text-sm">
            <p className="font-bold text-warn-500 mb-1">⚠ Postback no configurado</p>
            <p className="text-fg-muted">
              Define <code className="px-1.5 py-0.5 rounded bg-bg-subtle text-fg font-mono text-xs">AFFILIATE_POSTBACK_SECRET</code> en
              tu entorno y configura en Awin la URL{" "}
              <code className="px-1.5 py-0.5 rounded bg-bg-subtle text-fg font-mono text-xs break-all">
                https://tu-dominio/api/affiliate-postback?secret=&lt;SECRET&gt;&amp;transactionId=!!!transactionId!!!&amp;store=!!!merchantId!!!&amp;amount=!!!totalCommissionable!!!&amp;commission=!!!commissionAmount!!!&amp;currency=!!!currency!!!&amp;status=!!!commissionStatus!!!&amp;clickref=!!!clickref!!!
              </code>
            </p>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <KpiCard label="Clicks 24h" value={fmtInt(clicks24h)} />
          <KpiCard label="Clicks 7d" value={fmtInt(clicks7d)} />
          <KpiCard label="Clicks 30d" value={fmtInt(clicks30d)} />
          <KpiCard
            label="CTR aprob. 7d"
            value={fmtPct(ctr7d)}
            hint={`${fmtInt(convByStatus.APPROVED?.count ?? 0)} / ${fmtInt(clicks7d)}`}
          />
        </div>

        {/* Conversiones por status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          <ConvCard
            status="APPROVED"
            count={convByStatus.APPROVED?.count ?? 0}
            commission={convByStatus.APPROVED?.commission ?? 0}
          />
          <ConvCard
            status="PENDING"
            count={convByStatus.PENDING?.count ?? 0}
            commission={convByStatus.PENDING?.commission ?? 0}
          />
          <ConvCard
            status="REJECTED"
            count={convByStatus.REJECTED?.count ?? 0}
            commission={convByStatus.REJECTED?.commission ?? 0}
          />
        </div>

        {/* Sparkline diario */}
        {dailyClicks.length > 0 && (
          <section className="mb-10 bg-bg-elevated rounded-2xl border border-border p-5">
            <h2 className="text-xs font-bold text-fg-subtle uppercase tracking-widest mb-4">
              Clicks · 14 días
            </h2>
            <div className="flex items-end gap-1 h-24">
              {dailyClicks.slice().reverse().map((d) => {
                const ratio = Number(d.clicks) / maxDaily;
                return (
                  <div
                    key={d.day.toISOString()}
                    title={`${fmtDate(d.day)}: ${fmtInt(d.clicks)} clicks`}
                    className="flex-1 bg-brand-600 rounded-t hover:bg-brand-700 transition-colors min-h-[2px]"
                    style={{ height: `${Math.max(2, ratio * 100)}%` }}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Por tienda */}
        <section className="mb-10">
          <h2 className="text-xs font-bold text-fg-subtle uppercase tracking-widest mb-3">
            Por tienda · 7 días
          </h2>
          <div className="bg-bg-elevated rounded-2xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-fg-subtle border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5">Tienda</th>
                  <th className="text-right px-4 py-2.5">Clicks</th>
                  <th className="text-right px-4 py-2.5">Conversiones</th>
                  <th className="text-right px-4 py-2.5">Comisión aprob.</th>
                  <th className="text-right px-4 py-2.5">EPC</th>
                </tr>
              </thead>
              <tbody>
                {storeStats.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-fg-subtle">
                      Sin actividad en los últimos 7 días.
                    </td>
                  </tr>
                ) : (
                  storeStats.map((s) => {
                    const clicks = Number(s.clicks);
                    const epc = clicks > 0 ? (s.approvedCommission ?? 0) / clicks : 0;
                    return (
                      <tr key={s.store} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-2.5 font-semibold text-fg">{s.store}</td>
                        <td className="px-4 py-2.5 text-right tabular text-fg">{fmtInt(s.clicks)}</td>
                        <td className="px-4 py-2.5 text-right tabular text-fg">{fmtInt(s.conversions)}</td>
                        <td className="px-4 py-2.5 text-right tabular text-fg">
                          {s.approvedCommission != null ? fmtEur(s.approvedCommission) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular text-fg-muted">
                          {epc > 0 ? fmtEur(epc) : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top productos */}
        <section className="mb-10">
          <h2 className="text-xs font-bold text-fg-subtle uppercase tracking-widest mb-3">
            Productos más clicados · 7 días
          </h2>
          <div className="bg-bg-elevated rounded-2xl border border-border overflow-hidden">
            {topProducts.length === 0 ? (
              <p className="text-center py-6 text-sm text-fg-subtle">
                Sin clicks en los últimos 7 días.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {topProducts.map((p, i) => (
                  <li key={p.productId} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-5 text-right text-[11px] font-mono text-fg-subtle">
                      {i + 1}
                    </span>
                    <Link
                      href={`/productos/${p.slug}`}
                      className="flex-1 text-sm font-semibold text-fg hover:text-brand-600 line-clamp-1"
                    >
                      {p.name}
                    </Link>
                    <span className="text-sm tabular text-fg-muted">
                      {fmtInt(p.clicks)} clicks
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Últimas conversiones */}
        <section>
          <h2 className="text-xs font-bold text-fg-subtle uppercase tracking-widest mb-3">
            Últimas conversiones
          </h2>
          <div className="bg-bg-elevated rounded-2xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-fg-subtle border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5">Fecha</th>
                  <th className="text-left px-4 py-2.5">Red · TxID</th>
                  <th className="text-left px-4 py-2.5">Tienda</th>
                  <th className="text-right px-4 py-2.5">Importe</th>
                  <th className="text-right px-4 py-2.5">Comisión</th>
                  <th className="text-left px-4 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-fg-subtle">
                      Aún no hay conversiones registradas. Configura el postback en Awin.
                    </td>
                  </tr>
                ) : (
                  recent.map((c) => (
                    <tr key={c.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5 text-fg-muted whitespace-nowrap">{fmtDate(c.receivedAt)}</td>
                      <td className="px-4 py-2.5 text-fg-muted font-mono text-[11px]">
                        {c.network} · {c.transactionId}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-fg">{c.store}</td>
                      <td className="px-4 py-2.5 text-right tabular text-fg">{fmtEur(c.amount)}</td>
                      <td className="px-4 py-2.5 text-right tabular text-fg">{fmtEur(c.commission)}</td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={c.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalConv > 0 && (
            <p className="text-xs text-fg-subtle mt-2">
              Total histórico: {fmtInt(totalConv)} conversiones.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-bg-elevated rounded-2xl border border-border p-4">
      <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest mb-1.5">
        {label}
      </p>
      <p className="text-2xl font-extrabold text-fg tabular">{value}</p>
      {hint && <p className="text-[11px] text-fg-subtle mt-0.5 tabular">{hint}</p>}
    </div>
  );
}

function ConvCard({
  status,
  count,
  commission,
}: { status: "APPROVED" | "PENDING" | "REJECTED"; count: number; commission: number }) {
  const conf = {
    APPROVED: { label: "Aprobadas",  color: "text-accent-600", border: "border-accent-600/30" },
    PENDING:  { label: "Pendientes", color: "text-warn-500",   border: "border-warn-500/30"   },
    REJECTED: { label: "Rechazadas", color: "text-danger-500", border: "border-danger-500/30" },
  }[status];
  return (
    <div className={`bg-bg-elevated rounded-2xl border ${conf.border} p-4`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${conf.color}`}>
        {conf.label}
      </p>
      <p className="text-2xl font-extrabold text-fg tabular">{fmtInt(count)}</p>
      <p className="text-[11px] text-fg-subtle mt-0.5 tabular">{fmtEur(commission)} comisión</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const conf = {
    APPROVED: { label: "Aprobada",  cls: "bg-accent-600/10 text-accent-600 border-accent-600/30" },
    PENDING:  { label: "Pendiente", cls: "bg-warn-500/10   text-warn-500   border-warn-500/30"   },
    REJECTED: { label: "Rechazada", cls: "bg-danger-500/10 text-danger-500 border-danger-500/30" },
  }[status] ?? { label: status, cls: "bg-bg-subtle text-fg-muted border-border" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${conf.cls}`}>
      {conf.label}
    </span>
  );
}
