import type { Metadata } from "next";

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
    <main>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
        <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300 mb-2">▸ /legal · cookies</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Política de <span className="text-gradient-neon">cookies</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          Esta política explica cómo usamos cookies en Orvexia y cómo puedes gestionar tu consentimiento.
        </p>

        <section className="mt-8 space-y-3">
          {sections.map((item) => (
            <article key={item.title} className="rounded-2xl border border-white/[0.08] bg-bg-elevated p-5">
              <h2 className="text-base font-bold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{item.content}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
