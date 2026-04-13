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
      <div className={`space-y-1 text-center mb-6 ${inter.className}`}>
        <p className="text-xs font-semibold text-[#2563EB] uppercase tracking-widest mb-2">
          Recuperar acceso
        </p>
        <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
          ¿Olvidaste tu contraseña?
        </h1>
        <p className="text-sm text-[#64748B]">
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
          <p className="text-xs text-[#92400E] bg-[#FEF3C7] px-3 py-2 rounded-lg">
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
          className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white font-semibold p-3 rounded-xl shadow-[0_8px_24px_-8px_rgba(37,99,235,0.5)] transition-all duration-150 disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar enlace de recuperación"}
        </button>

        <div className="text-center text-sm text-[#64748B] pt-1">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-[#2563EB] hover:text-[#1D4ED8] font-medium transition-colors"
          >
            ← Volver al login
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
