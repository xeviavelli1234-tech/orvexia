"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  startTwoFactorSetup,
  confirmTwoFactor,
  disableTwoFactor,
} from "@/app/actions/twofactor";

export default function TwoFactorPanel({
  enabled,
  hasPassword,
}: {
  enabled: boolean;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [pwd, setPwd] = useState("");
  const [disabling, setDisabling] = useState(false);

  const box = "rounded-2xl border border-fg/10 bg-bg p-6";
  const btn =
    "rounded-lg bg-[var(--brand-600)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[var(--brand-700)] transition-colors disabled:opacity-50";
  const inp =
    "w-full rounded-lg border border-fg/15 bg-bg px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none";

  async function start() {
    setErr(null);
    setBusy(true);
    const r = await startTwoFactorSetup();
    setBusy(false);
    if (!r.ok) setErr(r.error);
    else setSetup({ secret: r.secret, otpauth: r.otpauth });
  }

  async function confirm() {
    setErr(null);
    setBusy(true);
    const r = await confirmTwoFactor(code);
    setBusy(false);
    if (!r.ok) setErr(r.error);
    else {
      setRecovery(r.recoveryCodes);
      setSetup(null);
      setCode("");
    }
  }

  async function disable() {
    setErr(null);
    setBusy(true);
    const r = await disableTwoFactor(pwd);
    setBusy(false);
    if (!r.ok) setErr(r.error);
    else {
      setPwd("");
      setDisabling(false);
      router.refresh();
    }
  }

  // Códigos de recuperación recién generados (mostrar una sola vez)
  if (recovery) {
    return (
      <div className={box}>
        <div className="text-sm font-bold text-emerald-600">
          ✓ Verificación en dos pasos activada
        </div>
        <p className="mt-2 text-sm text-fg/70">
          Guarda estos <strong>códigos de recuperación</strong> en un lugar
          seguro. Cada uno sirve una sola vez si pierdes el acceso a tu app.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
          {recovery.map((c) => (
            <div
              key={c}
              className="rounded border border-fg/10 bg-fg/[0.03] px-3 py-1.5 text-center"
            >
              {c}
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(recovery.join("\n"));
          }}
          className="mt-3 text-xs font-semibold text-[var(--brand-600)] hover:underline"
        >
          Copiar códigos
        </button>
        <div className="mt-4">
          <button
            className={btn}
            onClick={() => {
              setRecovery(null);
              router.refresh();
            }}
          >
            Listo, los he guardado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={box}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-bold">
            Verificación en dos pasos (2FA)
          </div>
          <p className="mt-1 text-xs text-fg/55">
            Añade una capa extra: un código de tu app de autenticación al
            iniciar sesión.
          </p>
        </div>
        <span
          className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
            enabled
              ? "bg-emerald-100 text-emerald-700"
              : "bg-fg/[0.06] text-fg/55"
          }`}
        >
          {enabled ? "Activado" : "Desactivado"}
        </span>
      </div>

      {err && (
        <p className="mt-3 text-xs text-red-600 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          {err}
        </p>
      )}

      {/* DESACTIVADO → flujo de activación */}
      {!enabled && !setup && (
        <button onClick={start} disabled={busy} className={`${btn} mt-4`}>
          {busy ? "Generando…" : "Activar 2FA"}
        </button>
      )}

      {!enabled && setup && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-fg/70">
            1) En tu app (Google Authenticator, Authy, 1Password…) añade una
            cuenta nueva con esta clave:
          </p>
          <div className="rounded-lg border border-fg/10 bg-fg/[0.03] px-3 py-2 font-mono text-sm break-all select-all">
            {setup.secret}
          </div>
          <a
            href={setup.otpauth}
            className="text-xs font-semibold text-[var(--brand-600)] hover:underline"
          >
            Abrir en la app (otpauth)
          </a>
          <p className="text-sm text-fg/70">
            2) Escribe el código de 6 dígitos que muestra la app:
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            placeholder="123456"
            className={`${inp} max-w-[160px] text-center tracking-[0.3em] font-mono`}
          />
          <div className="flex gap-2">
            <button onClick={confirm} disabled={busy} className={btn}>
              {busy ? "Verificando…" : "Confirmar y activar"}
            </button>
            <button
              onClick={() => {
                setSetup(null);
                setCode("");
                setErr(null);
              }}
              className="text-sm text-fg/55 hover:text-fg"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ACTIVADO → desactivar */}
      {enabled && !disabling && (
        <button
          onClick={() => setDisabling(true)}
          className="mt-4 rounded-lg border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
        >
          Desactivar 2FA
        </button>
      )}

      {enabled && disabling && (
        <div className="mt-4 space-y-3">
          {hasPassword ? (
            <>
              <p className="text-sm text-fg/70">
                Confirma tu contraseña para desactivar el 2FA:
              </p>
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Tu contraseña"
                className={`${inp} max-w-[260px]`}
              />
              <div className="flex gap-2">
                <button
                  onClick={disable}
                  disabled={busy}
                  className="rounded-lg bg-red-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {busy ? "Desactivando…" : "Desactivar 2FA"}
                </button>
                <button
                  onClick={() => {
                    setDisabling(false);
                    setPwd("");
                    setErr(null);
                  }}
                  className="text-sm text-fg/55 hover:text-fg"
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-fg/70">
              Tu cuenta no tiene contraseña (acceso con Google). No se puede
              gestionar el 2FA por contraseña.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
