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
      <div className="flex items-center gap-2 font-mono-ui text-[11px] uppercase tracking-wider text-white/75 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
        sort.by
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
                  ? "bg-cyan-400/15 border-cyan-400/50 text-cyan-200 shadow-[0_0_14px_-4px_rgba(94,234,212,0.5)]"
                  : "bg-white/[0.025] border-white/[0.10] text-white/65 hover:border-white/30 hover:text-white"
              } disabled:opacity-60`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-1.5 font-mono-ui text-[10px] uppercase tracking-wider text-white/45 shrink-0">
        {pending ? (
          <svg className="w-3.5 h-3.5 animate-spin text-cyan-300" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
        )}
        actualizado cada hora
      </div>
    </div>
  );
}
