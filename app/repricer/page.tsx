import type { Metadata } from "next";
import Link from "next/link";
import { jsonLdScript } from "@/lib/json-ld";
import PriceSimulator from "./PriceSimulator";
import RoiCalculator from "./RoiCalculator";

const CANONICAL = "https://www.orvexia.es/repricer";
const OG_DESC =
  "Repricer automático para vendedores de Amazon España. Gana la Buy Box y protege tu margen con reglas que tú controlas. 14 días gratis; desde 9 €/mes sin permanencia.";

export const metadata: Metadata = {
  title: "Repricer automático para Amazon España | Orvexia",
  description:
    "Orvexia Repricer ajusta tus precios de Amazon en tiempo real para ganar la Buy Box y proteger tu margen, con reglas que tú controlas. Sincronización SP-API, alertas, analíticas y modo simulación. 14 días gratis.",
  keywords: [
    "repricer Amazon",
    "repricer Amazon España",
    "reprecio automático Amazon",
    "ganar la Buy Box",
    "software repricing Amazon",
    "repricer Seller Central",
    "ajustar precios Amazon automáticamente",
  ],
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "website",
    url: CANONICAL,
    siteName: "Orvexia",
    title: "Repricer automático para Amazon España",
    description: OG_DESC,
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "Repricer automático para Amazon España",
    description: OG_DESC,
  },
};

// Datos estructurados: ayudan a Google a mostrar precio, prueba gratuita y
// preguntas frecuentes como rich results (mejora el CTR en la búsqueda).
const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Orvexia Repricer",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: CANONICAL,
  description: OG_DESC,
  offers: [
    {
      "@type": "Offer",
      price: "9.00",
      priceCurrency: "EUR",
      description:
        "Plan Monitor · alertas de Buy Box y competencia sin tocar tus precios · IVA incluido · sin permanencia",
      url: CANONICAL,
    },
    {
      "@type": "Offer",
      price: "19.00",
      priceCurrency: "EUR",
      description: "Plan Pro · 14 días de prueba gratis · IVA incluido · sin permanencia",
      url: CANONICAL,
    },
  ],
  provider: {
    "@type": "Organization",
    name: "Orvexia",
    url: "https://www.orvexia.es",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Qué es un repricer de Amazon?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Es un software que ajusta automáticamente tus precios en Amazon para ganar la Buy Box sin bajar de tu precio mínimo rentable. Orvexia Repricer recalcula en cada ciclo analizando la competencia y la Buy Box, dentro de los límites que tú defines.",
      },
    },
    {
      "@type": "Question",
      name: "¿Necesito una cuenta de Amazon Seller para usarlo?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Para el reprecio automático sí: conectas tu cuenta de Amazon España vía SP-API con permisos de Precios y Listing de producto. También puedes usar el modo sin Amazon: subes tu catálogo en CSV y el motor te devuelve un plan de precios sugerido para aplicar donde vendas.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuánto cuesta Orvexia Repricer?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Hay dos planes: Monitor por 9 €/mes (vigila tu competencia y la Buy Box y te avisa, sin tocar tus precios) y Pro por 19 €/mes con reprecio automático cada 5 minutos y SKUs ilimitados, con 14 días de prueba gratis. IVA incluido, sin permanencia; cancela cuando quieras.",
      },
    },
    {
      "@type": "Question",
      name: "¿Es seguro? ¿Puede bajar mis precios sin control?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tú pones suelos y techos por producto, así que nunca vendes por debajo de tu rentabilidad ni por encima de tu tope. Con el modo simulación calculas los cambios sin aplicarlos en Amazon hasta que los autorices, y cada cambio queda registrado y explicado.",
      },
    },
  ],
};

const STEPS = [
  {
    n: "01",
    title: "Conecta tu cuenta",
    desc: "Autorizas Orvexia en tu Seller Central vía Amazon SP-API (permisos de Precios y Listing de producto). Nunca compartes tu contraseña con nosotros.",
  },
  {
    n: "02",
    title: "Define tus reglas",
    desc: "Eliges estrategia, suelos y techos de precio y horarios, por producto o para toda la cuenta. Tú decides cómo y cuándo se reprecia.",
  },
  {
    n: "03",
    title: "El motor trabaja por ti",
    desc: "En cada ciclo analiza la competencia y la Buy Box y ajusta tus precios dentro de tus límites. Con modo simulación puedes verlo sin aplicar nada.",
  },
];

const FEATURES = [
  {
    title: "Reprecio en tiempo real",
    desc: "Estrategias de Buy Box, igualar al competidor, margen objetivo o precio fijo. El motor recalcula en cada ciclo.",
  },
  {
    title: "Tú pones los límites",
    desc: "Suelos y techos por producto: nunca vendes por debajo de tu rentabilidad ni por encima de tu tope.",
  },
  {
    title: "Modo simulación",
    desc: "Calcula los cambios sin aplicarlos en Amazon hasta que tú lo autorices. Pruébalo sin riesgo.",
  },
  {
    title: "Sincronización SP-API",
    desc: "Importa tus listings, precios y stock automáticamente desde tu cuenta de Amazon.",
  },
  {
    title: "Alertas por email",
    desc: "Te avisamos de pérdida de Buy Box, toques de suelo de precio o errores, directo a tu correo.",
  },
  {
    title: "Analíticas y auditoría",
    desc: "Cada cambio de precio queda registrado y explicado. Sabes qué cambió, cuándo y por qué.",
  },
];

const MONITOR_INCLUYE = [
  "Vigilancia de competencia y Buy Box cada 15 minutos",
  "Alertas de Buy Box perdida/recuperada y precio mínimo",
  "Detección de dumpers y cambios de competencia",
  "Precio sugerido por el motor, sin aplicarlo",
  "Avisos por email, Slack, Telegram y Discord",
  "No modifica tus precios en Amazon",
];

const PLAN_INCLUYE = [
  "SKUs ilimitados",
  "Reprecio automático cada 5 minutos",
  "Estrategias de Buy Box, margen objetivo y precio fijo",
  "Modo simulación y alertas por email",
  "Sincronización SP-API y registro de auditoría",
  "Soporte por correo electrónico",
];

export default function RepricerPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd) }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div
          className="absolute inset-0 bg-grid-cyber-fine opacity-30 pointer-events-none"
          style={{ maskImage: "radial-gradient(ellipse 70% 70% at 50% 30%, black, transparent)" }}
        />
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] rounded-full halo-breathe pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.22), transparent 65%)" }}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20 text-center">
          <div className="reveal inline-flex items-center gap-2 mb-6 px-3.5 h-7 rounded-full border border-brand-400/25 bg-brand-400/10">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 pulse-dot" />
            <span className="text-[11px] font-semibold tracking-wide text-brand-200">
              Para vendedores de Amazon España · SP-API oficial
            </span>
          </div>
          <h1
            className="reveal font-extrabold tracking-tight text-white mb-5"
            style={{
              fontSize: "clamp(2.4rem, 6vw, 4.6rem)",
              lineHeight: 0.98,
              letterSpacing: "-0.045em",
              textWrap: "balance",
            }}
          >
            Repricer <span className="text-shimmer-violet">automático</span> para Amazon
          </h1>
          <p
            className="reveal text-white/60 text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ textWrap: "pretty" }}
          >
            Ajusta tus precios en tiempo real para ganar la Buy Box y proteger tu margen, con reglas que tú
            controlas. Conecta tu cuenta de Amazon España y deja que el motor trabaje por ti.
          </p>
          <div className="reveal mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard/repricer"
              className="shine-on-hover inline-flex h-12 items-center justify-center rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 active:scale-[0.97]"
              style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
            >
              Activar mi repricer
            </Link>
            <Link
              href="/politica-datos-amazon"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
            >
              Cómo protegemos tus datos
            </Link>
          </div>
          <p className="reveal mt-5 text-sm text-white/55">
            14 días de prueba gratis · Monitor 9 €/mes o Pro 19 €/mes (IVA incl.) · cancela cuando quieras
          </p>
        </div>
      </section>

      {/* Simulador público — gancho de conversión para tráfico frío */}
      <section className="border-b border-white/[0.06] bg-void-deep">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
          <PriceSimulator />
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-20">
        {/* Cómo funciona */}
        <section>
          <h2
            className="reveal text-2xl sm:text-3xl font-extrabold text-fg mb-2 tracking-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            Cómo funciona
          </h2>
          <p className="reveal text-fg-muted mb-8">De cero a reprecio automático en tres pasos.</p>
          <div className="reveal bg-bg-elevated rounded-2xl border border-border divide-y divide-border">
            {STEPS.map((step) => (
              <div key={step.n} className="flex gap-5 p-6 items-start">
                <span className="text-xs font-black text-brand-300 bg-brand-400/10 border border-brand-400/25 rounded-lg px-2.5 py-1.5 flex-shrink-0 mt-0.5 tabular">
                  {step.n}
                </span>
                <div>
                  <p className="font-bold text-fg mb-1">{step.title}</p>
                  <p className="text-sm text-fg-muted leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Funciones */}
        <section>
          <h2
            className="reveal text-2xl sm:text-3xl font-extrabold text-fg mb-2 tracking-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            Funciones
          </h2>
          <p className="reveal text-fg-muted mb-8">Todo lo que necesitas para repreciar con control y seguridad.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="reveal bg-bg-elevated rounded-2xl border border-border p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/30 hover:shadow-[0_24px_60px_-24px_rgba(99,102,241,0.55)]"
              >
                <p className="font-bold text-fg mb-1.5">{f.title}</p>
                <p className="text-sm text-fg-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Precio */}
        <section>
          <h2
            className="reveal text-2xl sm:text-3xl font-extrabold text-fg mb-2 tracking-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            Precio
          </h2>
          <p className="reveal text-fg-muted mb-8">
            Dos tarifas planas, sin permanencia. El repricer completo empieza con 14 días de
            prueba gratuita.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto items-stretch">
            {/* Monitor */}
            <div className="reveal flex flex-col bg-bg-elevated rounded-2xl border border-border p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
              <div className="inline-flex self-start items-center gap-2 mb-5 px-3 h-7 rounded-full border border-white/12 bg-white/[0.04]">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/65">
                  Solo avisos
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-black text-fg tabular">9 €</span>
                <span className="text-fg-muted font-semibold">/ mes</span>
              </div>
              <p className="text-sm text-fg-muted mb-6">
                Plan Monitor · IVA incluido · cancela cuando quieras
              </p>
              <ul className="space-y-2.5 mb-6">
                {MONITOR_INCLUYE.map((item) => (
                  <li key={item} className="flex gap-3 items-start text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/35 flex-shrink-0" />
                    <span className="text-fg-muted leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard/repricer"
                className="mt-auto flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-6 text-sm font-bold text-white/85 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
              >
                Empezar con Monitor
              </Link>
              <p className="mt-4 text-xs text-fg-muted leading-relaxed">
                Ideal si aún no te fías de que una herramienta cambie tus precios: el motor
                vigila y te avisa, y tú decides. Nunca modifica nada en Amazon.
              </p>
            </div>

            {/* Pro — plan recomendado */}
            <div
              className="reveal relative flex flex-col rounded-2xl border border-brand-400/30 p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/50 hover:shadow-[0_24px_60px_-24px_rgba(99,102,241,0.55)]"
              style={{ background: "linear-gradient(160deg,#100d26 0%,#0a0819 55%,#070614 100%)" }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-10 -right-10 w-44 h-44 rounded-full halo-breathe"
                style={{ background: "radial-gradient(circle,rgba(129,140,248,0.18),transparent 65%)" }}
              />
              <div className="inline-flex self-start items-center gap-2 mb-5 px-3 h-7 rounded-full border border-brand-400/25 bg-brand-400/10">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-200">
                  Recomendado · 14 días gratis
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-black text-fg tabular">19 €</span>
                <span className="text-fg-muted font-semibold">/ mes</span>
              </div>
              <p className="text-sm text-fg-muted mb-6">
                Plan Pro · IVA incluido · cancela cuando quieras
              </p>
              <ul className="space-y-2.5 mb-6">
                {PLAN_INCLUYE.map((item) => (
                  <li key={item} className="flex gap-3 items-start text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                    <span className="text-fg-muted leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard/repricer"
                className="shine-on-hover mt-auto flex h-12 items-center justify-center rounded-full bg-brand-500 px-6 text-sm font-bold text-white transition-all hover:bg-brand-400 active:scale-[0.97]"
                style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
              >
                Empezar la prueba gratuita
              </Link>
              <p className="mt-4 text-xs text-fg-muted leading-relaxed">
                Tras los 14 días, la suscripción pasa al plan Pro (19 €/mes, IVA incl.) salvo que
                canceles antes. Facturación mensual recurrente vía Stripe; puedes cancelar en
                cualquier momento. Consulta el detalle en los{" "}
                <Link href="/terminos" className="text-brand-300 hover:text-brand-200 hover:underline">
                  Términos del servicio
                </Link>
                .
              </p>
            </div>
          </div>

          <RoiCalculator />
        </section>

        {/* Para quién */}
        <section>
          <h2
            className="reveal text-2xl sm:text-3xl font-extrabold text-fg mb-2 tracking-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            ¿Para quién es?
          </h2>
          <div className="reveal bg-bg-elevated rounded-2xl border border-border p-6 space-y-3">
            <p className="text-sm text-fg-muted leading-relaxed">
              <strong className="text-fg">Vendedores de Amazon España</strong> (Seller Central) que quieran
              automatizar su pricing sin perder el control.
            </p>
            <p className="text-sm text-fg-muted leading-relaxed">
              <strong className="text-fg">Requisitos:</strong> una cuenta de vendedor activa y los permisos
              SP-API de <strong className="text-fg">Precios</strong> y{" "}
              <strong className="text-fg">Listing de producto</strong>. Es una aplicación web, sin
              instalación: se usa desde el navegador.
            </p>
            <p className="text-sm text-fg-muted leading-relaxed">
              Orvexia <strong className="text-fg">nunca</strong> accede a datos de compradores ni de pedidos,
              y solo actúa sobre tu propia cuenta según tu configuración.
            </p>
          </div>
        </section>

        {/* CTA final */}
        <section className="reveal relative overflow-hidden text-center rounded-3xl border border-brand-400/15 px-6 py-12 sm:py-14"
          style={{ background: "linear-gradient(160deg,#100d26 0%,#0a0819 55%,#070614 100%)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[520px] h-[320px] rounded-full halo-breathe"
            style={{ background: "radial-gradient(ellipse at center,rgba(129,140,248,0.18),transparent 65%)" }}
          />
          <h2
            className="relative text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight"
            style={{ letterSpacing: "-0.03em", textWrap: "balance" }}
          >
            Empieza hoy
          </h2>
          <p className="relative text-white/60 mb-7 max-w-lg mx-auto" style={{ textWrap: "pretty" }}>
            Conecta tu cuenta y prueba el reprecio en modo simulación antes de aplicar ningún cambio.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard/repricer"
              className="shine-on-hover inline-flex h-12 items-center justify-center rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 active:scale-[0.97]"
              style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
            >
              Activar mi repricer
            </Link>
            <Link
              href="/ayuda"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
            >
              Centro de ayuda
            </Link>
          </div>
          <p className="relative mt-6 text-xs text-white/45">
            Consulta nuestra{" "}
            <Link href="/politica-datos-amazon" className="text-brand-300 hover:text-brand-200 hover:underline">
              Política de Datos de Amazon
            </Link>{" "}
            y los{" "}
            <Link href="/terminos" className="text-brand-300 hover:text-brand-200 hover:underline">
              Términos del servicio
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
