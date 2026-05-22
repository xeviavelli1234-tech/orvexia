"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  TELEVISORES: "Televisores", LAVADORAS: "Lavadoras", FRIGORIFICOS: "Frigoríficos",
  LAVAVAJILLAS: "Lavavajillas", SECADORAS: "Secadoras", HORNOS: "Hornos",
  MICROONDAS: "Microondas", ASPIRADORAS: "Aspiradoras", CAFETERAS: "Cafeteras",
  AIRES_ACONDICIONADOS: "Aires A/C", OTROS: "Otros",
};

const CATEGORY_EMOJI: Record<string, string> = {
  TELEVISORES: "📺", LAVADORAS: "🫧", FRIGORIFICOS: "🧊", LAVAVAJILLAS: "🍽️",
  SECADORAS: "🌀", HORNOS: "🔥", MICROONDAS: "📻", ASPIRADORAS: "🌪️",
  CAFETERAS: "☕", AIRES_ACONDICIONADOS: "❄️", OTROS: "📦",
};

export function CategoryTabs({ categories }: { categories: string[] }) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const current = searchParams.get("categoria") ?? "";

  function navigate(cat: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (cat) params.set("categoria", cat);
    else params.delete("categoria");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {["", ...categories].map((cat) => {
        const active = cat === current;
        const label  = cat ? `${CATEGORY_EMOJI[cat] ?? "📦"} ${CATEGORY_LABELS[cat] ?? cat}` : "📉 Todas";
        return (
          <button
            key={cat}
            onClick={() => navigate(cat)}
            disabled={pending}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              active
                ? "bg-emerald-400/15 text-emerald-200 border-emerald-400/50 shadow-[0_0_14px_-4px_rgba(16,185,129,0.5)]"
                : "bg-white/[0.025] text-white/65 border-white/[0.10] hover:border-white/30 hover:text-white"
            } disabled:opacity-60`}
          >
            {label}
          </button>
        );
      })}
      {pending && <span className="ml-1 font-mono-ui text-[10px] uppercase tracking-wider text-emerald-300 self-center animate-pulse">loading…</span>}
    </div>
  );
}
