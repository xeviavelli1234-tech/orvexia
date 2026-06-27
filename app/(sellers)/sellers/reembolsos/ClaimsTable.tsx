"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ClaimView } from "@/lib/reimbursements/data";
import type {
  ReimbursementClaimStatus,
  ReimbursementClaimType,
} from "@/app/generated/prisma/client";
import { runAuditAction, claimStatusAction } from "./actions";

const TYPE_LABEL: Record<ReimbursementClaimType, string> = {
  WAREHOUSE_LOST: "Inventario perdido",
  WAREHOUSE_DAMAGED: "Dañado por Amazon",
  INBOUND_SHORTAGE: "Faltante en recepción",
  CUSTOMER_RETURN_MISSING: "Devolución no repuesta",
  REIMBURSEMENT_SHORTFALL: "Reembolso insuficiente",
  OVERCHARGED_FEE: "Tarifa duplicada",
};

const STATUS_LABEL: Record<ReimbursementClaimStatus, string> = {
  DETECTED: "Detectada",
  READY: "Lista",
  FILED: "Presentada",
  RECOVERED: "Recuperada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
};

const STATUS_CLASS: Record<ReimbursementClaimStatus, string> = {
  DETECTED: "text-cyan-300 border-cyan-400/30 bg-cyan-500/10",
  READY: "text-amber-200 border-amber-400/30 bg-amber-500/10",
  FILED: "text-violet-200 border-violet-400/30 bg-violet-500/10",
  RECOVERED: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
  REJECTED: "text-red-300 border-red-400/30 bg-red-500/10",
  EXPIRED: "text-white/40 border-white/15 bg-white/5",
};

function eur(n: number, currency = "EUR") {
  return n.toLocaleString("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function AuditButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            const res = await runAuditAction();
            if (!res.ok) setMsg(errorLabel(res.error));
            else router.refresh();
          })
        }
        className="btn btn-accent btn-sm disabled:opacity-60"
      >
        {pending ? "Auditando…" : "Auditar ahora"}
      </button>
      {msg && <span className="text-[11px] text-red-300">{msg}</span>}
    </div>
  );
}

function errorLabel(code: string): string {
  switch (code) {
    case "no_amazon_account":
      return "Conecta tu cuenta de Amazon para auditar.";
    case "ip_not_allowed":
      return "Tu IP no está autorizada para esta cuenta.";
    case "unauthorized":
      return "Sesión expirada, vuelve a entrar.";
    default:
      return "No se pudo completar la auditoría.";
  }
}

export function ClaimsTable({ claims }: { claims: ClaimView[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (claims.length === 0) {
    return (
      <p className="text-sm text-white/45">
        Aún no hay reclamaciones detectadas. Pulsa <strong>Auditar ahora</strong> para revisar tus
        eventos financieros de Amazon de los últimos 18 meses.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-white/40">
          <tr>
            <th className="py-2 pr-3">Tipo</th>
            <th className="py-2 px-3">Producto</th>
            <th className="py-2 px-3 text-right">Uds.</th>
            <th className="py-2 px-3 text-right">Reclamable</th>
            <th className="py-2 px-3 text-right">Confianza</th>
            <th className="py-2 px-3 text-right">Ventana</th>
            <th className="py-2 px-3">Estado</th>
            <th className="py-2 pl-3"></th>
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => {
            const isOpen = open === c.id;
            const urgent = c.daysLeft != null && c.daysLeft <= 30 && c.daysLeft >= 0;
            return (
              <ClaimRow
                key={c.id}
                claim={c}
                isOpen={isOpen}
                urgent={urgent}
                onToggle={() => setOpen(isOpen ? null : c.id)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ClaimRow({
  claim: c,
  isOpen,
  urgent,
  onToggle,
}: {
  claim: ClaimView;
  isOpen: boolean;
  urgent: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-t border-white/[0.06] align-top">
        <td className="py-2.5 pr-3">
          <span className="text-white/85">{TYPE_LABEL[c.type]}</span>
        </td>
        <td className="py-2.5 px-3 max-w-[260px]">
          <div className="truncate text-white/80">{c.title || c.sku}</div>
          <div className="font-mono text-[10px] text-white/35">
            {c.asin || "sin ASIN"} · {c.sku}
            {c.fnsku ? ` · ${c.fnsku}` : ""}
          </div>
        </td>
        <td className="py-2.5 px-3 text-right font-mono text-white/60">{c.quantity}</td>
        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300">
          {eur(c.estimatedAmount, c.currency)}
        </td>
        <td className="py-2.5 px-3 text-right font-mono text-white/55">{c.confidence}%</td>
        <td
          className={`py-2.5 px-3 text-right font-mono text-xs ${
            urgent ? "text-amber-300" : "text-white/45"
          }`}
        >
          {c.daysLeft == null ? "—" : c.daysLeft < 0 ? "vencida" : `${c.daysLeft} d`}
        </td>
        <td className="py-2.5 px-3">
          <span
            className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[c.status]}`}
          >
            {STATUS_LABEL[c.status]}
          </span>
        </td>
        <td className="py-2.5 pl-3 text-right">
          <button
            type="button"
            onClick={onToggle}
            className="text-[11px] text-white/50 hover:text-white/90 transition-colors"
          >
            {isOpen ? "Cerrar" : "Ver caso"}
          </button>
        </td>
      </tr>
      {isOpen && (
        <tr className="border-t border-white/[0.03]">
          <td colSpan={8} className="py-3 px-3">
            <ClaimDetail claim={c} />
          </td>
        </tr>
      )}
    </>
  );
}

function ClaimDetail({ claim: c }: { claim: ClaimView }) {
  const [copied, setCopied] = useState(false);
  const closed = c.status === "RECOVERED" || c.status === "REJECTED" || c.status === "EXPIRED";

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-3">
      <p className="text-xs text-white/70">{c.reason}</p>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="eyebrow">▸ texto del caso (revísalo antes de presentarlo)</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(c.caseText).then(
                () => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                },
                () => setCopied(false),
              );
            }}
            className="btn btn-ghost btn-sm !py-0.5 !text-[11px]"
          >
            {copied ? "Copiado ✓" : "Copiar"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap rounded-md bg-black/40 p-3 text-[11px] leading-relaxed text-white/70 font-mono max-h-56 overflow-auto">
          {c.caseText}
        </pre>
      </div>

      {!closed && (
        <div className="flex flex-wrap items-center gap-2">
          {c.status === "DETECTED" && <StatusForm claimId={c.id} action="mark_ready" label="Marcar revisada" />}
          {(c.status === "DETECTED" || c.status === "READY") && (
            <StatusForm claimId={c.id} action="mark_filed" label="Marcar presentada" />
          )}
          <RecoveredForm claimId={c.id} amount={c.estimatedAmount} />
          <StatusForm claimId={c.id} action="mark_rejected" label="Rechazada" subtle />
        </div>
      )}
    </div>
  );
}

function StatusForm({
  claimId,
  action,
  label,
  subtle,
}: {
  claimId: string;
  action: string;
  label: string;
  subtle?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("claimId", claimId);
          fd.set("action", action);
          await claimStatusAction(fd);
          router.refresh();
        })
      }
      className={`btn btn-sm !text-[11px] disabled:opacity-60 ${subtle ? "btn-ghost" : "btn-primary"}`}
    >
      {label}
    </button>
  );
}

function RecoveredForm({ claimId, amount }: { claimId: string; amount: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(String(amount));
  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20 rounded-md border border-white/15 bg-black/30 px-2 py-1 text-[11px] font-mono text-white/80"
        aria-label="Importe recuperado"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const fd = new FormData();
            fd.set("claimId", claimId);
            fd.set("action", "mark_recovered");
            fd.set("recoveredAmount", value);
            await claimStatusAction(fd);
            router.refresh();
          })
        }
        className="btn btn-accent btn-sm !text-[11px] disabled:opacity-60"
      >
        Recuperada €
      </button>
    </span>
  );
}
