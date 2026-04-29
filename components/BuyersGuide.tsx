import Link from "next/link";
import Image from "next/image";
import type { GuideConfig } from "@/lib/guides/config";
import type { Pick } from "@/lib/guides/picks";

const HINT_LABELS: Record<Pick["hint"], { badge: string; tone: string; bg: string; border: string }> = {
  best:    { badge: "🏆 Ganador general", tone: "#0F172A", bg: "#FAFAF9", border: "#E2E8F0" },
  value:   { badge: "💰 Calidad-precio",  tone: "#15803D", bg: "#F0FDF4", border: "#BBF7D0" },
  cheap:   { badge: "🪙 Más barato",      tone: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" },
  premium: { badge: "👑 Premium",         tone: "#B45309", bg: "#FFFBEB", border: "#FDE68A" },
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
      className={`relative bg-white rounded-3xl border overflow-hidden flex flex-col ${featured ? "ring-2 ring-offset-2" : ""}`}
      style={{
        borderColor: meta.border,
        ...(featured ? { ["--tw-ring-color" as any]: config.color } : {}),
      }}
    >
      {/* Badge */}
      <div
        className="absolute top-3 left-3 z-10 text-[11px] font-bold px-2.5 py-1 rounded-full"
        style={{ background: meta.bg, color: meta.tone, border: `1px solid ${meta.border}` }}
      >
        {meta.badge}
      </div>

      {/* Discount tag */}
      {o.discountPercent && o.discountPercent >= 5 && (
        <div className="absolute top-3 right-3 z-10 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#EF4444] text-white">
          -{o.discountPercent}%
        </div>
      )}

      {/* Image */}
      <Link href={`/productos/${pick.product.slug}`} className="block aspect-[4/3] bg-[#F8FAFC] relative overflow-hidden">
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
            <h3 className="font-extrabold text-[15px] leading-snug text-[#0F172A] line-clamp-2 hover:underline">
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
                    fill={s <= Math.round(pick.product.rating!) ? "#F59E0B" : "#E2E8F0"}
                  />
                </svg>
              ))}
            </div>
            <span className="text-[#0F172A] font-bold">{pick.product.rating.toFixed(1)}</span>
            {pick.product.reviewCount && pick.product.reviewCount > 0 && (
              <span className="text-[#94A3B8]">({pick.product.reviewCount} {pick.product.reviewCount === 1 ? "reseña" : "reseñas"})</span>
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
            <p key={p} className="flex gap-1.5 text-[#475569]"><span className="text-emerald-600 mt-px">✓</span>{p}</p>
          ))}
          {cons.map((c) => (
            <p key={c} className="flex gap-1.5 text-[#94A3B8]"><span className="text-[#94A3B8] mt-px">·</span>{c}</p>
          ))}
        </div>

        {/* Price + CTA */}
        <div className="mt-auto pt-3 border-t border-[#F1F5F9]">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-black text-[#0F172A] tabular-nums">{formatEUR(o.priceCurrent)}</span>
            {o.priceOld && o.priceOld > o.priceCurrent && (
              <span className="text-xs text-[#94A3B8] line-through tabular-nums">{formatEUR(o.priceOld)}</span>
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
              className="text-center text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors"
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
    <main className="min-h-screen bg-[#F8FAFC]">
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
                  ["#veredicto", "Veredicto"],
                  ["#tabla",     "Tabla comparativa"],
                  ["#para-quien","Para quién"],
                  ["#criterios", "Cómo elegir"],
                  ["#preguntas", "FAQ"],
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
        <section className="bg-white rounded-3xl border border-[#E2E8F0] p-7 sm:p-9 shadow-sm">
          {config.intro.map((p, i) => (
            <p key={i} className={`text-[#334155] text-[15px] leading-relaxed ${i > 0 ? "mt-4" : ""}`}
              dangerouslySetInnerHTML={{ __html: p }} />
          ))}
        </section>

        {/* VEREDICTO RÁPIDO */}
        <section id="veredicto">
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: config.color }}>
              Veredicto rápido
            </p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">Los 4 ganadores ahora mismo</h2>
            <p className="text-[#64748B] text-sm">
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
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-10 text-center">
              <span className="text-5xl mb-3 block opacity-30">{config.emoji}</span>
              <p className="text-sm text-[#64748B]">Todavía no hay suficientes modelos en stock. Vuelve pronto.</p>
            </div>
          )}
        </section>

        {/* TABLA COMPARATIVA */}
        {picks.length > 1 && (
          <section id="tabla">
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: config.color }}>
                Comparativa directa
              </p>
              <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">Tabla cara a cara</h2>
              <p className="text-[#64748B] text-sm">Características clave una al lado de la otra.</p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="text-left p-4 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Modelo</th>
                    {picks.map((p) => (
                      <th key={p.product.id} className="text-center p-4 text-[11px] font-bold uppercase tracking-wider text-[#0F172A] min-w-[180px]">
                        {HINT_LABELS[p.hint].badge}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#F1F5F9]">
                    <td className="p-4 font-semibold text-[#64748B]">Producto</td>
                    {picks.map((p) => (
                      <td key={p.product.id} className="p-4 text-center">
                        <p className="font-semibold text-[13px] text-[#0F172A] leading-tight">{p.product.brand}</p>
                        <Link href={`/productos/${p.product.slug}`} className="text-[12px] text-[#64748B] hover:underline line-clamp-2">{p.product.name}</Link>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-[#F1F5F9] bg-[#FAFAF9]">
                    <td className="p-4 font-semibold text-[#64748B]">Precio</td>
                    {picks.map((p) => (
                      <td key={p.product.id} className="p-4 text-center">
                        <p className="font-extrabold text-base text-[#0F172A] tabular-nums">{formatEUR(p.product.bestOffer.priceCurrent)}</p>
                        {p.product.bestOffer.priceOld && p.product.bestOffer.priceOld > p.product.bestOffer.priceCurrent && (
                          <p className="text-[11px] text-[#94A3B8] line-through tabular-nums">{formatEUR(p.product.bestOffer.priceOld)}</p>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-[#F1F5F9]">
                    <td className="p-4 font-semibold text-[#64748B]">Tienda</td>
                    {picks.map((p) => (
                      <td key={p.product.id} className="p-4 text-center text-[13px] text-[#0F172A]">{p.product.bestOffer.store}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-[#F1F5F9] bg-[#FAFAF9]">
                    <td className="p-4 font-semibold text-[#64748B]">Valoración</td>
                    {picks.map((p) => (
                      <td key={p.product.id} className="p-4 text-center text-[13px] text-[#0F172A]">
                        {p.product.rating !== null ? `${p.product.rating.toFixed(1)} / 5` : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-[#F1F5F9]">
                    <td className="p-4 font-semibold text-[#64748B]">Especificaciones</td>
                    {picks.map((p) => (
                      <td key={p.product.id} className="p-4 text-center text-[12px] text-[#475569]">
                        {extractSpecLabels(p.product.name, config.specRegex).join(" · ") || "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-[#64748B]"></td>
                    {picks.map((p) => (
                      <td key={p.product.id} className="p-4 text-center">
                        <a
                          href={p.product.bestOffer.externalUrl}
                          target="_blank"
                          rel="nofollow sponsored noopener"
                          className="inline-block font-bold px-4 py-2 rounded-xl text-xs"
                          style={{ background: config.color, color: "#fff" }}
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
              <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">Para quién es cada uno</h2>
              <p className="text-[#64748B] text-sm">Elige según tu caso, no según el ranking.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {config.paraQuien.map((pq) => {
                const matchedPick = picks.find((p) => p.hint === pq.pickHint);
                return (
                  <div key={pq.title} className="bg-white rounded-3xl border border-[#E2E8F0] p-6 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                        style={{ background: config.bgLight, border: `1px solid ${config.borderLight}` }}>
                        {pq.icon}
                      </div>
                      <h3 className="text-[15px] font-extrabold text-[#0F172A]">{pq.title}</h3>
                    </div>
                    <p className="text-[13px] text-[#475569] leading-relaxed">{pq.desc}</p>
                    {matchedPick && (
                      <div className="mt-2 pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/productos/${matchedPick.product.slug}`} className="text-[12px] font-bold text-[#0F172A] hover:underline line-clamp-1 block">
                            {matchedPick.product.brand} · {matchedPick.product.name}
                          </Link>
                          <p className="text-[11px] text-[#64748B] mt-0.5">
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
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">Tipos de {config.label.toLowerCase()}</h2>
            <p className="text-[#64748B] text-sm">El formato condiciona el espacio, el uso y el precio.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {config.tipos.map((t) => (
              <div key={t.title} className="rounded-3xl border p-6 flex flex-col gap-4"
                style={{ backgroundColor: t.bg, borderColor: t.border }}>
                <div>
                  <span className="text-2xl">{t.emoji}</span>
                  <h3 className="font-extrabold text-[#0F172A] mt-2 text-base">{t.title}</h3>
                  <p className="text-xs font-medium mt-1" style={{ color: t.color }}>Ideal para: {t.ideal}</p>
                </div>
                <div className="space-y-3 text-xs">
                  {t.pros.length > 0 && (
                    <div>
                      <p className="font-bold text-emerald-700 mb-1.5">✓ Ventajas</p>
                      <ul className="space-y-1 text-[#475569]">
                        {t.pros.map((p) => <li key={p} className="flex gap-1.5"><span className="text-emerald-600 mt-px">·</span>{p}</li>)}
                      </ul>
                    </div>
                  )}
                  {t.cons.length > 0 && (
                    <div className="pt-2 border-t" style={{ borderColor: t.border }}>
                      <p className="font-bold text-red-500 mb-1.5">✗ Inconvenientes</p>
                      <ul className="space-y-1 text-[#475569]">
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
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">{config.criterios.length} criterios que importan</h2>
            <p className="text-[#64748B] text-sm">Las cosas que sí marcan diferencia en el día a día.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {config.criterios.map((c, i) => (
              <div key={c.title} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex gap-4 hover:shadow-md transition-shadow">
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
                    <h3 className="font-bold text-[#0F172A] text-sm">{c.title}</h3>
                  </div>
                  <p className="text-xs text-[#64748B] leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="preguntas">
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: config.color }}>
              FAQ
            </p>
            <h2 className="text-3xl font-extrabold text-[#0F172A]">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {config.faqs.map((f, i) => (
              <details key={f.q} className="group bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden hover:shadow-sm open:shadow-sm transition-shadow">
                <summary className="flex items-center gap-4 p-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="text-[11px] font-bold tabular-nums w-6 shrink-0"
                    style={{ color: config.color }}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-bold text-[#0F172A] text-[14px] flex-1 leading-snug">{f.q}</span>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-open:rotate-180"
                    style={{ background: config.bgLight, color: config.color }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </summary>
                <div className="px-5 pb-5 pl-[3.25rem] text-[13px] text-[#475569] leading-relaxed">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA + INTERNAL LINKS */}
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
                className="bg-white font-bold px-6 py-3 rounded-2xl text-sm hover:bg-white/90 transition-colors whitespace-nowrap"
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
