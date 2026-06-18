"use client";

import { type ReactNode } from "react";

/**
 * Formulario POST para cambiar el origen de datos (CSV manual / demo). Cuando
 * la cuenta ya está conectada a Amazon, `confirmMessage` exige un confirm()
 * antes de degradar (evita el clic accidental que rompía el sync) y manda el
 * campo oculto `confirm` que el endpoint exige para permitir el cambio.
 */
export function SwitchSourceForm({
  action,
  confirmMessage,
  children,
}: {
  action: string;
  confirmMessage?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      method="post"
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {confirmMessage && (
        <input type="hidden" name="confirm" value="switch-to-manual" />
      )}
      {children}
    </form>
  );
}
