"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBillingProfileAction } from "./actions";

export interface BillingProfile {
  billingName: string;
  billingTaxId: string;
  billingAddress: string;
  billingCountry: string;
}

export default function BillingProfileForm({
  initial,
}: {
  initial: BillingProfile;
}) {
  const router = useRouter();
  const [v, setV] = useState<BillingProfile>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.set("billingName", v.billingName);
    fd.set("billingTaxId", v.billingTaxId);
    fd.set("billingAddress", v.billingAddress);
    fd.set("billingCountry", v.billingCountry);
    updateBillingProfileAction(fd).then((r) => {
      setBusy(false);
      if (!r.ok) setMsg("Error: " + r.error);
      else {
        setMsg("Datos guardados.");
        router.refresh();
      }
    });
  }

  const inp =
    "mt-1 w-full rounded-lg border border-fg/15 bg-bg px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none";
  const lbl = "text-[11px] uppercase tracking-wider text-fg/50";

  return (
    <div className="mt-6 rounded-2xl border border-fg/10 bg-bg p-6">
      <div className="text-sm font-bold">Datos de facturación</div>
      <p className="mt-1 text-xs text-fg/55">
        Aparecen como destinatario en tu factura con IVA. Necesarios para que
        sea válida.
      </p>
      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        <label className="block sm:col-span-2">
          <span className={lbl}>Razón social / Nombre fiscal</span>
          <input
            value={v.billingName}
            onChange={(e) => setV({ ...v, billingName: e.target.value })}
            placeholder="Mi Empresa S.L. / Nombre Apellidos"
            className={inp}
          />
        </label>
        <label className="block">
          <span className={lbl}>NIF / CIF / VAT</span>
          <input
            value={v.billingTaxId}
            onChange={(e) => setV({ ...v, billingTaxId: e.target.value })}
            placeholder="B12345678"
            className={inp}
          />
        </label>
        <label className="block">
          <span className={lbl}>País</span>
          <input
            value={v.billingCountry}
            onChange={(e) => setV({ ...v, billingCountry: e.target.value })}
            placeholder="ES"
            maxLength={4}
            className={inp}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={lbl}>Dirección fiscal</span>
          <input
            value={v.billingAddress}
            onChange={(e) => setV({ ...v, billingAddress: e.target.value })}
            placeholder="Calle, nº, CP, ciudad"
            className={inp}
          />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-[var(--brand-600)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[var(--brand-700)] transition-colors disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Guardar datos de facturación"}
        </button>
        {msg && (
          <span
            className={`text-xs ${
              msg.startsWith("Error") ? "text-red-600" : "text-emerald-600"
            }`}
          >
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
