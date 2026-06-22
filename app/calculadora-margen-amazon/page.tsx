import type { Metadata } from "next";
import Link from "next/link";
import { MargenCalculator } from "./MargenCalculator";

export const metadata: Metadata = {
  title: "Calculadora de margen y rentabilidad para Amazon FBA | Orvexia",
  description:
    "Calcula gratis tu margen neto, ROI y precio mínimo rentable en Amazon. Descuenta comisión, tarifa FBA e IVA y descubre el suelo de precio que nunca debes cruzar. Sin registro.",
  alternates: { canonical: "/calculadora-margen-amazon" },
  openGraph: {
    title: "Calculadora de margen para Amazon FBA — gratis y sin registro",
    description:
      "Beneficio neto, margen, ROI y tu precio mínimo rentable en segundos. El número que tu repricer debe defender.",
    type: "website",
  },
};

const FAQ = [
  {
    q: "¿Cómo se calcula el margen de un producto en Amazon?",
    a: "Partes del precio de venta (IVA incluido), le restas el IVA para obtener la base imponible y de ahí descuentas el coste del producto, la comisión por referencia de Amazon, la tarifa logística de FBA y cualquier otro coste (envío a Amazon, embalaje, devoluciones). Lo que queda es tu beneficio neto; el margen es ese beneficio dividido entre el precio de venta.",
  },
  {
    q: "¿Qué es el precio mínimo rentable o «suelo»?",
    a: "Es el precio más bajo al que puedes vender manteniendo el margen que te marques como objetivo. Por debajo de tu precio de equilibrio venderías directamente a pérdida. Conocer este número es clave: es el límite que configuras en un repricer para que automatice tus precios sin comerse tu rentabilidad.",
  },
  {
    q: "¿Cuál es la diferencia entre margen y ROI?",
    a: "El margen mide el beneficio sobre el precio de venta (cuánto te llevas de cada venta). El ROI mide el beneficio sobre tu inversión (cuánto rinde el dinero que pones para comprar el producto). Un producto barato puede tener poco margen pero un ROI altísimo, y por eso conviene mirar ambos.",
  },
  {
    q: "¿Por qué necesito un repricer si ya sé mi margen?",
    a: "Porque la competencia en Amazon cambia los precios constantemente y a mano es imposible seguirles el ritmo sin acabar vendiendo a pérdida o perdiendo la Buy Box. Un repricer ajusta tus precios en tiempo real dentro de los límites que tú fijas: usa el suelo que calculas aquí y nunca baja de ahí.",
  },
];

export default function CalculadoraMargenPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid-cyber opacity-50 pointer-events-none" />
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.22), transparent 65%)" }}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-3 h-7 rounded-full bg-white/[0.04] border border-white/[0.10] font-mono-ui">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] uppercase tracking-wider text-white/65">
              ▸ herramienta gratuita · sin registro
            </span>
          </div>
          <h1
            className="font-extrabold tracking-tight text-white mb-5"
            style={{ fontSize: "clamp(2.1rem, 5vw, 3.6rem)", lineHeight: 1.02, letterSpacing: "-0.04em" }}
          >
            Calculadora de <span className="text-gradient-neon">margen</span> para Amazon
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
            Descuenta comisión, tarifa FBA e IVA y descubre tu beneficio neto, tu ROI y el{" "}
            <strong className="text-white/80">precio mínimo rentable</strong> que nunca deberías cruzar.
          </p>
        </div>
      </section>

      {/* Calculadora */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <MargenCalculator />
        <p className="mt-6 text-center text-xs text-fg-subtle max-w-2xl mx-auto leading-relaxed">
          Cálculo orientativo para vendedores en España. Las tarifas reales de Amazon varían según
          categoría, peso y dimensiones; usa estos resultados como guía y contrasta con tu Seller Central.
        </p>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="text-2xl font-extrabold text-fg mb-6">Preguntas frecuentes</h2>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="bg-bg-elevated border border-border rounded-2xl p-6">
              <p className="font-bold text-fg mb-1.5">{item.q}</p>
              <p className="text-sm text-fg-muted leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 text-center">
        <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-500/10 to-bg-elevated p-8">
          <h2 className="text-2xl font-extrabold text-fg mb-3">
            Ya sabes tu suelo. Deja que se defienda solo.
          </h2>
          <p className="text-fg-muted mb-6 max-w-lg mx-auto leading-relaxed">
            El repricer de Orvexia ajusta tus precios en tiempo real para ganar la Buy Box sin bajar nunca
            del límite que acabas de calcular. SKUs ilimitados por una tarifa plana.
          </p>
          <Link
            href="/repricer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-7 py-3 text-sm font-bold transition-colors"
          >
            Probar el repricer gratis 14 días
          </Link>
          <p className="mt-4 text-xs text-fg-subtle">Luego 19 €/mes (IVA incl.) · cancela cuando quieras.</p>
        </div>
      </section>
    </main>
  );
}
