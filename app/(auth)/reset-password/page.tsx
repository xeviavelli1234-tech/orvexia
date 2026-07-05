"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import { InputField } from "@/components/auth/InputField";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { AuthShell } from "@/components/auth/AuthShell";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

function validatePassword(v: string): string {
  if (!v) return "La contraseña es obligatoria";
  if (v.length < 8) return "Mínimo 8 caracteres";
  if (!/[A-Z]/.test(v)) return "Debe incluir al menos una mayúscula";
  if (!/[0-9]/.test(v)) return "Debe incluir al menos un número";
  if (!/[^A-Za-z0-9]/.test(v)) return "Debe incluir al menos un carácter especial";
  return "";
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenParam = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenParam);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [confirmBlurred, setConfirmBlurred] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [info, setInfo] = useState("");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tokenParam) setToken(tokenParam);
  }, [tokenParam]);

  const tokenClientErr = !token ? "El token es obligatorio" : "";
  const passwordClientErr = validatePassword(password);
  const confirmClientErr = !confirmPassword
    ? "Confirma tu contraseña"
    : password !== confirmPassword
    ? "Las contraseñas no coinciden"
    : "";

  const tokenError = submitAttempted ? tokenClientErr || serverError : "";
  const passwordError = passwordBlurred || submitAttempted ? passwordClientErr : "";
  const confirmError = confirmBlurred || submitAttempted ? confirmClientErr : "";
  const passwordValid = passwordBlurred && !passwordClientErr && !!password;
  const confirmValid = confirmBlurred && !confirmClientErr && !!confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (tokenClientErr || passwordClientErr || confirmClientErr) return;

    setServerError("");
    setInfo("");

    try {
      setLoading(true);
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const result = await res.json();
      if (!res.ok) {
        setServerError(result.message || "No pudimos actualizar la contraseña.");
        return;
      }

      setInfo("Contraseña actualizada. Ahora puedes iniciar sesión.");
      setTimeout(() => router.push("/login"), 800);
    } catch (err) {
      console.error("Error reseteando contraseña:", err);
      setServerError("No pudimos actualizar la contraseña. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell accent="green">
      <div className={`reveal space-y-1 text-center mb-6 ${inter.className}`}>
        <div className="mb-4 flex justify-center">
          <span className="inline-flex h-6 items-center rounded-full border border-brand-400/25 bg-brand-400/10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-200">
            Recuperar acceso
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight" style={{ letterSpacing: "-0.03em", textWrap: "balance" }}>
          Nueva contraseña
        </h1>
        <p className="text-sm text-white/55">
          Usa el enlace que recibiste en tu correo. Si expiró, solicita uno nuevo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-4 ${inter.className}`}>
        {tokenError && (
          <p role="alert" aria-live="polite" className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs text-red-300">
            {tokenError}
          </p>
        )}

        <div>
          <InputField
            id="password"
            name="password"
            label="Nueva contraseña"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            onBlur={() => setPasswordBlurred(true)}
            error={passwordError}
            valid={passwordValid}
          />
          {password.length > 0 && <PasswordChecklist password={password} />}
        </div>

        <InputField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirmar contraseña"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          onBlur={() => setConfirmBlurred(true)}
          error={confirmError}
          valid={confirmValid}
        />

        {serverError && (
          <p className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs text-red-300" role="alert" aria-live="polite">
            {serverError}
          </p>
        )}

        {info && (
          <p
            className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-center text-xs text-emerald-300"
            role="status"
            aria-live="polite"
          >
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="shine-on-hover inline-flex h-12 w-full items-center justify-center rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 hover:shadow-[0_0_48px_-4px_rgba(129,140,248,0.9)] active:scale-[0.97] disabled:opacity-50"
          style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
        >
          {loading ? "Guardando..." : "Actualizar contraseña"}
        </button>

        <div className="text-center text-sm text-white/50 pt-1">
          <button
            type="button"
            onClick={() => router.push("/forgot-password")}
            className="font-semibold text-brand-300 hover:text-brand-200 transition-colors"
          >
            Solicitar un nuevo enlace
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
