"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateIpAllowlistAction } from "@/app/(sellers)/sellers/productos/actions";

export default function IpAllowlistPanel({
  initial,
  hasAccount,
  currentIp,
}: {
  initial: string;
  hasAccount: boolean;
  currentIp: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.set("ipAllowlist", value);
    const r = await updateIpAllowlistAction(fd);
    setBusy(false);
    if (r.ok) {
      setMsg({ ok: true, text: value.trim() ? "Allowlist guardada." : "Allowlist desactivada (sin restricción)." });
      router.refresh();
    } else {
      setMsg({ ok: false, text: r.error ?? "Error" });
    }
  }

  const box = "rounded-2xl border border-fg/10 bg-bg p-6 mt-6";
  const btn =
    "rounded-lg bg-[var(--brand-600)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[var(--brand-700)] transition-colors disabled:opacity-50";

  if (!hasAccount) {
    return (
      <section className={box}>
        <h2 className="text-lg font-bold text-fg">Allowlist de IPs (Repricer)</h2>
        <p className="text-sm text-fg-muted mt-2">
          Sólo disponible si tienes una cuenta del módulo Repricer conectada.
        </p>
      </section>
    );
  }

  return (
    <section className={box}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-fg">Allowlist de IPs (Repricer)</h2>
          <p className="text-sm text-fg-muted mt-0.5">
            Restringe el acceso al panel del repricer a IPs concretas. Útil si solo lo usas
            desde tu casa, oficina o VPN. Déjalo en blanco para no aplicar restricciones.
          </p>
        </div>
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
            value.trim()
              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-400/25"
              : "bg-amber-500/10 text-amber-300 border border-amber-400/25"
          }`}
        >
          {value.trim() ? "Activa" : "Sin restricción"}
        </span>
      </div>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder="1.2.3.4&#10;192.168.1.0/24&#10;2001:db8::/32"
        disabled={busy}
        className="mt-3 w-full rounded-lg border border-fg/15 bg-bg px-3 py-2 text-sm font-mono focus:border-[var(--brand-500)] focus:outline-none"
      />

      {currentIp && (
        <p className="mt-2 text-[11px] text-fg-muted">
          Tu IP actual:{" "}
          <code className="text-cyan-300">{currentIp}</code> — pulsa{" "}
          <button
            type="button"
            onClick={() => {
              const next = value.trim()
                ? value.trim() + "\n" + currentIp
                : currentIp;
              setValue(next);
            }}
            className="text-cyan-300 hover:underline"
          >
            + añadir a la lista
          </button>
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button onClick={submit} disabled={busy} className={btn}>
          {busy ? "Guardando…" : "Guardar allowlist"}
        </button>
        {msg && (
          <p
            className={`text-xs px-3 py-1.5 rounded-lg border ${
              msg.ok
                ? "text-emerald-300 border-emerald-400/30 bg-emerald-500/[0.06]"
                : "text-rose-300 border-rose-400/30 bg-rose-500/[0.06]"
            }`}
          >
            {msg.text}
          </p>
        )}
      </div>
      <p className="mt-3 text-[11px] text-fg-muted">
        ⚠️ Si la activas, asegúrate de tener tu IP/CIDR en la lista o perderás acceso. Soporta
        IPv4, IPv6 y notación CIDR (ej. <code>10.0.0.0/24</code>).
      </p>
    </section>
  );
}
