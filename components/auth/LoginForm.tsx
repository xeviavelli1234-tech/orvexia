"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  loginAction,
  verifyTwoFactorAction,
  type ActionResult,
} from "@/app/actions/auth";
import { GoogleButton } from "./GoogleButton";
import PasswordlessButtons from "./PasswordlessButtons";
import { InputField } from "./InputField";
import { Playfair_Display, Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

// --- Validation ---

function validateEmail(v: string): string {
  if (!v) return "El email es obligatorio";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Ingresa un email válido";
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
    <span className="aura-cta block rounded-xl">
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold h-11 rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none"
      >
        {pending ? "Iniciando sesión…" : "Iniciar sesión"}
      </button>
    </span>
  );
}

// --- OAuth error messages ---

const oauthMessages: Record<string, string> = {
  oauth: "Ocurrió un error con Google. Inténtalo de nuevo.",
  unverified: "Tu cuenta de Google no tiene el email verificado.",
};

// --- Component ---

export function LoginForm({ oauthError, next }: { oauthError?: string; next?: string }) {
  const [state, action] = useActionState<ActionResult, FormData>(
    loginAction,
    null
  );
  const [tfaState, tfaAction] = useActionState<ActionResult, FormData>(
    verifyTwoFactorAction,
    null
  );
  const requires2fa = !!state?.requires2fa || !!tfaState?.requires2fa;
  const tfaMsg = tfaState?.message ?? state?.message;

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

  if (requires2fa) {
    return (
      <div className={`space-y-4 ${inter.className}`}>
        <div className="text-center">
          <div className="text-lg font-bold">Verificación en dos pasos</div>
          <p className="mt-1 text-xs text-fg-muted">
            Introduce el código de 6 dígitos de tu app de autenticación (o un
            código de recuperación).
          </p>
        </div>
        <form action={tfaAction} className="space-y-3">
          <input
            name="code"
            inputMode="text"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            className="w-full h-11 rounded-xl border border-fg/15 bg-bg px-4 text-center tracking-[0.3em] font-mono text-lg focus:border-brand-600 focus:outline-none"
          />
          {tfaMsg && (
            <p
              role="alert"
              className="text-xs text-danger-500 text-center field-msg"
            >
              {tfaMsg}
            </p>
          )}
          <span className="aura-cta block rounded-xl">
            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold h-11 rounded-xl transition-all"
            >
              Verificar y entrar
            </button>
          </span>
        </form>
        <a
          href="/login"
          className="block text-center text-xs text-fg-muted hover:text-fg"
        >
          ← Cancelar
        </a>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${inter.className}`}>
      <GoogleButton label="Continuar con Google" />
      <PasswordlessButtons />

      {errorMsg && (
        <p
          role="alert"
          aria-live="polite"
          className="text-xs text-danger-500 text-center field-msg"
        >
          {errorMsg}
        </p>
      )}

      <div className="text-center text-fg-subtle text-[11px] tracking-[0.18em] uppercase">
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
        {next && <input type="hidden" name="next" value={next} />}
        {info && (
          <p className="text-xs text-fg-muted text-center field-msg">{info}</p>
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

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            name="rememberMe"
            className="h-4 w-4 rounded border-border-strong accent-brand-600"
          />
          <span className="text-sm text-fg-muted">Recuérdame</span>
        </label>

        {needsVerification && (
          <div className="space-y-1">
            <p
              role="alert"
              aria-live="polite"
              className="text-xs text-danger-500 field-msg"
            >
              Debes verificar tu correo antes de ingresar.
            </p>
            <div className="flex items-center justify-between text-xs text-fg">
              <span>¿No recibiste el correo?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="text-brand-600 hover:text-brand-700 transition-colors disabled:opacity-60"
              >
                {resendLoading ? "Reenviando..." : "Reenviar verificación"}
              </button>
            </div>
          </div>
        )}

        <SubmitButton />
      </form>

      <p className={`text-center text-sm text-fg-muted ${playfair.className}`}>
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="font-medium text-brand-600 hover:underline">
          Regístrate
        </Link>
      </p>
      <p className="text-center text-xs text-fg-muted">
        <Link href="/forgot-password" className="text-brand-600 hover:text-brand-700">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </div>
  );
}
