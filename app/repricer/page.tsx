import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Repricer para vendedores de Amazon",
  description:
    "Orvexia Repricer ajusta tus precios de Amazon en tiempo real para ganar la Buy Box y proteger tu margen, con reglas que tú controlas. Sincronización SP-API, alertas, analíticas y modo simulación.",
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

export default function RepricerPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid-cyber opacity-50 pointer-events-none" />
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] rounded-full halo-breathe pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.25), transparent 65%)" }}
        />
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none opacity-60"
          style={{ background: "radial-gradient(circle, rgba(94,234,212,0.18), transparent 65%)" }}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-3 h-7 rounded-full bg-white/[0.04] border border-white/[0.10] font-mono-ui">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-[10px] uppercase tracking-wider text-white/65">
              ▸ /repricer · Amazon SP-API
            </span>
          </div>
          <h1
            className="font-extrabold tracking-tight text-white mb-5"
            style={{ fontSize: "clamp(2.4rem, 6vw, 4.6rem)", lineHeight: 0.98, letterSpacing: "-0.045em" }}
          >
            Repricer <span className="text-gradient-neon">automático</span> para Amazon
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
            Ajusta tus precios en tiempo real para ganar la Buy Box y proteger tu margen, con reglas que tú
            controlas. Conecta tu cuenta de Amazon España y deja que el motor trabaje por ti.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard/repricer"
              className="inline-flex items-center justify-center rounded-xl bg-white text-[#0b0d1c] px-7 py-3 text-sm font-bold hover:bg-white/90 transition-colors"
            >
              Activar mi repricer
            </Link>
            <Link
              href="/politica-datos-amazon"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 text-white px-7 py-3 text-sm font-semibold hover:bg-white/[0.06] transition-colors"
            >
              Cómo protegemos tus datos
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-20">
        {/* Cómo funciona */}
        <section>
          <h2 className="text-2xl font-extrabold text-fg mb-2">Cómo funciona</h2>
          <p className="text-fg-muted mb-8">De cero a reprecio automático en tres pasos.</p>
          <div className="bg-bg-elevated rounded-2xl border border-border divide-y divide-border">
            {STEPS.map((step) => (
              <div key={step.n} className="flex gap-5 p-6 items-start">
                <span className="text-xs font-black text-[#4F46E5] bg-[#EEF2FF] rounded-lg px-2.5 py-1.5 flex-shrink-0 mt-0.5">
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
          <h2 className="text-2xl font-extrabold text-fg mb-2">Funciones</h2>
          <p className="text-fg-muted mb-8">Todo lo que necesitas para repreciar con control y seguridad.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-bg-elevated rounded-2xl border border-border p-6">
                <p className="font-bold text-fg mb-1.5">{f.title}</p>
                <p className="text-sm text-fg-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Para quién */}
        <section>
          <h2 className="text-2xl font-extrabold text-fg mb-2">¿Para quién es?</h2>
          <div className="bg-bg-elevated rounded-2xl border border-border p-6 space-y-3">
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
        <section className="text-center">
          <h2 className="text-2xl font-extrabold text-fg mb-3">Empieza hoy</h2>
          <p className="text-fg-muted mb-6 max-w-lg mx-auto">
            Conecta tu cuenta y prueba el reprecio en modo simulación antes de aplicar ningún cambio.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard/repricer"
              className="inline-flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Activar mi repricer
            </Link>
            <Link
              href="/ayuda"
              className="inline-flex items-center justify-center gap-2 bg-bg-elevated hover:bg-bg-subtle border border-border text-fg font-bold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Centro de ayuda
            </Link>
          </div>
          <p className="mt-6 text-xs text-fg-muted">
            Consulta nuestra{" "}
            <Link href="/politica-datos-amazon" className="text-[#4F46E5] hover:underline">
              Política de Datos de Amazon
            </Link>{" "}
            y los{" "}
            <Link href="/terminos" className="text-[#4F46E5] hover:underline">
              Términos del servicio
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
