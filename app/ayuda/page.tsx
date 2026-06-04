import type { Metadata } from "next";
import Link from "next/link";

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
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid-cyber opacity-50 pointer-events-none" />
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] rounded-full halo-breathe pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(94,234,212,0.20), transparent 65%)" }}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-14 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-3 h-7 rounded-full bg-white/[0.04] border border-white/[0.10] font-mono-ui">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-[10px] uppercase tracking-wider text-white/65">▸ /ayuda · soporte</span>
          </div>
          <h1
            className="font-extrabold tracking-tight text-white mb-5"
            style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)", lineHeight: 1, letterSpacing: "-0.04em" }}
          >
            Centro de <span className="text-gradient-neon">ayuda</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
            Resolvemos tus dudas sobre Orvexia Repricer. Si no encuentras lo que buscas, escríbenos.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-14 space-y-14">
        {/* Contacto */}
        <section className="bg-bg-elevated rounded-2xl border border-border p-6 sm:p-8 text-center">
          <h2 className="text-xl font-extrabold text-fg mb-2">Contacta con soporte</h2>
          <p className="text-sm text-fg-muted mb-5 max-w-md mx-auto leading-relaxed">
            Atendemos por correo electrónico. Te respondemos lo antes posible, normalmente en menos de 48
            horas hábiles.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            {SUPPORT_EMAIL}
          </a>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-extrabold text-fg mb-6">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group bg-bg-elevated rounded-2xl border border-border p-5 open:pb-6"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-fg">
                  {item.q}
                  <span className="text-fg-muted transition-transform group-open:rotate-45 text-xl leading-none">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-fg-muted leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Enlaces legales */}
        <section className="text-center">
          <p className="text-sm text-fg-muted">
            Más información en{" "}
            <Link href="/politica-datos-amazon" className="text-[#4F46E5] hover:underline">
              Política de Datos de Amazon
            </Link>
            ,{" "}
            <Link href="/politica-privacidad" className="text-[#4F46E5] hover:underline">
              Privacidad
            </Link>{" "}
            y{" "}
            <Link href="/terminos" className="text-[#4F46E5] hover:underline">
              Términos
            </Link>
            .
          </p>
          <p className="mt-4">
            <Link href="/repricer" className="text-sm font-semibold text-fg hover:underline">
              ← Volver a Orvexia Repricer
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
