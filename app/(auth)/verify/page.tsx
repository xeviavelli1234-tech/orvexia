"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import { Inter } from "next/font/google";
import { AuthShell } from "@/components/auth/AuthShell";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

const NUM_DIGITS = 6;

function OtpInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: NUM_DIGITS }, (_, i) => value[i] ?? "");

  function focus(i: number) {
    refs.current[i]?.focus();
  }

  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[i] = digit;
    const joined = next.join("").slice(0, NUM_DIGITS);
    onChange(joined);
    if (digit && i < NUM_DIGITS - 1) focus(i + 1);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[i]) {
        const next = [...digits];
        next[i] = "";
        onChange(next.join(""));
      } else if (i > 0) {
        const next = [...digits];
        next[i - 1] = "";
        onChange(next.join(""));
        focus(i - 1);
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      focus(i - 1);
    } else if (e.key === "ArrowRight" && i < NUM_DIGITS - 1) {
      focus(i + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, NUM_DIGITS);
    onChange(pasted.padEnd(NUM_DIGITS, "").slice(0, NUM_DIGITS));
    focus(Math.min(pasted.length, NUM_DIGITS - 1));
  }

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          placeholder="-"
          className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none"
          style={{
            borderColor: d ? "#2563EB" : "#94A3B8",
            background: d ? "#EFF6FF" : "#fff",
            color: "#0F172A",
            boxShadow: d ? "0 0 0 3px rgba(37,99,235,0.12)" : "none",
            caretColor: "#2563EB",
          }}
        />
      ))}
    </div>
  );
}

function VerifyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailParam = searchParams.get("email") || "";
  const codeParam = searchParams.get("code") || "";
  const emailSentParam = searchParams.get("emailSent");

  const [codeDigits, setCodeDigits] = useState(codeParam.replace(/[^0-9]/g, "").slice(0, 6));
  const [email, setEmail] = useState(emailParam);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (emailSentParam === "false") {
      setInfo("No pudimos enviar el correo automáticamente. Usa el código de la URL o reenvíalo.");
    } else if (emailParam) {
      setInfo(`Código enviado a ${emailParam}`);
    }
  }, [emailParam, emailSentParam]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeDigits.replace(/[^0-9]/g, "").length < NUM_DIGITS) {
      setError("Ingresa los 6 dígitos del código.");
      return;
    }
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

      setInfo("✓ Correo verificado. Redirigiendo...");
      router.replace("/dashboard");
      router.refresh();
    } catch {
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
        setCodeDigits(data.code.slice(0, 6));
        setInfo("SMTP no configurado. Código rellenado automáticamente.");
      } else {
        setInfo("Código reenviado. Revisa tu bandeja de entrada.");
        setResendCountdown(60);
      }
    } catch {
      setError("No pudimos reenviar el correo. Intenta más tarde.");
    } finally {
      setResendLoading(false);
    }
  };

  const isComplete = codeDigits.replace(/[^0-9]/g, "").length === NUM_DIGITS;

  return (
    <AuthShell accent="blue">
      <div className={`${inter.className}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] flex items-center justify-center text-3xl mx-auto mb-4">
            📧
          </div>
          <p className="text-xs font-bold text-[#2563EB] uppercase tracking-widest mb-2">
            Un paso más
          </p>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight mb-2">
            Verifica tu correo
          </h1>
          <p className="text-sm text-[#64748B]">
            Ingresa el código de 6 dígitos que enviamos a tu email
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
              Correo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-3 rounded-xl block bg-[#F8FAFC] text-[#0F172A] w-full border border-[#E2E8F0] placeholder-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none transition-all text-sm"
              placeholder="tu@email.com"
              required
            />
            {info && (
              <p
                className="text-xs mt-1.5 px-3 py-2 rounded-lg"
                style={{
                  color: info.startsWith("✓") ? "#166534" : "#1e40af",
                  background: info.startsWith("✓") ? "#DCFCE7" : "#EFF6FF",
                }}
              >
                {info}
              </p>
            )}
          </div>

          {/* OTP */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-[#0F172A]">
                Código de verificación
              </label>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || resendCountdown > 0}
                className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] disabled:opacity-50 transition-colors"
              >
                {resendLoading
                  ? "Enviando..."
                  : resendCountdown > 0
                  ? `Reenviar en ${resendCountdown}s`
                  : "Reenviar código"}
              </button>
            </div>
            <OtpInput value={codeDigits} onChange={setCodeDigits} />
          </div>

          {error && (
            <p className="text-xs text-[#EF4444] bg-[#FEF2F2] px-3 py-2 rounded-lg text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !isComplete}
            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white font-semibold p-3 rounded-xl shadow-[0_8px_24px_-8px_rgba(37,99,235,0.5)] transition-all duration-150 disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Verificar y continuar →"}
          </button>
        </form>
      </div>
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
