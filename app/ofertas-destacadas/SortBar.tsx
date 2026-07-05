"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

const PILLS = [
  { label: "Mejor descuento", value: "discount_desc" },
  { label: "Precio más bajo",  value: "price_asc"    },
  { label: "Mayor ahorro",     value: "savings_desc" },
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
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-300">
        Ordenar por
      </span>

      <div className="flex flex-1 flex-wrap gap-2">
        {PILLS.map((p) => {
          const active = orden === p.value;
          return (
            <button
              key={p.value}
              onClick={() => setOrden(p.value)}
              disabled={pending}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.97] ${
                active
                  ? "border-brand-400 bg-brand-500 text-white shadow-[0_0_18px_-4px_rgba(99,102,241,0.7)]"
                  : "border-white/[0.10] bg-white/[0.025] text-white/65 hover:border-white/30 hover:text-white"
              } disabled:opacity-60`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 text-[11px] text-white/45">
        {pending ? (
          <svg className="h-3.5 w-3.5 animate-spin text-brand-300" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
        )}
        actualizado cada hora
      </div>
    </div>
  );
}
