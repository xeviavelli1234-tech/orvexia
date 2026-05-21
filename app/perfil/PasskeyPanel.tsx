"use client";

import { useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";

interface PasskeyRow {
  id: string;
  name: string;
  deviceType: string;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export default function PasskeyPanel({ initial }: { initial: PasskeyRow[] }) {
  const [items, setItems] = useState<PasskeyRow[]>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupported(typeof window.PublicKeyCredential === "function");
  }, []);

  async function add() {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const optionsRes = await fetch("/api/auth/passkey/register/options", { method: "POST" });
      if (!optionsRes.ok) throw new Error("No se pudieron obtener las opciones de registro.");
      const options = await optionsRes.json();
      const response = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          response,
          expectedChallenge: options.challenge,
          name: name.trim() || undefined,
        }),
      });
      if (!verifyRes.ok) {
        const j = await verifyRes.json().catch(() => ({}));
        throw new Error(j.error ?? `Error ${verifyRes.status}`);
      }
      setOk("Passkey añadida. Ya puedes iniciar sesión con ella.");
      setName("");
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/cancel|abort/i.test(msg)) {
        setErr("Has cancelado el registro.");
      } else {
        setErr(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    try {
      const r = await fetch("/api/auth/passkey/list", { cache: "no-store" });
      if (r.ok) {
        const j = (await r.json()) as { passkeys: PasskeyRow[] };
        setItems(j.passkeys);
      }
    } catch {
      /* ignore */
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Quitar esta passkey? No podrás usarla para iniciar sesión.")) return;
    setBusy(true);
    try {
      const r = await fetch("/api/auth/passkey/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error("No se pudo eliminar.");
      setOk("Passkey eliminada.");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const box = "rounded-2xl border border-fg/10 bg-bg p-6";
  const btn =
    "rounded-lg bg-[var(--brand-600)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[var(--brand-700)] transition-colors disabled:opacity-50";
  const inp =
    "w-full rounded-lg border border-fg/15 bg-bg px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none";

  return (
    <section className={`${box} mt-6`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h2 className="text-lg font-bold text-fg">Passkeys (WebAuthn)</h2>
          <p className="text-sm text-fg-muted mt-0.5">
            Inicia sesión sin contraseña con tu huella, Face ID, Windows Hello o una
            llave de seguridad. Más seguras que las contraseñas y resistentes a phishing.
          </p>
        </div>
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
            items.length > 0
              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-400/25"
              : "bg-amber-500/10 text-amber-300 border border-amber-400/25"
          }`}
        >
          {items.length > 0 ? `${items.length} activa${items.length === 1 ? "" : "s"}` : "Ninguna"}
        </span>
      </div>

      {!supported && (
        <p className="mt-3 text-xs text-amber-300 border border-amber-400/25 bg-amber-500/[0.06] rounded-lg px-3 py-2">
          Tu navegador no soporta passkeys. Prueba con Chrome, Edge, Safari o Firefox actualizados.
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-4 divide-y divide-fg/10">
          {items.map((p) => (
            <li key={p.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-fg">{p.name}</div>
                <div className="text-[11px] text-fg-muted">
                  {p.deviceType === "multiDevice" ? "Sincronizada" : "Solo este dispositivo"}
                  {p.backedUp ? " · respaldada" : ""}
                  {p.lastUsedAt
                    ? ` · usada ${new Date(p.lastUsedAt).toLocaleDateString("es-ES")}`
                    : " · sin usar todavía"}
                </div>
              </div>
              <button
                onClick={() => remove(p.id)}
                disabled={busy}
                className="text-xs text-rose-300 hover:underline disabled:opacity-40"
              >
                quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la passkey (ej. iPhone 16)"
          className={inp}
          disabled={busy || !supported}
        />
        <button onClick={add} disabled={busy || !supported} className={btn}>
          {busy ? "…" : "+ Añadir passkey"}
        </button>
      </div>

      {err && (
        <p className="mt-2 text-xs text-rose-300 rounded-lg border border-rose-400/30 bg-rose-500/[0.06] px-3 py-1.5">
          {err}
        </p>
      )}
      {ok && (
        <p className="mt-2 text-xs text-emerald-300 rounded-lg border border-emerald-400/30 bg-emerald-500/[0.06] px-3 py-1.5">
          {ok}
        </p>
      )}
    </section>
  );
}
