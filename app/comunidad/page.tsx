import ForumTab, { Style as ForumStyle } from "@/components/ForumTab";
import { getSession } from "@/lib/session";
import { getCommunityFeed } from "@/lib/db/community";
import type { CommunityPostType } from "@/app/generated/prisma/client";
import Link from "next/link";

export const runtime = "nodejs";

const DevelopmentBanner = () => (
  <div className="mx-auto max-w-5xl px-4 pt-8">
    <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm font-medium shadow-sm">
      La comunidad está en proceso de desarrollo. Algunas funciones pueden cambiar o no estar disponibles todavía.
    </div>
  </div>
);

export const metadata = {
  title: "Foro / Discusiones · Comunidad",
  description: "Centro de decisiones de compra con discusiones, reseñas y ofertas.",
};

function mapType(t?: string): "Guía" | "Debate" | "Chollo" | "Pregunta" | "Review" {
  switch ((t ?? "").toUpperCase()) {
    case "CONSEJO":
    case "GUIA":
    case "GUÍA":
      return "Guía";
    case "DISCUSION":
    case "DEBATE":
      return "Debate";
    case "CHOLLO":
      return "Chollo";
    case "PREGUNTA":
      return "Pregunta";
    case "REVIEW":
    case "RESEÑA":
      return "Review";
    default:
      return "Debate";
  }
}

export default async function ComunidadPage() {
  const session = await getSession();
  if (!session) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] relative overflow-hidden">
        {/* Soft blurred backdrop */}
        <div className="absolute inset-0">
          <div className="absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full bg-[#2563EB]/15 blur-3xl" />
          <div className="absolute -bottom-24 right-[-40px] w-[420px] h-[420px] rounded-full bg-[#7C3AED]/15 blur-3xl" />
          <div className="absolute inset-0 backdrop-blur-md bg-white/40" />
        </div>

        <div className="relative min-h-screen flex flex-col items-center justify-center gap-6 px-6">
          <DevelopmentBanner />
          <div className="max-w-lg w-full bg-white border border-[#E2E8F0] rounded-3xl shadow-lg p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white text-xl">
              🔒
            </div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Comunidad de decisiones</h1>
            <p className="text-[#64748B] text-sm">
              Inicia sesión o crea una cuenta para acceder al foro y a las discusiones de productos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#2563EB] border border-[#2563EB] hover:bg-[#EFF6FF]"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }
  const [feed] = await Promise.all([
    getCommunityFeed(session?.userId, { type: "TODOS" as CommunityPostType | "TODOS", search: null }),
  ]);

  const threads = (feed ?? []).map((post: any) => ({
    id: post.id ?? crypto.randomUUID(),
    title: post.title ?? "Título sin definir",
    excerpt: post.content?.slice(0, 160) ?? "Sin descripción.",
    type: mapType(post.type),
    tags: Array.isArray(post.tags) ? post.tags : [],
    author: post.author?.name ?? "Anónimo",
    avatar: (post.author?.name ?? "AN").slice(0, 2).toUpperCase(),
    date: post.createdAt ? new Date(post.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "hoy",
    replies: post._count?.comments ?? post.commentsCount ?? 0,
    views: post.views ?? 0,
    score: post.score ?? 0,
    status: post.status ?? "Abierto",
    products:
      Array.isArray(post.products) && post.products.length
        ? post.products.map((p: any) => ({
            name: p.name ?? "Producto",
            price: p.price ? `${p.price} €` : "",
            store: p.store ?? "",
            badge: p.discount ? `-${p.discount}%` : undefined,
          }))
        : [],
  }));

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <ForumStyle />
      <DevelopmentBanner />
      <ForumTab threads={threads} />
    </main>
  );
}
