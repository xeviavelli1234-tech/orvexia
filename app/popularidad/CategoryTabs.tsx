"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  TELEVISORES:        "Televisores",
  LAVADORAS:          "Lavadoras",
  FRIGORIFICOS:       "Frigoríficos",
  LAVAVAJILLAS:       "Lavavajillas",
  SECADORAS:          "Secadoras",
  HORNOS:             "Hornos",
  MICROONDAS:         "Microondas",
  ASPIRADORAS:        "Aspiradoras",
  CAFETERAS:          "Cafeteras",
  AIRES_ACONDICIONADOS: "Aires A/C",
  OTROS:              "Otros",
};

const CATEGORY_EMOJI: Record<string, string> = {
  TELEVISORES:        "📺",
  LAVADORAS:          "🫧",
  FRIGORIFICOS:       "🧊",
  LAVAVAJILLAS:       "🍽️",
  SECADORAS:          "🌀",
  HORNOS:             "🔥",
  MICROONDAS:         "📻",
  ASPIRADORAS:        "🌪️",
  CAFETERAS:          "☕",
  AIRES_ACONDICIONADOS: "❄️",
  OTROS:              "📦",
};

export function CategoryTabs({ categories }: { categories: string[] }) {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();
  const [pending, start] = useTransition();

  const active = params.get("categoria") ?? "";

  function set(val: string) {
    const next = new URLSearchParams(params.toString());
    val ? next.set("categoria", val) : next.delete("categoria");
    start(() => router.push(`${pathname}?${next.toString()}`));
  }

  const all = [{ value: "", label: "Todos", emoji: "🏆" }].concat(
    categories.map((c) => ({ value: c, label: CATEGORY_LABELS[c] ?? c, emoji: CATEGORY_EMOJI[c] ?? "📦" })),
  );

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {all.map((tab) => {
        const isActive = active === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => set(tab.value)}
            disabled={pending}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-all duration-150 shrink-0 ${
              isActive
                ? "bg-[#7C3AED] border-[#7C3AED] text-white shadow-sm"
                : "bg-white border-[#E2E8F0] text-[#475569] hover:border-[#7C3AED]/50 hover:text-[#7C3AED]"
            } disabled:opacity-60`}
          >
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
