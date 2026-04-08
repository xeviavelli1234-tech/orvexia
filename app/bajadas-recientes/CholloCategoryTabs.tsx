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

export function CholloCategoryTabs({ categories }: { categories: string[] }) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const current = searchParams.get("categoria") ?? "";

  function navigate(cat: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (cat) params.set("categoria", cat);
    else params.delete("categoria");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const all = ["", ...categories];

  return (
    <div className="flex flex-wrap gap-2">
      {all.map((cat) => {
        const active = cat === current;
        const label  = cat ? `${CATEGORY_EMOJI[cat] ?? "📦"} ${CATEGORY_LABELS[cat] ?? cat}` : "🔥 Todos";
        return (
          <button
            key={cat}
            onClick={() => navigate(cat)}
            disabled={pending}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              active
                ? "bg-[#D97706] text-white border-[#D97706] shadow-sm"
                : "bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#D97706]/40 hover:text-[#D97706]"
            }`}
          >
            {label}
          </button>
        );
      })}
      {pending && <span className="ml-1 text-xs text-[#D97706] self-center animate-pulse">Cargando…</span>}
    </div>
  );
}
