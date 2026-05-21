"use client";

import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";

export default function PasswordlessButtons() {
  const [busy, setBusy] = useState<"passkey" | "magic" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");

  async function loginWithPasskey() {
    setErr(null);
    setBusy("passkey");
    try {
      const optionsRes = await fetch("/api/auth/passkey/login/options", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!optionsRes.ok) throw new Error("No se pudo iniciar passkey.");
      const options = await optionsRes.json();
      const response = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetch("/api/auth/passkey/login/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          response,
          expectedChallenge: options.challenge,
          rememberMe: true,
        }),
      });
      if (!verifyRes.ok) {
        const j = await verifyRes.json().catch(() => ({}));
        throw new Error(j.error ?? `Error ${verifyRes.status}`);
      }
      window.location.href = "/dashboard";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/cancel|abort/i.test(msg)) {
        setErr("Has cancelado.");
      } else {
        setErr(msg.length > 90 ? msg.slice(0, 90) + "…" : msg);
      }
    } finally {
      setBusy(null);
    }
  }

  async function sendMagic(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy("magic");
    try {
      const r = await fetch("/api/auth/magic/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: magicEmail.trim() }),
      });
      if (!r.ok) throw new Error("No se pudo enviar el correo.");
      setMagicSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={loginWithPasskey}
        disabled={busy !== null}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-fg/15 bg-fg/[0.03] py-2.5 text-sm font-semibold hover:bg-fg/[0.06] transition-colors disabled:opacity-50"
      >
        <span aria-hidden>🔑</span>
        {busy === "passkey" ? "Comprobando…" : "Entrar con passkey"}
      </button>

      {!magicSent ? (
        <form onSubmit={sendMagic} className="grid grid-cols-[1fr_auto] gap-2">
          <input
            type="email"
            required
            value={magicEmail}
            onChange={(e) => setMagicEmail(e.target.value)}
            placeholder="Tu email"
            className="rounded-lg border border-fg/15 bg-bg px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none"
            disabled={busy !== null}
          />
          <button
            type="submit"
            disabled={busy !== null}
            className="rounded-lg border border-fg/15 bg-fg/[0.03] px-3 py-2 text-sm font-semibold hover:bg-fg/[0.06] transition-colors disabled:opacity-50"
          >
            {busy === "magic" ? "…" : "✉ Enlace mágico"}
          </button>
        </form>
      ) : (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-300">
          Si tu email está registrado, recibirás un enlace para entrar sin contraseña. Caduca en
          10 minutos.
        </p>
      )}

      {err && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/[0.06] px-3 py-1.5 text-xs text-rose-300">
          {err}
        </p>
      )}
    </div>
  );
}
