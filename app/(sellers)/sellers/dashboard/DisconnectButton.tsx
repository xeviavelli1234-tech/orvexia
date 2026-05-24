"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function DisconnectButton() {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-white/45 hover:text-white/80 underline underline-offset-4 transition-colors"
      >
        Desconectar mi cuenta de Amazon
      </button>
    );
  }

  return (
    <form
      action="/api/sellers/amazon/disconnect"
      method="post"
      className="inline-flex flex-wrap items-center gap-3"
    >
      <span className="text-sm text-white/70">¿Seguro? Pararás el reprecio.</span>
      <Button type="submit" variant="danger" size="sm">
        Sí, desconectar
      </Button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-sm text-white/45 hover:text-white/80 underline underline-offset-4 transition-colors"
      >
        Cancelar
      </button>
    </form>
  );
}
