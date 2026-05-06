"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

const PILLS = [
  { label: "Mejor descuento", value: "discount_desc" },
  { label: "Precio más bajo",  value: "price_asc"    },
  { label: "Mejor valorados",  value: "savings_desc" },
] as const;

export function SortBar() {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();
  const [pending, start] = useTransition();

  const orden = params.get("orden") ?? "discount_desc";

  function setOrden(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set("orden", value);
    start(() => router.push(`${pathname}?${next.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-fg font-semibold shrink-0">
        <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
        Filtrado experto
      </div>

      <div className="flex gap-2 flex-wrap flex-1">
        {PILLS.map((p) => {
          const active = orden === p.value;
          return (
            <button
              key={p.value}
              onClick={() => setOrden(p.value)}
              disabled={pending}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-150 shrink-0 ${
                active
                  ? "bg-brand-600 border-brand-600 text-white shadow-sm"
                  : "bg-bg-elevated border-border text-fg-muted hover:border-brand-600/50 hover:text-brand-600"
              } disabled:opacity-60`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-1.5 text-sm text-fg-muted shrink-0">
        {pending ? (
          <svg className="w-3.5 h-3.5 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
        ) : (
          <span className="w-2 h-2 rounded-full bg-accent-500/70" />
        )}
        Actualizado cada hora
      </div>
    </div>
  );
}
