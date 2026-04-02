"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Playfair_Display, Inter } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailParam = searchParams.get("email") || "";
  const codeParam = searchParams.get("code") || "";
  const emailSentParam = searchParams.get("emailSent");

  const normalizeDigits = (value: string) =>
    (value || "").replace(/[^0-9]/g, "").slice(0, 6);

  const formatDisplay = (digits: string) =>
    digits ? digits.split("").join(" ") : "";

  const [codeDigits, setCodeDigits] = useState(normalizeDigits(""));
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
                Verifica tu correo
              </h1>
              <p className="text-sm text-[#64748B]">
                Ingresa el código que enviamos a tu email
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[#0F172A] mb-1 block text-sm">Correo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-3 rounded-[10px] block bg-[#F8FAFC] text-[#0F172A] w-full border border-[#E2E8F0] placeholder-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB33] focus:outline-none transition"
                placeholder="Correo"
                required
              />
              {info && <p className="text-xs text-[#16A34A]">{info}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="text-[#0F172A] mb-1 block text-sm">Código</label>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="text-xs text-[#2563EB] hover:text-[#1D4ED8] disabled:opacity-60"
              >
                {resendLoading ? "Reenviando..." : "Reenviar código"}
              </button>
            </div>
            <input
              type="text"
              value={formatDisplay(codeDigits)}
              onChange={(e) => setCodeDigits(normalizeDigits(e.target.value))}
              className="p-3 rounded-[10px] block bg-[#F8FAFC] text-[#0F172A] w-full border border-[#E2E8F0] placeholder-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB33] focus:outline-none transition tracking-[0.6em]"
              placeholder="- - - - - -"
              required
              maxLength={11} // cuenta los espacios cuando se muestren
            />
            {error && <p className="text-xs text-[#DC2626]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563EB] text-white p-3 rounded-[10px] shadow-[0_16px_30px_-14px_rgba(37,99,235,0.45)] hover:bg-[#1D4ED8] hover:translate-y-[-1px] hover:shadow-[0_18px_34px_-14px_rgba(37,99,235,0.55)] transition disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Verificar y continuar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
