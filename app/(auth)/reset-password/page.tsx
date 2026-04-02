"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Playfair_Display, Inter } from "next/font/google";
import { InputField } from "@/components/auth/InputField";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

function validatePassword(v: string): string {
  if (!v) return "La contraseña es obligatoria";
  if (v.length < 8) return "Mínimo 8 caracteres";
  if (!/[A-Z]/.test(v)) return "Debe incluir al menos una mayúscula";
  if (!/[0-9]/.test(v)) return "Debe incluir al menos un número";
  if (!/[^A-Za-z0-9]/.test(v)) return "Debe incluir al menos un carácter especial";
  return "";
}

export default function ResetPasswordPage() {
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

  // Client-side validation
  const tokenClientErr = !token ? "El token es obligatorio" : "";
  const passwordClientErr = validatePassword(password);
  const confirmClientErr = !confirmPassword
    ? "Confirma tu contraseña"
    : password !== confirmPassword
    ? "Las contraseñas no coinciden"
    : "";

  // Show errors when touched or form submitted
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
    <div
      className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-14 relative overflow-hidden"
      style={{
        backgroundImage:
          'linear-gradient(0deg, rgba(37,99,235,0.22), rgba(37,99,235,0.22)), url("/appliances-bg.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#E5F0FF",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.22),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(37,99,235,0.2),transparent_38%)]" />

      <div className="relative w-full max-w-[640px] px-4">
        <div className="relative overflow-visible rounded-[16px] border border-[#E2E8F0]/70 bg-white/70 backdrop-blur-2xl shadow-[0_16px_56px_-24px_rgba(15,23,42,0.32)]">
          <form
            onSubmit={handleSubmit}
            className={`relative w-full px-12 py-12 space-y-4 md:px-14 ${inter.className}`}
          >
            <div className="space-y-1 text-center">
              <h1 className={`${playfair.className} text-3xl text-[#0F172A]`}>
                Crea una nueva contraseña
              </h1>
              <p className="text-sm text-[#64748B]">
                Usa el enlace que recibiste en tu correo. Si expiró, solicita uno nuevo.
              </p>
            </div>

            {tokenError && (
              <p role="alert" aria-live="polite" className="text-xs text-[#EF4444] field-msg">
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

            {info && (
              <p
                className="text-xs text-[#22C55E] text-center field-msg"
                role="status"
                aria-live="polite"
              >
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563EB] text-white p-3 rounded-[10px] shadow-[0_16px_30px_-14px_rgba(37,99,235,0.45)] hover:bg-[#1D4ED8] hover:translate-y-[-1px] hover:shadow-[0_18px_34px_-14px_rgba(37,99,235,0.55)] transition disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Actualizar contraseña"}
            </button>

            <div className="text-center text-sm text-[#64748B]">
              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="text-[#2563EB] hover:text-[#1D4ED8]"
              >
                Solicitar un nuevo enlace
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
