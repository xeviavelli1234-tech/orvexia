"use client";

import { useState } from "react";

export function DisconnectButton() {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-fg/60 hover:text-fg underline underline-offset-4"
      >
        Desconectar mi cuenta de Amazon
      </button>
    );
  }

  return (
    <form action="/api/sellers/amazon/disconnect" method="post" className="inline-flex items-center gap-3">
      <span className="text-sm text-fg/70">¿Seguro? Pararás el reprecio.</span>
      <button
        type="submit"
        className="rounded-md bg-red-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-red-700"
      >
        Sí, desconectar
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-sm text-fg/60 hover:text-fg"
      >
        Cancelar
      </button>
    </form>
  );
}
