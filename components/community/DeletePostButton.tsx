"use client";

import { useState } from "react";
import { deleteCommunityPost } from "@/app/actions/community";

export function DeletePostButton({ postId }: { postId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);

  async function handle() {
    if (pending) return;
    setPending(true);
    try {
      await deleteCommunityPost(postId);
    } finally {
      setPending(false);
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#64748B]">¿Eliminar?</span>
        <button
          onClick={handle}
          disabled={pending}
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-60"
        >
          {pending ? "Eliminando..." : "Sí, eliminar"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          disabled={pending}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 transition"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Eliminar publicación
    </button>
  );
}
