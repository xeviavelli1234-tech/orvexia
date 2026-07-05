import type { Metadata } from "next";
import { SectionChip } from "@/app/_components/SectionPrimitives";

export const metadata: Metadata = {
  title: "Politica de cookies",
  description: "Informacion y gestion del consentimiento de cookies en Orvexia.",
};

const sections = [
  {
    title: "1. Que son las cookies",
    content:
      "Las cookies son pequenos archivos que se guardan en tu navegador para recordar informacion de navegacion y mejorar el servicio.",
  },
  {
    title: "2. Que tipos usamos",
    content:
      "Usamos cookies tecnicas (necesarias) para funciones basicas del sitio. Solo con tu permiso usamos cookies de analitica y publicidad.",
  },
  {
    title: "3. Base legal y consentimiento",
    content:
      "Las cookies no necesarias se activan unicamente cuando las aceptas. Puedes rechazarlas sin perder acceso a funciones esenciales.",
  },
  {
    title: "4. Como cambiar tu decision",
    content:
      "Puedes abrir en cualquier momento la opcion \"Gestionar cookies\" en el pie de pagina para actualizar tus preferencias.",
  },
  {
    title: "5. Conservacion",
    content:
      "Guardamos tu preferencia de consentimiento en tu navegador para no volver a preguntarte en cada visita.",
  },
  {
    title: "6. Cookies tecnicas usadas en Orvexia",
    content:
      "auth-session (sesion autenticada, 7 dias), oauth_state (seguridad en login de Google, 10 minutos) y orvexia_cookie_consent (tu preferencia de cookies, 12 meses).",
  },
  {
    title: "7. Cookies opcionales si aceptas analitica/publicidad",
    content:
      "Si activas analitica, pueden usarse cookies de Google Analytics como _ga y _ga_*. Si activas publicidad, pueden usarse cookies de Meta Pixel como _fbp y _fbc.",
  },
];

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-[#050310] text-white/90">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-14 sm:py-20">
        <header className="reveal relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[560px] -translate-x-1/2 rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.15), transparent 70%)" }}
          />
          <div className="relative flex justify-center sm:justify-start">
            <SectionChip label="Legal · Cookies" />
          </div>
          <h1
            className="relative mt-6 font-extrabold tracking-tight text-white"
            style={{ fontSize: "clamp(2rem, 4.6vw, 3rem)", lineHeight: 1.08, letterSpacing: "-0.03em", textWrap: "balance" }}
          >
            Política de cookies
          </h1>
          <p className="relative mt-4 max-w-2xl text-[15px] leading-relaxed text-white/60" style={{ textWrap: "pretty" }}>
            Esta política explica cómo usamos cookies en Orvexia y cómo puedes gestionar tu consentimiento.
          </p>
        </header>

        <section className="mt-10 space-y-3">
          {sections.map((item) => (
            <article key={item.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
              <h2 className="text-base font-bold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{item.content}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
