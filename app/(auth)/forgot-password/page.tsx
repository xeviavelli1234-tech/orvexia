"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import { InputField } from "@/components/auth/InputField";
import { AuthShell } from "@/components/auth/AuthShell";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

function validateEmail(v: string): string {
  if (!v) return "El email es obligatorio";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Ingresa un email válido";
  return "";
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [info, setInfo] = useState("");
  const [serverError, setServerError] = useState("");
  const [devToken, setDevToken] = useState("");
  const [loading, setLoading] = useState(false);

  const emailClientErr = validateEmail(email);

  const handleEmailChange = (v: string) => {
    setEmail(v);
    if (serverError) setServerError("");
  };

  const emailError = emailBlurred || submitAttempted ? emailClientErr || serverError : "";
  const emailValid = emailBlurred && !emailClientErr && !serverError && !!email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (emailClientErr) return;

    setInfo("");
    setServerError("");
    setDevToken("");

    try {
      setLoading(true);
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        setServerError(result?.message || "No pudimos procesar la solicitud.");
        return;
      }

      setInfo(
        result?.message ||
          "Si el correo está registrado, enviamos instrucciones para restablecer tu contraseña."
      );

      if (result?.token) {
        setDevToken(result.token as string);
      }
    } catch (err) {
      console.error("Error solicitando reseteo:", err);
      setServerError("No pudimos procesar la solicitud. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell accent="blue">
      <div className={`reveal space-y-1 text-center mb-6 ${inter.className}`}>
        <div className="mb-4 flex justify-center">
          <span className="inline-flex h-6 items-center rounded-full border border-brand-400/25 bg-brand-400/10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-200">
            Recuperar acceso
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight" style={{ letterSpacing: "-0.03em", textWrap: "balance" }}>
          ¿Olvidaste tu contraseña?
        </h1>
        <p className="text-sm text-white/55">
          Te enviaremos un enlace para crear una nueva.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-4 ${inter.className}`}>
        <InputField
          id="email"
          name="email"
          label="Correo"
          type="email"
          placeholder="tu@email.com"
          autoComplete="email"
          value={email}
          onChange={handleEmailChange}
          onBlur={() => setEmailBlurred(true)}
          error={emailError}
          valid={emailValid}
        />

        {devToken && (
          <p className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            SMTP/Resend no configurado. Usa este enlace:{" "}
            <button
              type="button"
              className="underline font-semibold"
              onClick={() => router.push(`/reset-password?token=${devToken}`)}
            >
              Abrir reseteo
            </button>
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
          {loading ? "Enviando..." : "Enviar enlace de recuperación"}
        </button>

        <div className="text-center text-sm text-white/50 pt-1">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="font-semibold text-brand-300 hover:text-brand-200 transition-colors"
          >
            ← Volver al login
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
