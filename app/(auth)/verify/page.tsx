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
          className="tabular w-11 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none"
          style={{
            borderColor: d ? "rgba(129,140,248,0.6)" : "rgba(255,255,255,0.14)",
            background: d ? "rgba(129,140,248,0.10)" : "rgba(255,255,255,0.03)",
            color: "#EEF2FF",
            boxShadow: d ? "0 0 14px -4px rgba(129,140,248,0.5)" : "none",
            caretColor: "#A5B4FC",
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
        <div className="reveal text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
               style={{
                 background: "rgba(129,140,248,0.10)",
                 border: "1px solid rgba(129,140,248,0.35)",
                 boxShadow: "0 0 24px -6px rgba(129,140,248,0.5)",
               }}>
            📧
          </div>
          <div className="mb-3 flex justify-center">
            <span className="inline-flex h-6 items-center rounded-full border border-brand-400/25 bg-brand-400/10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-200">
              Un último paso
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2" style={{ letterSpacing: "-0.03em", textWrap: "balance" }}>
            Verifica tu correo
          </h1>
          <p className="text-sm text-white/55">
            Ingresa el código de 6 dígitos que enviamos a tu email
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Correo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-3 rounded-xl block w-full border border-white/10 bg-white/[0.03] text-white placeholder-white/25 focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/20 focus:outline-none transition-all text-sm"
              placeholder="tu@email.com"
              required
            />
            {info && (
              <p
                className={`mt-1.5 rounded-lg border px-3 py-2 text-xs ${
                  info.startsWith("✓")
                    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                    : "border-brand-400/25 bg-brand-400/10 text-brand-200"
                }`}
              >
                {info}
              </p>
            )}
          </div>

          {/* OTP */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-white/70">
                Código de verificación
              </label>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || resendCountdown > 0}
                className="text-xs font-semibold text-brand-300 hover:text-brand-200 disabled:opacity-50 transition-colors"
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
            <p className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-center text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !isComplete}
            className="shine-on-hover inline-flex h-12 w-full items-center justify-center rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 hover:shadow-[0_0_48px_-4px_rgba(129,140,248,0.9)] active:scale-[0.97] disabled:opacity-50"
            style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
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
