"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Inter } from "next/font/google";
import { AuthShell } from "@/components/auth/AuthShell";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

function VerifyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailParam = searchParams.get("email") || "";
  const codeParam = searchParams.get("code") || "";
  const emailSentParam = searchParams.get("emailSent");

  const normalizeDigits = (value: string) =>
    (value || "").replace(/[^0-9]/g, "").slice(0, 6);

  const formatDisplay = (digits: string) =>
    digits ? digits.split("").join(" ") : "";

  const [codeDigits, setCodeDigits] = useState(normalizeDigits(codeParam));
  const [email, setEmail] = useState(emailParam);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (emailSentParam === "false") {
      setInfo(
        "No pudimos enviar el correo. Usa este código manualmente o reintenta reenviarlo."
      );
    } else if (emailParam) {
      setInfo("Hemos enviado un código de verificación a tu correo.");
    }
  }, [emailParam, emailSentParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");

    try {
      setLoading(true);
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: codeDigits }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Código inválido o expirado");
        return;
      }

      setInfo("Correo verificado. Redirigiendo al dashboard...");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("No se pudo verificar. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Escribe tu correo para reenviar el código.");
      return;
    }

    setError("");
    setInfo("");

    try {
      setResendLoading(true);
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "No pudimos reenviar el correo.");
        return;
      }

      if (data.code) {
        setCodeDigits(normalizeDigits(data.code));
        setInfo(
          `SMTP/Resend no está configurado, usa este código manualmente: ${data.code}`
        );
      } else {
        setInfo("Enviamos un nuevo código. Revisa tu bandeja.");
      }
    } catch (err) {
      console.error(err);
      setError("No pudimos reenviar el correo. Intenta más tarde.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthShell accent="blue">
      <div className={`space-y-1 text-center mb-6 ${inter.className}`}>
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] flex items-center justify-center text-3xl">
            📧
          </div>
        </div>
        <p className="text-xs font-semibold text-[#2563EB] uppercase tracking-widest mb-2">
          Un paso más
        </p>
        <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
          Verifica tu correo
        </h1>
        <p className="text-sm text-[#64748B]">
          Ingresa el código de 6 dígitos que enviamos a tu email
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-4 ${inter.className}`}>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-[#0F172A]">Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 rounded-xl block bg-[#F8FAFC] text-[#0F172A] w-full border border-[#E2E8F0] placeholder-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none transition-all"
            placeholder="tu@email.com"
            required
          />
          {info && (
            <p className="text-xs text-[#166534] bg-[#DCFCE7] px-3 py-2 rounded-lg mt-1">
              {info}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-[#0F172A]">Código</label>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium disabled:opacity-60 transition-colors"
            >
              {resendLoading ? "Reenviando..." : "Reenviar código"}
            </button>
          </div>
          <input
            type="text"
            value={formatDisplay(codeDigits)}
            onChange={(e) => setCodeDigits(normalizeDigits(e.target.value))}
            className="p-3 rounded-xl block bg-[#F8FAFC] text-[#0F172A] w-full border border-[#E2E8F0] placeholder-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none transition-all tracking-[0.6em] text-center text-lg font-bold"
            placeholder="- - - - - -"
            required
            maxLength={11}
          />
        </div>

        {error && (
          <p className="text-xs text-[#EF4444] bg-[#FEF2F2] px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white font-semibold p-3 rounded-xl shadow-[0_8px_24px_-8px_rgba(37,99,235,0.5)] transition-all duration-150 disabled:opacity-50"
        >
          {loading ? "Verificando..." : "Verificar y continuar →"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
