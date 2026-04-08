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
      <div className={`space-y-1 text-center mb-6 ${inter.className}`}>
        <p className="text-xs font-semibold text-[#10B981] uppercase tracking-widest mb-2">
          Casi listo
        </p>
        <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
          Nueva contraseña
        </h1>
        <p className="text-sm text-[#64748B]">
          Usa el enlace que recibiste en tu correo. Si expiró, solicita uno nuevo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-4 ${inter.className}`}>
        {tokenError && (
          <p role="alert" aria-live="polite" className="text-xs text-[#EF4444] bg-[#FEF2F2] px-3 py-2 rounded-lg">
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
          <p className="text-xs text-[#EF4444] bg-[#FEF2F2] px-3 py-2 rounded-lg" role="alert" aria-live="polite">
            {serverError}
          </p>
        )}

        {info && (
          <p
            className="text-xs text-[#166534] bg-[#DCFCE7] px-3 py-2 rounded-lg text-center"
            role="status"
            aria-live="polite"
          >
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#10B981] hover:bg-[#059669] active:scale-[0.98] text-white font-semibold p-3 rounded-xl shadow-[0_8px_24px_-8px_rgba(16,185,129,0.5)] transition-all duration-150 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Actualizar contraseña"}
        </button>

        <div className="text-center text-sm text-[#64748B] pt-1">
          <button
            type="button"
            onClick={() => router.push("/forgot-password")}
            className="text-[#2563EB] hover:text-[#1D4ED8] font-medium transition-colors"
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
