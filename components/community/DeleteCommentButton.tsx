"use client";

import { useState } from "react";
import { deleteCommunityComment } from "@/app/actions/community";

export function DeleteCommentButton({ commentId, postId }: { commentId: string; postId: string }) {
  const [pending, setPending] = useState(false);

  async function handle() {
    if (pending) return;
    setPending(true);
    try {
      await deleteCommunityComment(commentId, postId);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      aria-label="Eliminar comentario"
      className="ml-auto p-1 rounded-lg text-[#CBD5E1] hover:text-red-400 hover:bg-red-50 transition disabled:opacity-50"
    >
      {pending ? (
        <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
