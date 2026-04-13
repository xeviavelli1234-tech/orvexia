"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createCommunityComment } from "@/app/actions/community";
import type { CommunityActionState } from "@/app/actions/community";

const initialState: CommunityActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
      style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)" }}
    >
      {pending ? (
        <>
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" strokeLinecap="round" />
          </svg>
          Publicando...
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Comentar
        </>
      )}
    </button>
  );
}

export function CommentForm({ postId }: { postId: string }) {
  const boundAction = createCommunityComment.bind(null, postId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state?.success && textareaRef.current) {
      textareaRef.current.value = "";
    }
  }, [state?.success]);

  return (
    <form action={formAction} className="space-y-3">
      <textarea
        ref={textareaRef}
        name="content"
        required
        minLength={2}
        maxLength={600}
        rows={3}
        className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] placeholder-[#CBD5E1] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition resize-none"
        placeholder="Comparte tu opinión o experiencia..."
      />

      {state?.fieldErrors?.content && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {state.fieldErrors.content[0]}
        </p>
      )}
      {state?.error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {state.success}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#94A3B8]">Máximo 600 caracteres</span>
        <SubmitButton />
      </div>
    </form>
  );
}
