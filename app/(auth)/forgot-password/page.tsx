"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Playfair_Display, Inter } from "next/font/google";
import { InputField } from "@/components/auth/InputField";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

function validateEmail(v: string): string {
  if (!v) return "El email es obligatorio";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Ingresa un email válido";
  if (!v.toLowerCase().endsWith(".com")) return "El correo debe terminar en .com";
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

  // Clear server error when user edits the field
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
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="text-sm text-[#64748B]">
                Te enviaremos un enlace para crear una nueva.
              </p>
            </div>

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
              <p className="text-xs text-[#92400E] field-msg">
                SMTP/Resend no configurado. Usa este enlace:{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => router.push(`/reset-password?token=${devToken}`)}
                >
                  Abrir reseteo
                </button>
              </p>
            )}

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
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>

            <div className="text-center text-sm text-[#64748B]">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-[#2563EB] hover:text-[#1D4ED8]"
              >
                Volver al login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
