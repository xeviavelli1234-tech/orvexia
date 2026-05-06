"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { registerAction, type ActionResult } from "@/app/actions/auth";
import { GoogleButton } from "./GoogleButton";
import { InputField } from "./InputField";
import { PasswordChecklist } from "./PasswordChecklist";
import { Inter, Playfair_Display } from "next/font/google";

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
  if (v.length < 8) return "Mínimo 8 caracteres";
  if (!/[A-Z]/.test(v)) return "Debe incluir al menos una mayúscula";
  if (!/[0-9]/.test(v)) return "Debe incluir al menos un número";
  if (!/[^A-Za-z0-9]/.test(v)) return "Debe incluir al menos un carácter especial";
  return "";
}

// --- Submit button ---

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold h-11 rounded-xl shadow-md shadow-brand-600/25 hover:shadow-lg hover:shadow-brand-600/35 transition-all disabled:opacity-50 disabled:pointer-events-none"
    >
      {pending ? "Creando cuenta…" : "Crear cuenta"}
    </button>
  );
}

// --- Component ---

export function RegisterForm() {
  const [state, action] = useActionState<ActionResult, FormData>(
    registerAction,
    null
  );

  // Field values
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Track when fields have been interacted with
  const [nameBlurred, setNameBlurred] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Remember what was submitted so server errors clear when user edits
  const [submitted, setSubmitted] = useState({ name: "", email: "", password: "" });

  // --- Client-side validation ---
  const nameClientErr = !name.trim() ? "El nombre es obligatorio" : "";
  const emailClientErr = validateEmail(email);
  const passwordClientErr = validatePassword(password);

  // Server errors only relevant if values match what was submitted
  const serverEmailErr =
    email === submitted.email
      ? (state?.errors?.email?.[0] ?? state?.message ?? "")
      : "";
  const serverPasswordErr =
    password === submitted.password
      ? (state?.errors?.password?.[0] ?? "")
      : "";

  // Show errors when the field has been touched or form submitted
  const nameError =
    nameBlurred || submitAttempted ? nameClientErr : "";
  const emailError =
    emailBlurred || submitAttempted
      ? emailClientErr || serverEmailErr
      : "";
  const passwordError =
    passwordBlurred || submitAttempted
      ? passwordClientErr || serverPasswordErr
      : "";

  // Green icon: after blur, valid, no server error
  const emailValid =
    emailBlurred && !emailClientErr && !serverEmailErr && !!email;
  const passwordValid =
    passwordBlurred && !passwordClientErr && !serverPasswordErr && !!password;

  // Show checklist while the user is typing
  const showChecklist = password.length > 0;

  return (
    <div className={`space-y-4 ${inter.className}`}>
      <GoogleButton label="Registrarse con Google" />

      <div className="text-center text-fg-subtle text-[11px] tracking-[0.18em] mb-1 uppercase">
        o regístrate con email
      </div>

      <form
        action={action}
        onSubmit={(e) => {
          setSubmitAttempted(true);
          setSubmitted({ name, email, password });
          if (nameClientErr || emailClientErr || passwordClientErr) {
            e.preventDefault();
          }
        }}
        className="space-y-4"
      >
        <InputField
          id="name"
          name="name"
          label="Nombre"
          type="text"
          placeholder="Tu nombre"
          autoComplete="name"
          value={name}
          onChange={setName}
          onBlur={() => setNameBlurred(true)}
          error={nameError}
          valid={nameBlurred && !nameClientErr && !!name}
        />
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

        <div>
          <InputField
            id="password"
            name="password"
            label="Contraseña"
            type="password"
            placeholder="Contraseña"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            onBlur={() => setPasswordBlurred(true)}
            error={passwordError}
            valid={passwordValid}
          />
          {showChecklist && <PasswordChecklist password={password} />}
        </div>

        <SubmitButton />
      </form>

      <p className={`text-center text-sm text-fg-muted ${playfair.className}`}>
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
