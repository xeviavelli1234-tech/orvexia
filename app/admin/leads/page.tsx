import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Admin · Leads · Orvexia" };
export const dynamic = "force-dynamic";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}
function str(v: unknown): string {
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

export default async function LeadsAdmin() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/leads");
  const admin = await isAdminUser(session.userId);
  if (!admin) {
    return (
      <main className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="text-3xl font-bold text-white">403 · No autorizado</h1>
        <p className="mt-3 text-white/60">Esta zona es solo para administradores.</p>
        <Link href="/" className="mt-6 inline-block text-cyan-300 hover:underline">
          ← Volver al inicio
        </Link>
      </main>
    );
  }

  const since7 = new Date();
  since7.setDate(since7.getDate() - 7);
  const [total, last7, leads] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: since7 } } }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
  ]);
  const uniqueEmails = new Set(leads.map((l) => l.email)).size;

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);

  return (
    <main className="max-w-5xl mx-auto px-5 py-12">
      <header className="mb-8">
        <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300 mb-2">
          ▸ /admin · leads
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Leads <span className="text-gradient-neon">capturados</span>
        </h1>
        <p className="mt-2 text-sm text-white/55 max-w-2xl">
          Emails recogidos en el simulador de precios y la lista de espera del
          repricer. Exporta el CSV para importarlos a tu herramienta de email.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-3 mb-6">
        <Kpi label="Total leads" value={total} />
        <Kpi label="Últimos 7 días" value={last7} tone="ok" />
        <Kpi label="Emails únicos (visibles)" value={uniqueEmails} />
      </section>

      <div className="mb-6">
        <a
          href="/api/admin/leads/export"
          className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/20 transition-colors"
          download
        >
          ⬇️ Exportar CSV (todos)
        </a>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <p className="text-white/60">
            Aún no hay leads. Aparecerán aquí en cuanto alguien deje su email en{" "}
            <Link href="/repricer" className="text-cyan-300 hover:underline">
              /repricer
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-white/55">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Fecha</th>
                <th className="text-left font-semibold px-4 py-3">Email</th>
                <th className="text-left font-semibold px-4 py-3">Origen</th>
                <th className="text-left font-semibold px-4 py-3">Resumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {leads.map((l) => {
                const ctx = asRecord(l.context);
                const result = asRecord(ctx?.result);
                const product = str(ctx?.product) || "—";
                const current = str(ctx?.currentPrice);
                const rec = result ? str(result.recommended_price) : "";
                const summary =
                  current && rec
                    ? `${product} · ${current}€ → ${rec}€`
                    : product;
                return (
                  <tr key={l.id} className="text-white/80 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 whitespace-nowrap text-white/55 font-mono-ui text-xs">
                      {fmtDate(l.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">
                      <a
                        href={`mailto:${l.email}`}
                        className="hover:text-cyan-300 transition-colors"
                      >
                        {l.email}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/70">
                        {l.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/55 text-xs">{summary}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {leads.length === 500 && (
        <p className="mt-3 text-xs text-white/40">
          Mostrando los 500 más recientes. Usa el CSV para descargarlos todos.
        </p>
      )}
    </main>
  );
}

function Kpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "ok" | "neutral";
}) {
  const color = tone === "ok" ? "text-emerald-300" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className={`mt-0.5 text-2xl font-bold ${color}`}>
        {value.toLocaleString("es-ES")}
      </div>
    </div>
  );
}
