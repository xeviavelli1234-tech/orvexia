"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearAllListingsAction } from "./actions";
import { useToast } from "@/components/ui/Toast";

/**
 * Vacía el catálogo (borra TODOS los productos de la cuenta). Disponible en
 * cualquier modo: quita los productos de ejemplo del demo, restos al cambiar
 * de origen, o el catálogo importado por CSV. No toca la cuenta ni el token.
 */
export function ClearCatalogButton({ count }: { count: number }) {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();
  const [busy, startTransition] = useTransition();

  if (count <= 0) return null;

  function onClear() {
    if (
      !confirm(
        `Voy a borrar los ${count} producto(s) del catálogo. Esto deja el panel vacío; podrás volver a sincronizar o importar un CSV. ¿Continuar?`,
      )
    )
      return;
    startTransition(async () => {
      const res = await clearAllListingsAction();
      if (res.ok) {
        toastSuccess(`${res.deleted ?? 0} producto(s) borrados`, {
          description: "Catálogo vacío. Vincula Amazon o sube un CSV.",
        });
        router.refresh();
      } else {
        toastError("No se pudo vaciar el catálogo", { description: res.error });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClear}
      disabled={busy}
      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/[0.06] px-3 py-2 text-[12px] font-semibold text-red-200/90 transition-colors hover:bg-red-500/15 hover:text-red-100 disabled:opacity-50"
    >
      {busy ? "Borrando…" : `🗑️ Vaciar catálogo (${count})`}
    </button>
  );
}
