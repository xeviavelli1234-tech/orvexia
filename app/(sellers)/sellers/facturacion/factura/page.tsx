import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { getBillingState, PRO_PRICE_EUR, type SellerPlan } from "@/lib/billing";
import PrintButton from "./PrintButton";

export const metadata = { title: "Factura · Orvexia Repricer" };
export const dynamic = "force-dynamic";

const VAT_RATE = 21; // % IVA España

function eur(n: number) {
  return (
    n.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}

export default async function FacturaPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/sellers/facturacion/factura");

  const account = await getSellerAccountByUserId(session.userId);
  if (!account) redirect("/sellers/facturacion");

  const billing = getBillingState(account.plan as SellerPlan, account.trialEndsAt);
  if (billing.plan !== "PRO") {
    return (
      <div className="max-w-2xl mx-auto px-5 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Factura</h1>
        <p className="mt-4 text-fg/70">
          No hay facturas en el plan de prueba. Pasa a Pro para generar
          facturas con IVA.
        </p>
        <Link
          href="/sellers/facturacion"
          className="mt-6 inline-block text-[var(--brand-600)] underline"
        >
          ← Volver a Facturación
        </Link>
      </div>
    );
  }

  const now = new Date();
  const total = PRO_PRICE_EUR; // 29 € IVA incluido
  const base = Math.round((total / (1 + VAT_RATE / 100)) * 100) / 100;
  const iva = Math.round((total - base) * 100) / 100;

  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const invoiceNo = `ORV-${ym}-${account.id.slice(-6).toUpperCase()}`;
  const fmtDate = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);
  const periodo = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(now);

  const issuer = {
    name: process.env.INVOICE_ISSUER_NAME || "Orvexia",
    nif: process.env.INVOICE_ISSUER_NIF || "(configurar NIF)",
    address: process.env.INVOICE_ISSUER_ADDRESS || "(configurar dirección)",
    email: process.env.INVOICE_ISSUER_EMAIL || "orvexiaesp@gmail.com",
  };

  return (
    <div className="min-h-screen bg-fg/[0.03] py-10 px-4 print:bg-white print:py-0">
      <div className="max-w-2xl mx-auto flex items-center justify-between mb-5 print:hidden">
        <Link href="/sellers/facturacion" className="text-sm text-fg/60 hover:text-fg">
          ← Volver a Facturación
        </Link>
        <PrintButton />
      </div>

      <div className="max-w-2xl mx-auto bg-white text-[#0f172a] rounded-xl shadow-sm print:shadow-none p-8 sm:p-10">
        <div className="flex items-start justify-between gap-6 border-b border-[#e2e8f0] pb-6">
          <div>
            <div className="text-2xl font-extrabold tracking-tight">
              {issuer.name}
            </div>
            <div className="mt-1 text-xs text-[#475569] leading-relaxed">
              {issuer.nif}
              <br />
              {issuer.address}
              <br />
              {issuer.email}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold uppercase tracking-wider">
              Factura
            </div>
            <div className="mt-1 text-xs text-[#475569]">
              Nº <span className="font-mono">{invoiceNo}</span>
            </div>
            <div className="text-xs text-[#475569]">Fecha: {fmtDate}</div>
          </div>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#94a3b8] font-bold">
              Facturar a
            </div>
            <div className="mt-1 text-[#0f172a]">{session.email}</div>
            {account.stripeCustomerId && (
              <div className="text-xs text-[#94a3b8] font-mono">
                Cliente Stripe: {account.stripeCustomerId}
              </div>
            )}
          </div>
          <div className="sm:text-right">
            <div className="text-[10px] uppercase tracking-wider text-[#94a3b8] font-bold">
              Periodo
            </div>
            <div className="mt-1 text-[#0f172a] capitalize">{periodo}</div>
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-[#e2e8f0] text-left text-[11px] uppercase tracking-wider text-[#94a3b8]">
              <th className="py-2">Concepto</th>
              <th className="py-2 text-right">Base</th>
              <th className="py-2 text-right">IVA {VAT_RATE}%</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#f1f5f9]">
              <td className="py-3">
                Suscripción Orvexia Repricer · Plan Pro (mensual)
              </td>
              <td className="py-3 text-right font-mono">{eur(base)}</td>
              <td className="py-3 text-right font-mono">{eur(iva)}</td>
              <td className="py-3 text-right font-mono">{eur(total)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="py-1 pr-8 text-[#475569]">Base imponible</td>
                <td className="py-1 text-right font-mono">{eur(base)}</td>
              </tr>
              <tr>
                <td className="py-1 pr-8 text-[#475569]">
                  IVA ({VAT_RATE}%)
                </td>
                <td className="py-1 text-right font-mono">{eur(iva)}</td>
              </tr>
              <tr className="border-t border-[#e2e8f0]">
                <td className="py-2 pr-8 font-bold">Total</td>
                <td className="py-2 text-right font-mono font-extrabold">
                  {eur(total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-10 text-[10px] leading-relaxed text-[#94a3b8] border-t border-[#e2e8f0] pt-4">
          Documento generado automáticamente. Importe con IVA incluido
          (España, {VAT_RATE}%). Para operaciones intracomunitarias B2B con
          número de IVA válido puede aplicar la inversión del sujeto pasivo.
          Cuando la pasarela de pago esté activa, la factura oficial la emite
          el proveedor de pagos (Stripe) con cada cobro.
        </p>
      </div>
    </div>
  );
}
