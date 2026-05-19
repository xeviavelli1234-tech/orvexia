"use client";

import { useEffect, useState } from "react";
import { getAuditLogAction } from "./actions";

interface AuditEntry {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
}

export function AuditButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("orvexia:open-audit"))}
      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors text-left"
    >
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
        Registro de actividad
      </span>
      <span className="text-[11px] text-white/40">auditoría →</span>
    </button>
  );
}

const LABEL: Record<string, string> = {
  "listing.range": "Rango de precio",
  "listing.strategy": "Estrategia",
  "listing.competition": "Competencia",
  "listing.tags": "Etiquetas",
  "listing.parent": "Variación",
  "listing.toggle": "Activar/Pausar",
  "account.settings": "Ajustes de cuenta",
  "account.billing": "Datos de facturación",
  pause_all: "Pausar todo",
  bulk: "Acción masiva",
  "bulk.tag": "Etiqueta masiva",
  import: "Importación CSV",
};

function rel(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}
function abs(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function AuditOverlay() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
      setLoading(true);
      setErr(null);
      getAuditLogAction().then((r) => {
        setLoading(false);
        if (r.ok) setEntries(r.entries);
        else setErr(r.error);
      });
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("orvexia:open-audit", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("orvexia:open-audit", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[58] bg-black/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      onClick={() => setOpen(false)}
    >
      <div
        className="mx-auto max-w-2xl rounded-2xl border border-cyan-400/20 bg-[rgba(7,8,18,0.99)] shadow-[0_30px_80px_-20px_rgba(34,211,238,0.4)] fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[rgba(7,8,18,0.99)] rounded-t-2xl">
          <div>
            <h2 className="text-base font-extrabold tracking-tight">
              Registro de <span className="text-gradient-neon">actividad</span>
            </h2>
            <p className="text-[11px] text-white/40">
              Cambios de configuración de tu cuenta (auditoría)
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="h-8 w-8 grid place-items-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <p className="text-sm text-white/45 py-8 text-center">Cargando…</p>
          ) : err ? (
            <p className="text-sm text-red-300 py-8 text-center">
              Error: {err}
            </p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-white/45 py-8 text-center">
              Aún no hay cambios registrados.
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="py-3 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <span className="inline-block rounded border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-200">
                      {LABEL[e.action] ?? e.action}
                    </span>
                    <div className="mt-1 text-[13px] text-white/80 break-words">
                      {e.detail}
                    </div>
                  </div>
                  <div
                    className="shrink-0 text-right text-[11px] text-white/40"
                    title={abs(e.createdAt)}
                  >
                    {rel(e.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 text-[10px] text-white/35 border-t border-white/10 pt-3">
            Se guardan los cambios de configuración para trazabilidad. Se
            eliminan junto con tu cuenta si solicitas el borrado (RGPD).
          </p>
        </div>
      </div>
    </div>
  );
}
