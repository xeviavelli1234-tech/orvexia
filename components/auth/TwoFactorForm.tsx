"use client";

import { useActionState } from "react";
import { verifyTwoFactorAction, type ActionResult } from "@/app/actions/auth";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

/**
 * Segundo paso de la verificación en dos pasos, guiado por la cookie
 * `pending-2fa`. Lo usan los flujos que llegan por redirección (enlace mágico,
 * Google OAuth) a través de /login/2fa. El login por contraseña tiene su propia
 * copia inline dentro de LoginForm porque allí el paso 1 y el paso 2 comparten
 * estado de React.
 */
export function TwoFactorForm() {
  const [state, action] = useActionState<ActionResult, FormData>(
    verifyTwoFactorAction,
    null,
  );

  return (
    <div className={`space-y-4 ${inter.className}`}>
      <div className="text-center">
        <div className="text-lg font-bold">Verificación en dos pasos</div>
        <p className="mt-1 text-xs text-fg-muted">
          Introduce el código de 6 dígitos de tu app de autenticación (o un
          código de recuperación).
        </p>
      </div>
      <form action={action} className="space-y-3">
        <input
          name="code"
          inputMode="text"
          autoComplete="one-time-code"
          autoFocus
          placeholder="123456"
          className="w-full h-11 rounded-xl border border-fg/15 bg-bg px-4 text-center tracking-[0.3em] font-mono text-lg focus:border-brand-600 focus:outline-none"
        />
        {state?.message && (
          <p role="alert" className="text-xs text-danger-500 text-center field-msg">
            {state.message}
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
