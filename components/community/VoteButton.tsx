"use client";

import { useState } from "react";
import { toggleCommunityVote } from "@/app/actions/community";

interface VoteButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function VoteButton({ postId, initialLiked, initialCount }: VoteButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  async function handle() {
    if (pending) return;
    setPending(true);
    try {
      const res = await toggleCommunityVote(postId);
      if (res.liked !== undefined) {
        setLiked(res.liked);
        setCount((c) => (res.liked ? c + 1 : c - 1));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "Quitar me gusta" : "Me gusta"}
      className={`group inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-150 disabled:opacity-60 ${
        liked
          ? "bg-red-50 text-red-500 border border-red-200"
          : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-red-50 hover:text-red-500 hover:border-red-200"
      }`}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        aria-hidden="true"
        className={`transition-transform ${pending ? "scale-90" : liked ? "scale-110" : "group-hover:scale-110"}`}
      >
        <path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{count > 0 ? count : liked ? "¡Gracias!" : "Me gusta"}</span>
    </button>
  );
}
