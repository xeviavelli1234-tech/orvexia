import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { getReimbursementSummary } from "@/lib/reimbursements/data";
import { AuditButton, ClaimsTable } from "./ClaimsTable";

export const metadata = { title: "Reembolsos FBA · Orvexia" };
export const dynamic = "force-dynamic";

function eur(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default async function ReembolsosPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/sellers/reembolsos");
  const account = await getSellerAccountByUserId(session.userId);
  if (!account || !account.active) redirect("/dashboard/repricer");

  const summary = await getReimbursementSummary(session.userId);
  const lastAudit = summary.lastAuditAt
    ? new Date(summary.lastAuditAt).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const openCount =
    summary.counts.DETECTED + summary.counts.READY + summary.counts.FILED;

  return (
    <main className="min-h-screen bg-[#05060f] text-white px-4 sm:px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Cabecera */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/sellers/productos"
            className="text-xs text-white/45 hover:text-white/80 transition-colors"
          >
            ← Centro de control
          </Link>
          <span className="text-white/20">/</span>
          <h1 className="section-title text-2xl sm:text-3xl">
            Reembolsos <span className="text-gradient-neon">FBA</span>
          </h1>
          <div className="ml-auto flex items-center gap-3">
            {lastAudit && (
              <span className="text-[11px] text-white/35">Última auditoría: {lastAudit}</span>
            )}
            <AuditButton />
          </div>
        </div>
        <p className="mt-2 text-sm text-fg-subtle max-w-2xl">
          Recupera el dinero que Amazon te debe: inventario perdido o dañado en sus almacenes,
          devoluciones que reembolsaste pero nunca volvieron a tu stock y tarifas FBA cobradas de
          más. Solo pagas un <strong>{summary.successFeePct}% de lo que recuperes</strong>.
        </p>

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Kpi label="Recuperable estimado" value={eur(summary.potentialRecovery)} accent="emerald" />
          <Kpi label="Reclamaciones abiertas" value={String(openCount)} accent="cyan" />
          <Kpi label="Ya recuperado" value={eur(summary.recoveredTotal)} accent="emerald" />
          <Kpi label={`Comisión (${summary.successFeePct}%)`} value={eur(summary.yourFee)} />
          <Kpi label="Te quedas" value={eur(summary.youKeep)} accent="emerald" />
        </div>

        {/* Aviso de cumplimiento */}
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/55">
          ℹ Orvexia <strong>no presenta los casos por ti</strong>: detecta el dinero reclamable y
          redacta el texto listo para que lo revises y lo pegues en Seller Central → Obtener soporte.
          Los importes son estimaciones; Amazon resuelve cada caso según su valoración.
        </div>

        {/* Tabla de reclamaciones */}
        <section className="mt-6 card card-pad">
          <p className="eyebrow mb-1">▸ reclamaciones</p>
          <h2 className="text-base font-bold text-fg mb-4">Dinero que Amazon te debe</h2>
          <ClaimsTable claims={summary.claims} />
        </section>

        <p className="mt-4 text-[11px] text-white/35">
          La auditoría revisa tus eventos financieros SP-API de los últimos ~18 meses (la ventana
          legal de reclamación de Amazon). La valoración usa tu coste de producto cuando está
          configurado; si no, estima con el ingreso neto de venta y lo marca con menor confianza.
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
  accent?: "cyan" | "emerald";
}) {
  const c =
    accent === "emerald" ? "text-accent-300" : accent === "cyan" ? "text-cyan-300" : "text-fg-strong";
  return (
    <div className="card card-hover px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-fg-subtle truncate">{label}</div>
      <div className={`mt-1 font-mono-ui text-xl font-extrabold tabular ${c}`}>{value}</div>
    </div>
  );
}
