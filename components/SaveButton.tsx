"use client";

import { useSaved } from "./SavedProvider";

export function SaveButton({ productId, className = "" }: { productId: string; className?: string }) {
  const { savedIds, toggle, loading } = useSaved();
  const saved = savedIds.has(productId);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggle(productId); }}
      disabled={loading}
      title={saved ? "Quitar de guardados" : "Guardar producto"}
      aria-label={saved ? "Quitar de guardados" : "Guardar producto"}
      aria-pressed={saved}
      className={`flex items-center justify-center rounded-full transition-all duration-150 ${
        saved
          ? "bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]"
          : "bg-[#F1F5F9] text-[#94A3B8] hover:bg-[#E2E8F0] hover:text-[#475569]"
      } disabled:opacity-50 ${className}`}
    >
      <svg
        width="16" height="16" viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
