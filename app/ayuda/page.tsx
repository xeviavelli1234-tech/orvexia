import type { Metadata } from "next";
import Link from "next/link";
import { SectionChip } from "@/app/_components/SectionPrimitives";

export const metadata: Metadata = {
  title: "Centro de ayuda y soporte",
  description:
    "Ayuda y soporte de Orvexia Repricer: cómo conectar tu cuenta de Amazon, qué datos usamos, seguridad, cancelación y contacto.",
};

const SUPPORT_EMAIL = "orvexiaesp@gmail.com";

const FAQ = [
  {
    q: "¿Cómo conecto mi cuenta de Amazon?",
    a: "Desde el panel del repricer pulsa «Conectar mi cuenta de Amazon». Te llevamos a tu Seller Central para que autorices los permisos de Precios y Listing de producto vía Amazon SP-API. Nunca compartes tu contraseña con nosotros: la autorización la gestiona Amazon.",
  },
  {
    q: "¿Qué datos de Amazon usáis?",
    a: "Solo los roles de Pricing (precios competitivos) y Listing de producto (SKU, ASIN, título, imagen y precio), más tu identificador de vendedor para autenticar las llamadas. No accedemos a datos de compradores ni de pedidos (PII).",
  },
  {
    q: "¿Es seguro?",
    a: "Sí. El token de autorización de Amazon se guarda cifrado con AES-256-GCM y todas las comunicaciones van por HTTPS/TLS. Cada vendedor solo puede ver y operar sobre sus propios datos.",
  },
  {
    q: "¿Cambiáis mis precios sin permiso?",
    a: "Nunca. Tú defines la estrategia y los límites (suelos y techos). Además, el modo simulación calcula los cambios sin aplicarlos en Amazon hasta que tú lo autorices. Nada se modifica sin tu configuración explícita.",
  },
  {
    q: "¿Cómo desconecto o elimino mis datos?",
    a: "Puedes desconectar tu cuenta en cualquier momento con «Desconectar mi cuenta de Amazon» en el panel. Para la eliminación total de tus datos, escríbenos a soporte y la atenderemos en un plazo máximo de 30 días.",
  },
  {
    q: "¿Qué marketplaces soportáis?",
    a: "Amazon España de forma nativa. Si vendes en otros marketplaces de la UE, escríbenos y lo valoramos.",
  },
  {
    q: "¿Cuánto cuesta y cómo cancelo?",
    a: "El Plan Pro cuesta 19 €/mes (IVA incluido) e incluye SKUs ilimitados, reprecio cada 5 minutos y soporte por correo. Empiezas con 14 días de prueba gratuita y, si no cancelas antes, la suscripción se activa automáticamente. Puedes cancelar cuando quieras desde el portal de facturación o escribiéndonos a soporte. El detalle está en los Términos del servicio.",
  },
];

export default function AyudaPage() {
  return (
    <main className="min-h-screen bg-[#050310] text-white/90">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.05]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full halo-breathe"
          style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.18), transparent 70%)" }}
        />
        <div className="reveal relative mx-auto max-w-3xl px-4 sm:px-6 pt-16 sm:pt-20 pb-14 text-center">
          <SectionChip label="Soporte" />
          <h1
            className="mt-6 mb-5 font-extrabold tracking-tight text-white"
            style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)", lineHeight: 1.05, letterSpacing: "-0.035em", textWrap: "balance" }}
          >
            Centro de ayuda
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/60" style={{ textWrap: "pretty" }}>
            Resolvemos tus dudas sobre Orvexia Repricer. Si no encuentras lo que buscas, escríbenos.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-14 space-y-14">
        {/* Contacto */}
        <section
          className="reveal relative overflow-hidden rounded-3xl border border-brand-400/15 p-6 sm:p-8 text-center"
          style={{ background: "linear-gradient(160deg, #100d26 0%, #0a0819 55%, #070614 100%)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 left-1/2 h-48 w-80 -translate-x-1/2 rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.18), transparent 70%)" }}
          />
          <h2 className="relative mb-2 text-xl font-extrabold tracking-tight text-white">Contacta con soporte</h2>
          <p className="relative mx-auto mb-6 max-w-md text-sm leading-relaxed text-white/60">
            Atendemos por correo electrónico. Te respondemos lo antes posible, normalmente en menos de 48
            horas hábiles.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="shine-on-hover relative inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 hover:shadow-[0_0_48px_-4px_rgba(129,140,248,0.9)] active:scale-[0.97]"
            style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
          >
            {SUPPORT_EMAIL}
          </a>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-white">Preguntas frecuentes</h2>
          <div className="flex flex-col gap-2.5">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] transition-all duration-200 open:border-brand-400/30 open:bg-white/[0.035] hover:border-white/15"
              >
                <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4.5 sm:px-6 [&::-webkit-details-marker]:hidden">
                  <span className="flex-1 text-[15px] font-semibold leading-snug text-white/90">{item.q}</span>
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-transform duration-200 group-open:rotate-45 group-open:border-brand-400/40 group-open:text-brand-200"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <div className="px-5 pb-5 sm:px-6">
                  <p className="border-t border-white/[0.06] pt-4 text-sm leading-relaxed text-white/60">{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Enlaces legales */}
        <section className="text-center">
          <p className="text-sm text-white/60">
            Más información en{" "}
            <Link href="/politica-datos-amazon" className="font-medium text-brand-300 hover:text-brand-200 hover:underline">
              Política de Datos de Amazon
            </Link>
            ,{" "}
            <Link href="/politica-privacidad" className="font-medium text-brand-300 hover:text-brand-200 hover:underline">
              Privacidad
            </Link>{" "}
            y{" "}
            <Link href="/terminos" className="font-medium text-brand-300 hover:text-brand-200 hover:underline">
              Términos
            </Link>
            .
          </p>
          <p className="mt-4">
            <Link href="/repricer" className="text-sm font-semibold text-white/80 transition-colors hover:text-white hover:underline">
              ← Volver a Orvexia Repricer
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
