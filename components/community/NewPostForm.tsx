"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { CommunityActionState } from "@/app/actions/community";
import { createCommunityPost } from "@/app/actions/community";

const initialState: CommunityActionState = { fieldErrors: {} };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
      style={{ backgroundImage: "linear-gradient(135deg, #2563EB, #7C3AED)" }}
    >
      {pending ? "Publicando..." : "Publicar"}
    </button>
  );
}

export function NewPostForm({ productId }: { productId?: string | null }) {
  const [state, formAction] = useActionState(createCommunityPost, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const hasSuccess = !!state?.success;

  useEffect(() => {
    if (hasSuccess && formRef.current) {
      formRef.current.reset();
    }
  }, [hasSuccess]);

  const defaultType = useMemo(() => "DISCUSION", []);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">Comparte algo con la comunidad</p>
          <p className="text-xs text-[#64748B]">
            Experiencias, dudas, chollos o consejos sobre electrodomésticos.
          </p>
        </div>
        <span className="px-2 py-1 rounded-full bg-[#EEF2FF] text-[#4338CA] text-[11px] font-semibold tracking-wide">
          Beta
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_170px] gap-3">
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-[#0F172A]">Título</label>
          <input
            name="title"
            required
            minLength={6}
            maxLength={120}
            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
            placeholder="Ej: Mi experiencia con la nueva lavadora LG..."
          />
          {state?.fieldErrors?.title && (
            <p className="text-xs text-red-600">{state.fieldErrors.title[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-[#0F172A]">Tipo</label>
          <select
            name="type"
            defaultValue={defaultType}
            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
          >
            <option value="DISCUSION">Discusión</option>
            <option value="PREGUNTA">Pregunta</option>
            <option value="CHOLLO">Chollo / oferta</option>
            <option value="CONSEJO">Consejo rápido</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[13px] font-semibold text-[#0F172A]">Contenido</label>
        <textarea
          name="content"
          required
          minLength={30}
          maxLength={2000}
          rows={5}
          className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition resize-none"
          placeholder="Comparte detalles útiles: qué modelo tienes, tienda, precio, pros/contras..."
        />
        {state?.fieldErrors?.content && (
          <p className="text-xs text-red-600">{state.fieldErrors.content[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-[13px] font-semibold text-[#0F172A]">ID de producto (opcional)</label>
        <input
          name="productId"
          defaultValue={productId ?? ""}
          className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
          placeholder="Pegue el ID interno si quiere vincularlo a un producto"
        />
        {state?.fieldErrors?.productId && (
          <p className="text-xs text-red-600">{state.fieldErrors.productId[0]}</p>
        )}
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
