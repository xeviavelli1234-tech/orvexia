import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { NewPostForm } from "@/components/community/NewPostForm";

export const runtime = "nodejs";

export const metadata = {
  title: "Nueva publicación · Comunidad · Orvexia",
};

export default async function NuevaPublicacionPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=/comunidad/nueva");
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      {/* Sub-header */}
      <div
        className="px-6 py-10"
        style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto">
          <Link
            href="/comunidad"
            className="inline-flex items-center gap-1.5 text-sm text-blue-300 hover:text-white transition mb-4"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 12L6 8l4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Comunidad
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Nueva publicación
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            Comparte algo útil con la comunidad de Orvexia.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <NewPostForm />
      </div>
    </main>
  );
}
