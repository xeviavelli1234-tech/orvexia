"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleCommunityVote } from "@/app/actions/community";

export function CardVoteButton({
  postId,
  initialLiked,
  initialCount,
  loggedIn,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  loggedIn: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handle(e: React.MouseEvent) {
    e.preventDefault(); // no navegar al post
    e.stopPropagation();

    if (!loggedIn) {
      router.push("/login?next=/comunidad");
      return;
    }
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
      aria-label={liked ? "Quitar voto" : "Votar"}
      className={`flex flex-col items-center gap-0.5 group/vote transition-all disabled:opacity-50 ${
        liked ? "text-red-500" : "text-[#CBD5E1] hover:text-red-400"
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        aria-hidden="true"
        className={`transition-transform duration-150 ${pending ? "scale-90" : "group-hover/vote:scale-110"}`}
      >
        <path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[11px] font-bold leading-none">{count}</span>
    </button>
  );
}
