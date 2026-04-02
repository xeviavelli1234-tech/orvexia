"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction, type ActionResult } from "@/app/actions/auth";
import { GoogleButton } from "./GoogleButton";
import { InputField } from "./InputField";
import { Playfair_Display, Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

// --- Validation ---

function validateEmail(v: string): string {
  if (!v) return "El email es obligatorio";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Ingresa un email válido";
  if (!v.toLowerCase().endsWith(".com")) return "El correo debe terminar en .com";
  return "";
}

function validatePassword(v: string): string {
  if (!v) return "La contraseña es obligatoria";
  return "";
}

// --- Submit button ---

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-[#F97316] text-white p-3 rounded-[10px] shadow-[0_16px_30px_-14px_rgba(249,115,22,0.55)] hover:bg-[#EA580C] hover:translate-y-[-1px] hover:shadow-[0_18px_34px_-14px_rgba(249,115,22,0.65)] transition disabled:opacity-50"
    >
      {pending ? "Iniciando sesión..." : "Login"}
    </button>
  );
}

// --- OAuth error messages ---

const oauthMessages: Record<string, string> = {
  oauth: "Ocurrió un error con Google. Inténtalo de nuevo.",
  unverified: "Tu cuenta de Google no tiene el email verificado.",
};

// --- Component ---

export function LoginForm({ oauthError }: { oauthError?: string }) {
  const [state, action] = useActionState<ActionResult, FormData>(
    loginAction,
    null
  );

  // Field values
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Track when fields have been interacted with
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Remember what was submitted so server errors clear when user edits
  const [submitted, setSubmitted] = useState({ email: "", password: "" });

  // Resend verification
  const [info, setInfo] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  // --- Client-side validation ---
  const emailClientErr = validateEmail(email);
  const passwordClientErr = validatePassword(password);

  // Server errors only relevant if values match what was submitted
  const serverEmailErr =
    email === submitted.email ? (state?.errors?.email?.[0] ?? "") : "";
  const serverPasswordErr =
    password === submitted.password
      ? (state?.errors?.password?.[0] ?? state?.message ?? "")
      : "";

  // Show errors when the field has been touched or form submitted
  const emailError =
    emailBlurred || submitAttempted
      ? emailClientErr || serverEmailErr
      : "";
  const passwordError =
    passwordBlurred || submitAttempted
      ? passwordClientErr || serverPasswordErr
      : "";

  // Green icon: show after blur when valid, and only if no server error either
  const emailValid =
    emailBlurred && !emailClientErr && !serverEmailErr && !!email;
  const passwordValid =
    passwordBlurred && !passwordClientErr && !serverPasswordErr && !!password;

  const errorMsg = oauthError ? oauthMessages[oauthError] : null;
  const needsVerification = state?.requiresVerification;

  // --- Resend handler ---
  const handleResend = async () => {
    if (!email) {
      setInfo("Escribe tu correo para reenviar el código.");
      return;
    }
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
        setInfo(data.message || "No pudimos reenviar el correo.");
        return;
      }
      if (data.code) {
        setInfo(`SMTP/Resend no está configurado. Usa este código: ${data.code}`);
      } else {
        setInfo("Enviamos un nuevo código. Revisa tu bandeja.");
      }
    } catch (err) {
      console.error("Error reenviando verificación:", err);
      setInfo("No pudimos reenviar el correo. Intenta más tarde.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className={`space-y-4 ${inter.className}`}>
      <GoogleButton label="Continuar con Google" />

      {errorMsg && (
        <p
          role="alert"
          aria-live="polite"
          className="text-xs text-[#EF4444] text-center field-msg"
        >
          {errorMsg}
        </p>
      )}

      <div className="text-center text-[#94A3B8] text-[11px] tracking-[0.18em] uppercase">
        o ingresa con email
      </div>

      <form
        action={action}
        onSubmit={(e) => {
          setSubmitAttempted(true);
          setSubmitted({ email, password });
          if (emailClientErr || passwordClientErr) {
            e.preventDefault();
          }
        }}
        className="space-y-4"
      >
        {info && (
          <p className="text-xs text-[#64748B] text-center field-msg">{info}</p>
        )}

        <InputField
          id="email"
          name="email"
          label="Email"
          type="email"
          placeholder="Correo"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          onBlur={() => setEmailBlurred(true)}
          error={emailError}
          valid={emailValid}
        />

        <InputField
          id="password"
          name="password"
          label="Contraseña"
          type="password"
          placeholder="Contraseña"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          onBlur={() => setPasswordBlurred(true)}
          error={passwordError}
          valid={passwordValid}
        />

        {needsVerification && (
          <div className="space-y-1">
            <p
              role="alert"
              aria-live="polite"
              className="text-xs text-[#EF4444] field-msg"
            >
              Debes verificar tu correo antes de ingresar.
            </p>
            <div className="flex items-center justify-between text-xs text-[#334155]">
              <span>¿No recibiste el correo?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="text-[#2563EB] hover:text-[#1D4ED8] transition-colors disabled:opacity-60"
              >
                {resendLoading ? "Reenviando..." : "Reenviar verificación"}
              </button>
            </div>
          </div>
        )}

        <SubmitButton />
      </form>

      <p className={`text-center text-sm text-[#64748B] ${playfair.className}`}>
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="font-medium text-[#2563EB] hover:underline">
          Regístrate
        </Link>
      </p>
      <p className="text-center text-xs text-[#64748B]">
        <Link href="/forgot-password" className="text-[#2563EB] hover:text-[#1D4ED8]">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </div>
  );
}
