import Link from "next/link";
import Image from "next/image";
import type { GuideConfig } from "@/lib/guides/config";
import { GUIDES } from "@/lib/guides/config";
import type { Pick } from "@/lib/guides/picks";

const HINT_LABELS: Record<Pick["hint"], { badge: string; tone: string; bg: string; border: string }> = {
  best:    { badge: "🏆 Ganador general", tone: "#FBBF24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.35)" },
  value:   { badge: "💰 Calidad-precio",  tone: "#A3E635", bg: "rgba(163,230,53,0.10)", border: "rgba(163,230,53,0.35)" },
  cheap:   { badge: "🪙 Más barato",      tone: "#5EEAD4", bg: "rgba(94,234,212,0.10)", border: "rgba(94,234,212,0.35)" },
  premium: { badge: "👑 Premium",         tone: "#F0ABFC", bg: "rgba(240,171,252,0.10)", border: "rgba(240,171,252,0.35)" },
};

function formatEUR(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,00$/, "") + " €";
}

function todayHuman() {
  return new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function extractSpecLabels(name: string, regexes: RegExp[]): string[] {
  const out: string[] = [];
  for (const r of regexes) {
    const m = name.match(r);
    if (m) out.push(m[0]);
  }
  return out.slice(0, 3);
}

// Genera 2-3 pros y 1-2 contras por pick basado en hint, rating y descuento
function prosCons(p: Pick) {
  const pros: string[] = [];
  const cons: string[] = [];
  const o = p.product.bestOffer;

  if (p.hint === "best") pros.push("Mejor balance global de precio, rating y disponibilidad ahora");
  if (p.hint === "value") pros.push("Lo que más vendemos en su rango de precio");
  if (p.hint === "cheap") pros.push("Precio más bajo entre los que tienen stock real");
  if (p.hint === "premium") pros.push("Lo mejor de su categoría disponible ahora mismo");

  if ((p.product.rating ?? 0) >= 4.5) pros.push(`Valoración media ${p.product.rating}/5 de usuarios reales`);
  else if ((p.product.rating ?? 0) >= 4.0) pros.push(`Buena valoración (${p.product.rating}/5) de la comunidad`);

  if (o.discountPercent && o.discountPercent >= 10) pros.push(`Rebajado un ${o.discountPercent}% sobre PVP recomendado`);

  if (p.hint === "premium") cons.push("Precio elevado, no para todos los presupuestos");
  if (p.hint === "cheap") cons.push("Acabados ajustados al precio: sin extras");
  if (p.hint === "value") cons.push("No es el más barato si te importa solo el precio");
  if (cons.length === 0) cons.push("Stock limitado: el precio puede subir en cualquier momento");

  return { pros: pros.slice(0, 3), cons: cons.slice(0, 2) };
}

// ── JSON-LD ─────────────────────────────────────────────────────────────────
function FaqJsonLd({ faqs }: { faqs: GuideConfig["faqs"] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

function ItemListJsonLd({ picks, label, slug }: { picks: Pick[]; label: string; slug: string }) {
  if (picks.length === 0) return null;
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Mejor ${label.toLowerCase()} 2026`,
    itemListElement: picks.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `/productos/${p.product.slug}`,
      name: p.product.name,
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function PickCard({ pick, config, featured = false }: { pick: Pick; config: GuideConfig; featured?: boolean }) {
  const meta = HINT_LABELS[pick.hint];
  const o = pick.product.bestOffer;
  const specs = extractSpecLabels(pick.product.name, config.specRegex);
  const { pros, cons } = prosCons(pick);

  return (
    <div
      className={`relative bg-bg-elevated rounded-3xl border overflow-hidden flex flex-col transition-all hover:-translate-y-0.5`}
      style={{
        borderColor: meta.border,
        boxShadow: featured
          ? `0 0 32px -8px ${config.color}80, 0 0 0 2px ${config.color}55`
          : `0 0 18px -6px ${meta.tone}33`,
      }}
    >
      {/* Badge */}
      <div
        className="absolute top-3 left-3 z-10 font-mono-ui text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-sm"
        style={{ background: meta.bg, color: meta.tone, border: `1px solid ${meta.border}` }}
      >
        {meta.badge}
      </div>

      {/* Discount tag */}
      {o.discountPercent && o.discountPercent >= 5 && (
        <div
          className="absolute top-3 right-3 z-10 font-mono-ui text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm"
          style={{
            background: "rgba(5,6,15,0.92)",
            color: "#A3E635",
            border: "1px solid rgba(163,230,53,0.4)",
            boxShadow: "0 0 12px -2px rgba(163,230,53,0.4)",
          }}
        >
          -{o.discountPercent}%
        </div>
      )}

      {/* Image */}
      <Link href={`/productos/${pick.product.slug}`} className="block aspect-[4/3] bg-white relative overflow-hidden">
        {pick.product.image ? (
          <Image
            src={pick.product.image}
            alt={pick.product.name}
            fill
            className="object-contain p-6"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-7xl opacity-20">{config.emoji}</span>
        )}
      </Link>

      {/* Body */}
      <div className="flex-1 flex flex-col gap-3 p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: config.color }}>
            {pick.product.brand}
          </p>
          <Link href={`/productos/${pick.product.slug}`}>
            <h3 className="font-extrabold text-[15px] leading-snug text-fg line-clamp-2 hover:underline">
              {pick.product.name}
            </h3>
          </Link>
        </div>

        {/* Rating */}
        {pick.product.rating !== null && (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} width="12" height="12" viewBox="0 0 24 24" className="shrink-0">
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill={s <= Math.round(pick.product.rating!) ? "var(--warn-500)" : "var(--border)"}
                  />
                </svg>
              ))}
            </div>
            <span className="text-fg font-bold">{pick.product.rating.toFixed(1)}</span>
            {pick.product.reviewCount && pick.product.reviewCount > 0 && (
              <span className="text-fg-subtle">({pick.product.reviewCount} {pick.product.reviewCount === 1 ? "reseña" : "reseñas"})</span>
            )}
          </div>
        )}

        {/* Specs chips */}
        {specs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {specs.map((s) => (
              <span key={s} className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ background: config.bgLight, color: config.color, border: `1px solid ${config.borderLight}` }}>
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Pros / Cons */}
        <div className="space-y-1.5 text-[12px] leading-relaxed">
          {pros.map((p) => (
            <p key={p} className="flex gap-1.5 text-fg-muted"><span className="text-emerald-600 mt-px">✓</span>{p}</p>
          ))}
          {cons.map((c) => (
            <p key={c} className="flex gap-1.5 text-fg-subtle"><span className="text-fg-subtle mt-px">·</span>{c}</p>
          ))}
        </div>

        {/* Price + CTA */}
        <div className="mt-auto pt-3 border-t border-border-subtle">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-black text-fg tabular-nums">{formatEUR(o.priceCurrent)}</span>
            {o.priceOld && o.priceOld > o.priceCurrent && (
              <span className="text-xs text-fg-subtle line-through tabular-nums">{formatEUR(o.priceOld)}</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <a
              href={o.externalUrl}
              target="_blank"
              rel="nofollow sponsored noopener"
              className="text-center font-bold px-4 py-2.5 rounded-xl text-sm transition-transform active:scale-[0.98]"
              style={{ background: config.color, color: "#fff", boxShadow: `0 4px 14px ${config.color}40` }}
            >
              Ver oferta en {o.store} →
            </a>
            <Link
              href={`/productos/${pick.product.slug}`}
              className="text-center text-xs font-semibold text-fg-muted hover:text-fg transition-colors"
            >
              Ver análisis completo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

export default function BuyersGuide({ config, picks }: { config: GuideConfig; picks: Pick[] }) {
  const otherGuides = []; // Internal links computed below

  return (
    <main className="min-h-screen">
      <FaqJsonLd faqs={config.faqs} />
      <ItemListJsonLd picks={picks} label={config.label} slug={config.slug} />

      {/* HERO */}
      <section className="relative overflow-hidden pt-14 pb-24 px-5"
        style={{ backgroundImage: `linear-gradient(135deg, ${config.colorDark} 0%, ${config.color} 100%)` }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-15 blur-3xl"
            style={{ background: config.color }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10 blur-3xl"
            style={{ background: config.colorDark }} />
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-white/40 mb-7">
            <Link href="/" className="hover:text-white/70 transition-colors">Inicio</Link>
            <span>›</span>
            <Link href="/guias" className="hover:text-white/70 transition-colors">Guías</Link>
            <span>›</span>
            <span className="text-white/60">{config.labelPlural}</span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="bg-white/15 backdrop-blur text-white text-[11px] font-bold px-2.5 py-1 rounded-full">Guía 2026</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/60 text-xs">{picks.length > 0 ? `${picks.length} ganadores con datos reales` : "En análisis"}</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/60 text-xs">Actualizado {todayHuman()}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight">
                Mejor {config.label.toLowerCase()} 2026 {config.emoji}
              </h1>
              <p className="text-white/70 text-base leading-relaxed max-w-xl mb-7">
                {config.heroSub}
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  ["#veredicto",   "Veredicto"],
                  ["#tabla",       "Tabla comparativa"],
                  ["#para-quien",  "Para quién"],
                  ["#presupuestos","Presupuestos"],
                  ["#criterios",   "Cómo elegir"],
                  ["#errores",     "Errores comunes"],
                  ["#marcas",      "Marcas"],
                  ["#cuando",      "Cuándo comprar"],
                  ["#glosario",    "Glosario"],
                  ["#preguntas",   "FAQ"],
                ].map(([href, label]) => (
                  <a key={href} href={href}
                    className="text-xs font-semibold text-white/80 bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors">
                    {label}
                  </a>
                ))}
              </div>
            </div>
            <div className="hidden lg:flex w-44 h-44 rounded-3xl items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <span className="text-8xl">{config.emoji}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-5 py-14 space-y-20">

        {/* INTRO */}
        <section className="bg-bg-elevated rounded-3xl border border-border p-7 sm:p-9 shadow-sm">
          {config.intro.map((p, i) => (
            <p key={i} className={`text-fg text-[15px] leading-relaxed ${i > 0 ? "mt-4" : ""}`}
              dangerouslySetInnerHTML={{ __html: p }} />
          ))}
        </section>

        {/* VEREDICTO RÁPIDO */}
        <section id="veredicto">
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: config.color }}>
              Veredicto rápido
            </p>
            <h2 className="text-3xl font-extrabold text-fg mb-2">Los 4 ganadores ahora mismo</h2>
            <p className="text-fg-muted text-sm">
              Calculados a partir de precio actual, valoraciones reales y stock disponible. Se actualizan en cada visita.
            </p>
          </div>

          {picks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {picks.map((p) => (
                <PickCard key={p.product.id} pick={p} config={config} featured={p.hint === "best"} />
              ))}
            </div>
          ) : (
            <div className="bg-bg-elevated rounded-3xl border border-border p-10 text-center">
              <span className="text-5xl mb-3 block opacity-30">{config.emoji}</span>
              <p className="text-sm text-fg-muted">Todavía no hay suficientes modelos en stock. Vuelve pronto.</p>
            </div>
          )}
        </section>

        {/* TABLA COMPARATIVA */}
        {picks.length > 1 && (
          <section id="tabla">
            <div className="mb-6">
              <p className="font-mono-ui text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: config.color }}>
                ▸ /compare · directa
              </p>
              <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Tabla cara a cara</h2>
              <p className="text-white/55 text-sm">Características clave una al lado de la otra.</p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-bg-elevated relative">
              {/* subtle accent line at top */}
              <span aria-hidden className="absolute left-0 right-0 top-0 h-px" style={{
                background: `linear-gradient(90deg, transparent, ${config.color}66, transparent)`,
              }} />
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]" style={{ background: "rgba(255,255,255,0.025)" }}>
                    <th className="text-left p-4 font-mono-ui text-[10px] font-bold uppercase tracking-wider text-white/45">Modelo</th>
                    {picks.map((p) => {
                      const meta = HINT_LABELS[p.hint];
                      return (
                        <th key={p.product.id} className="text-center p-4 min-w-[180px]">
                          <span className="inline-flex items-center font-mono-ui text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border"
                            style={{ background: meta.bg, color: meta.tone, borderColor: meta.border }}>
                            {meta.badge}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/[0.06]">
                    <td className="p-4 font-mono-ui text-[10px] uppercase tracking-wider text-white/45">Producto</td>
                    {picks.map((p) => (
                      <td key={p.product.id} className="p-4 text-center">
                        <p className="font-bold text-[13px] text-white leading-tight" style={{ color: config.color }}>{p.product.brand}</p>
                        <Link href={`/productos/${p.product.slug}`} className="text-[12px] text-white/65 hover:text-white hover:underline line-clamp-2 mt-1 inline-block">
                          {p.product.name}
                        </Link>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-white/[0.06]" style={{ background: "rgba(255,255,255,0.018)" }}>
                    <td className="p-4 font-mono-ui text-[10px] uppercase tracking-wider text-white/45">Precio</td>
                    {picks.map((p) => (
                      <td key={p.product.id} className="p-4 text-center">
                        <p className="font-extrabold text-lg text-white tabular-nums">{formatEUR(p.product.bestOffer.priceCurrent)}</p>
                        {p.product.bestOffer.priceOld && p.product.bestOffer.priceOld > p.product.bestOffer.priceCurrent && (
                          <p className="text-[11px] text-white/40 line-through tabular-nums mt-0.5">{formatEUR(p.product.bestOffer.priceOld)}</p>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-white/[0.06]">
                    <td className="p-4 font-mono-ui text-[10px] uppercase tracking-wider text-white/45">Tienda</td>
                    {picks.map((p) => (
                      <td key={p.product.id} className="p-4 text-center text-[13px] text-white/85">{p.product.bestOffer.store}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-white/[0.06]" style={{ background: "rgba(255,255,255,0.018)" }}>
                    <td className="p-4 font-mono-ui text-[10px] uppercase tracking-wider text-white/45">Valoración</td>
                    {picks.map((p) => (
                      <td key={p.product.id} className="p-4 text-center">
                        {p.product.rating !== null ? (
                          <span className="inline-flex items-center gap-1 text-[13px] text-white/90">
                            <span className="text-amber-300">★</span>
                            <span className="font-bold tabular-nums">{p.product.rating.toFixed(1)}</span>
                            <span className="text-white/40">/ 5</span>
                          </span>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-white/[0.06]">
                    <td className="p-4 font-mono-ui text-[10px] uppercase tracking-wider text-white/45">Especificaciones</td>
                    {picks.map((p) => {
                      const specs = extractSpecLabels(p.product.name, config.specRegex);
                      return (
                        <td key={p.product.id} className="p-4 text-center">
                          {specs.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {specs.map((s) => (
                                <span key={s} className="font-mono-ui text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md"
                                  style={{ background: `${config.color}14`, color: config.color, border: `1px solid ${config.color}30` }}>
                                  {s}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="p-4"></td>
                    {picks.map((p) => (
                      <td key={p.product.id} className="p-4 text-center">
                        <a
                          href={p.product.bestOffer.externalUrl}
                          target="_blank"
                          rel="nofollow sponsored noopener"
                          className="inline-flex items-center gap-1.5 font-bold px-4 py-2 rounded-xl text-xs transition-transform hover:-translate-y-0.5"
                          style={{
                            background: `${config.color}1A`,
                            color: config.color,
                            border: `1px solid ${config.color}55`,
                            boxShadow: `0 0 16px -4px ${config.color}55`,
                          }}
                        >
                          Ver oferta →
                        </a>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* PARA QUIÉN */}
        {picks.length > 0 && (
          <section id="para-quien">
            <div className="mb-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: config.color }}>
                ¿Cuál te conviene?
              </p>
              <h2 className="text-3xl font-extrabold text-fg mb-2">Para quién es cada uno</h2>
              <p className="text-fg-muted text-sm">Elige según tu caso, no según el ranking.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {config.paraQuien.map((pq) => {
                const matchedPick = picks.find((p) => p.hint === pq.pickHint);
                return (
                  <div key={pq.title} className="bg-bg-elevated rounded-3xl border border-border p-6 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                        style={{ background: config.bgLight, border: `1px solid ${config.borderLight}` }}>
                        {pq.icon}
                      </div>
                      <h3 className="text-[15px] font-extrabold text-fg">{pq.title}</h3>
                    </div>
                    <p className="text-[13px] text-fg-muted leading-relaxed">{pq.desc}</p>
                    {matchedPick && (
                      <div className="mt-2 pt-3 border-t border-border-subtle flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/productos/${matchedPick.product.slug}`} className="text-[12px] font-bold text-fg hover:underline line-clamp-1 block">
                            {matchedPick.product.brand} · {matchedPick.product.name}
                          </Link>
                          <p className="text-[11px] text-fg-muted mt-0.5">
                            <span className="font-bold tabular-nums">{formatEUR(matchedPick.product.bestOffer.priceCurrent)}</span> · {matchedPick.product.bestOffer.store}
                          </p>
                        </div>
                        <a
                          href={matchedPick.product.bestOffer.externalUrl}
                          target="_blank"
                          rel="nofollow sponsored noopener"
                          className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                          style={{ background: config.color, color: "#fff" }}
                        >
                          Ver oferta →
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TIPOS */}
        <section id="tipos">
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: config.color }}>
              Antes de comprar
            </p>
            <h2 className="text-3xl font-extrabold text-fg mb-2">Tipos de {config.label.toLowerCase()}</h2>
            <p className="text-fg-muted text-sm">El formato condiciona el espacio, el uso y el precio.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {config.tipos.map((t) => (
              <div key={t.title} className="rounded-3xl border p-6 flex flex-col gap-4"
                style={{ backgroundColor: t.bg, borderColor: t.border }}>
                <div>
                  <span className="text-2xl">{t.emoji}</span>
                  <h3 className="font-extrabold text-fg mt-2 text-base">{t.title}</h3>
                  <p className="text-xs font-medium mt-1" style={{ color: t.color }}>Ideal para: {t.ideal}</p>
                </div>
                <div className="space-y-3 text-xs">
                  {t.pros.length > 0 && (
                    <div>
                      <p className="font-bold text-emerald-700 mb-1.5">✓ Ventajas</p>
                      <ul className="space-y-1 text-fg-muted">
                        {t.pros.map((p) => <li key={p} className="flex gap-1.5"><span className="text-emerald-600 mt-px">·</span>{p}</li>)}
                      </ul>
                    </div>
                  )}
                  {t.cons.length > 0 && (
                    <div className="pt-2 border-t" style={{ borderColor: t.border }}>
                      <p className="font-bold text-red-500 mb-1.5">✗ Inconvenientes</p>
                      <ul className="space-y-1 text-fg-muted">
                        {t.cons.map((c) => <li key={c} className="flex gap-1.5"><span className="text-red-400 mt-px">·</span>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CRITERIOS */}
        <section id="criterios">
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: config.color }}>
              Cómo elegir
            </p>
            <h2 className="text-3xl font-extrabold text-fg mb-2">{config.criterios.length} criterios que importan</h2>
            <p className="text-fg-muted text-sm">Las cosas que sí marcan diferencia en el día a día.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {config.criterios.map((c, i) => (
              <div key={c.title} className="bg-bg-elevated rounded-2xl border border-border p-5 flex gap-4 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl"
                  style={{ background: config.bgLight, border: `1px solid ${config.borderLight}` }}>
                  {c.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: config.bgLight, color: config.color }}>
                      #{i + 1}
                    </span>
                    <h3 className="font-bold text-fg text-sm">{c.title}</h3>
                  </div>
                  <p className="text-xs text-fg-muted leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PRESUPUESTOS */}
        {config.presupuestos && config.presupuestos.length > 0 && (
          <section id="presupuestos">
            <div className="mb-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: config.color }}>
                Cuánto invertir
              </p>
              <h2 className="text-3xl font-extrabold text-fg mb-2">Qué esperar por rango de precio</h2>
              <p className="text-fg-muted text-sm">
                Aquí no hay magia: si el presupuesto sube, sube la calidad real. Estos son los tramos que valen la pena.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {config.presupuestos.map((p, i) => (
                <div key={p.rango} className="bg-bg-elevated rounded-3xl border border-border p-6 flex flex-col gap-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${config.color}, ${config.colorDark})`, opacity: (i + 1) / 4 }} />
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: config.color }}>#{i + 1}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">{p.etiqueta}</span>
                  </div>
                  <p className="text-2xl font-extrabold text-fg tabular-nums leading-none">{p.rango}</p>
                  <p className="text-[13px] text-fg-muted leading-relaxed flex-1">{p.desc}</p>
                  <p className="text-[11px] text-fg-subtle italic mt-1 pt-3 border-t border-border-subtle">
                    Ideal: {p.ejemplo}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ERRORES COMUNES */}
        {config.errores && config.errores.length > 0 && (
          <section id="errores">
            <div className="mb-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: config.color }}>
                Lo que NO hacer
              </p>
              <h2 className="text-3xl font-extrabold text-fg mb-2">Errores típicos al elegir</h2>
              <p className="text-fg-muted text-sm">
                Las 5 trampas más comunes que hacen que la gente se arrepienta a los pocos meses.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {config.errores.map((e, i) => (
                <div key={e.title} className="bg-bg-elevated rounded-2xl border-2 border-dashed p-5 flex gap-4"
                  style={{ borderColor: "rgba(239,68,68,0.25)" }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl bg-red-500/10 border border-red-500/25">
                    {e.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Error #{i + 1}</span>
                    </div>
                    <h3 className="font-bold text-fg text-sm mb-1">{e.title}</h3>
                    <p className="text-xs text-fg-muted leading-relaxed">{e.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* MARCAS RECOMENDADAS */}
        {config.marcas && config.marcas.length > 0 && (
          <section id="marcas">
            <div className="mb-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: config.color }}>
                Por marca
              </p>
              <h2 className="text-3xl font-extrabold text-fg mb-2">Las marcas que de verdad importan</h2>
              <p className="text-fg-muted text-sm">
                Cada marca tiene su punto fuerte y su talón de Aquiles. Esto es lo que vale por marca en 2026.
              </p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-bg-elevated relative">
              <span aria-hidden className="absolute left-0 right-0 top-0 h-px" style={{
                background: `linear-gradient(90deg, transparent, ${config.color}66, transparent)`,
              }} />
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]" style={{ background: "rgba(255,255,255,0.025)" }}>
                    <th className="text-left p-4 font-mono-ui text-[10px] font-bold uppercase tracking-wider text-white/55 min-w-[140px]">Marca</th>
                    <th className="text-left p-4 font-mono-ui text-[10px] font-bold uppercase tracking-wider text-emerald-300 min-w-[200px]">✓ Fuerte en</th>
                    <th className="text-left p-4 font-mono-ui text-[10px] font-bold uppercase tracking-wider text-amber-300 min-w-[200px]">⚠ Punto débil</th>
                    <th className="text-left p-4 font-mono-ui text-[10px] font-bold uppercase tracking-wider" style={{ color: config.color }}>★ Ideal para</th>
                  </tr>
                </thead>
                <tbody>
                  {config.marcas.map((m, i) => (
                    <tr key={m.name} className="border-b border-white/[0.06] hover:bg-white/[0.025] transition-colors"
                        style={i % 2 === 1 ? { background: "rgba(255,255,255,0.018)" } : {}}>
                      <td className="p-4 font-extrabold whitespace-nowrap" style={{ color: config.color }}>{m.name}</td>
                      <td className="p-4 text-[13px] text-white/75 leading-snug">{m.strong}</td>
                      <td className="p-4 text-[13px] text-white/75 leading-snug">{m.weak ?? <span className="text-white/30">—</span>}</td>
                      <td className="p-4 text-[13px] text-white/75 leading-snug italic">{m.ideal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* CUÁNDO COMPRAR */}
        {config.cuandoComprar && config.cuandoComprar.length > 0 && (
          <section id="cuando">
            <div className="mb-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: config.color }}>
                Estrategia de compra
              </p>
              <h2 className="text-3xl font-extrabold text-fg mb-2">Cuándo se compra más barato</h2>
              <p className="text-fg-muted text-sm">
                Comprar el día correcto puede ahorrarte entre <strong>15% y 40%</strong> del precio. El calendario importa.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {config.cuandoComprar.map((p, i) => {
                const isBest = i === 0;
                return (
                  <div key={p.mes} className={`relative rounded-3xl p-5 flex flex-col gap-2.5 ${isBest ? "" : "bg-bg-elevated border border-border"}`}
                    style={isBest ? { background: `linear-gradient(135deg, ${config.color}, ${config.colorDark})`, color: "#fff" } : {}}>
                    {isBest && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur px-2 py-0.5 rounded-full">
                        ⭐ Mejor momento
                      </span>
                    )}
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${isBest ? "text-white/70" : ""}`} style={!isBest ? { color: config.color } : {}}>
                      {p.mes}
                    </p>
                    <p className={`text-3xl font-black tabular-nums ${isBest ? "text-white" : "text-fg"}`}>
                      {p.descuento}
                    </p>
                    <p className={`text-[12px] leading-relaxed ${isBest ? "text-white/85" : "text-fg-muted"}`}>
                      {p.nota}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* GLOSARIO */}
        {config.glosario && config.glosario.length > 0 && (
          <section id="glosario">
            <div className="mb-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: config.color }}>
                Jerga decodificada
              </p>
              <h2 className="text-3xl font-extrabold text-fg mb-2">Glosario técnico</h2>
              <p className="text-fg-muted text-sm">
                Los términos que verás en cualquier ficha técnica, explicados en una línea.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {config.glosario.map((t) => (
                <div key={t.term} className="bg-bg-elevated rounded-xl border border-border p-4 flex flex-col gap-1">
                  <p className="text-[13px] font-extrabold" style={{ color: config.color }}>
                    {t.term}
                  </p>
                  <p className="text-[13px] text-fg-muted leading-relaxed">{t.def}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section id="preguntas">
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: config.color }}>
              FAQ
            </p>
            <h2 className="text-3xl font-extrabold text-fg">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {config.faqs.map((f, i) => (
              <details key={f.q} className="group bg-bg-elevated rounded-2xl border border-border overflow-hidden hover:shadow-sm open:shadow-sm transition-shadow">
                <summary className="flex items-center gap-4 p-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="text-[11px] font-bold tabular-nums w-6 shrink-0"
                    style={{ color: config.color }}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-bold text-fg text-[14px] flex-1 leading-snug">{f.q}</span>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-open:rotate-180"
                    style={{ background: config.bgLight, color: config.color }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </summary>
                <div className="px-5 pb-5 pl-[3.25rem] text-[13px] text-fg-muted leading-relaxed">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* OTRAS GUÍAS — CROSS LINKS */}
        {(() => {
          const others = GUIDES.filter((g) => g.slug !== config.slug).slice(0, 6);
          return (
            <section id="otras-guias">
              <div className="mb-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: config.color }}>
                  ¿Renovando varios electrodomésticos?
                </p>
                <h2 className="text-3xl font-extrabold text-fg mb-2">Otras guías de compra</h2>
                <p className="text-fg-muted text-sm">Mismas reglas: ganadores con datos reales y precios actualizados al momento.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {others.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/guias/mejor-${g.slug}`}
                    className="group flex flex-col items-center gap-2 bg-bg-elevated rounded-2xl border border-border p-4 hover:-translate-y-0.5 hover:shadow-md transition-all"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ background: g.bgLight, border: `1px solid ${g.borderLight}` }}
                    >
                      {g.emoji}
                    </div>
                    <span className="text-[12px] font-bold text-center leading-tight text-fg group-hover:text-fg-strong">
                      {g.label}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })()}

        {/* CTA */}
        <section className="relative overflow-hidden rounded-3xl p-9 sm:p-12"
          style={{ backgroundImage: `linear-gradient(135deg, ${config.colorDark}, ${config.color})` }}>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 blur-xl" />
          </div>
          <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <span className="text-3xl mb-2 block">{config.emoji}</span>
              <h3 className="text-2xl font-extrabold text-white mb-2 leading-tight">¿Quieres ver más modelos?</h3>
              <p className="text-white/70 text-sm max-w-md">
                Explora todos los {config.labelPlural.toLowerCase()} con precios actualizados o consulta otras guías.
              </p>
            </div>
            <div className="flex flex-wrap lg:flex-nowrap gap-3">
              <Link href={`/categorias/${config.category.toLowerCase()}`}
                className="bg-bg-elevated font-bold px-6 py-3 rounded-2xl text-sm hover:bg-white/90 transition-colors whitespace-nowrap"
                style={{ color: config.color }}>
                Ver todos los {config.labelPlural.toLowerCase()}
              </Link>
              <Link href="/guias"
                className="bg-white/10 backdrop-blur border border-white/20 text-white font-semibold px-6 py-3 rounded-2xl text-sm hover:bg-white/20 transition-colors whitespace-nowrap">
                Más guías
              </Link>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
