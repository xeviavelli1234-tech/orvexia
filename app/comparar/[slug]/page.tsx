import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { jsonLdScript } from "@/lib/json-ld";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { captureException } from "@/lib/monitoring";
import { DataUnavailable } from "@/components/DataUnavailable";

export const revalidate = 3600;

const CATEGORY_LABELS: Record<string, string> = {
  TELEVISORES: "Televisores", LAVADORAS: "Lavadoras", FRIGORIFICOS: "Frigoríficos",
  LAVAVAJILLAS: "Lavavajillas", SECADORAS: "Secadoras", HORNOS: "Hornos",
  MICROONDAS: "Microondas", ASPIRADORAS: "Aspiradoras", CAFETERAS: "Cafeteras",
  AIRES_ACONDICIONADOS: "Aire acondicionado", OTROS: "Otros",
};
const CATEGORY_TO_SLUG: Record<string, string> = {
  TELEVISORES: "televisores", LAVADORAS: "lavadoras", FRIGORIFICOS: "frigorificos",
  LAVAVAJILLAS: "lavavajillas", SECADORAS: "secadoras", HORNOS: "hornos",
  MICROONDAS: "microondas", ASPIRADORAS: "aspiradoras", CAFETERAS: "cafeteras",
  AIRES_ACONDICIONADOS: "aires_acondicionados", OTROS: "otros",
};

function splitSlug(combined: string): [string, string] | null {
  const idx = combined.indexOf("-vs-");
  if (idx <= 0 || idx >= combined.length - 4) return null;
  const a = combined.slice(0, idx);
  const b = combined.slice(idx + 4);
  if (!a || !b || a === b) return null;
  return [a, b];
}

async function getPair(slugA: string, slugB: string) {
  const [a, b] = await Promise.all([
    prisma.product.findUnique({
      where: { slug: slugA },
      include: { offers: { where: { inStock: true }, orderBy: { priceCurrent: "asc" } } },
    }),
    prisma.product.findUnique({
      where: { slug: slugB },
      include: { offers: { where: { inStock: true }, orderBy: { priceCurrent: "asc" } } },
    }),
  ]);
  return { a, b };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pair = splitSlug(slug);
  if (!pair) return { title: "Comparativa no encontrada | Orvexia" };
  const { a, b } = await getPair(pair[0], pair[1]).catch(() => ({ a: null, b: null }));
  if (!a || !b) return { title: "Comparativa no encontrada | Orvexia" };
  return {
    title: `${a.name} vs ${b.name}: comparativa y mejor precio | Orvexia`,
    description: `Comparamos ${a.name} y ${b.name} cara a cara: precio actual, especificaciones, valoraciones y veredicto para ayudarte a elegir.`,
    alternates: { canonical: `/comparar/${slug}` },
  };
}

type Specs = Record<string, string | number | boolean | null | undefined>;

function readSpecs(p: { specs: unknown }): Specs {
  return (p.specs ?? {}) as Specs;
}

function fmtSpec(v: Specs[string]): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "—";
  return String(v);
}

function chooseSpecKeys(a: Specs, b: Specs): string[] {
  const all = new Set([...Object.keys(a), ...Object.keys(b)]);
  const priority = ["sizeInches", "tech", "resolution", "refreshRate", "os", "capacityKg", "rpm",
    "energyClass", "noFrost", "capacityLiters", "cubiertos", "powerWatts", "bars",
    "frigorias", "btu", "wifi", "bluetooth"];
  const ordered: string[] = [];
  for (const k of priority) if (all.has(k)) ordered.push(k);
  for (const k of all) if (!ordered.includes(k)) ordered.push(k);
  return ordered.slice(0, 14);
}

const SPEC_LABELS: Record<string, string> = {
  sizeInches: "Pulgadas", tech: "Tecnología", resolution: "Resolución", refreshRate: "Frecuencia",
  os: "Sistema", capacityKg: "Capacidad (kg)", rpm: "Revoluciones", energyClass: "Eficiencia",
  noFrost: "No Frost", capacityLiters: "Capacidad (L)", cubiertos: "Cubiertos",
  powerWatts: "Potencia (W)", bars: "Presión (bar)", frigorias: "Frigorías", btu: "BTU",
  wifi: "WiFi", bluetooth: "Bluetooth",
};

export default async function CompararPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pair = splitSlug(slug);
  if (!pair) notFound();
  let pairData: Awaited<ReturnType<typeof getPair>>;
  try {
    pairData = await getPair(pair[0], pair[1]);
  } catch (e) {
    void captureException(e, { tags: { source: "comparar" }, level: "warning" });
    return <DataUnavailable />;
  }
  const { a, b } = pairData;
  if (!a || !b) notFound();
  if (a.category !== b.category) notFound();

  const minA = a.offers[0]?.priceCurrent ?? null;
  const minB = b.offers[0]?.priceCurrent ?? null;
  const catLabel = CATEGORY_LABELS[a.category] ?? "Electrodomésticos";
  const catSlug = CATEGORY_TO_SLUG[a.category] ?? "otros";

  const specsA = readSpecs(a);
  const specsB = readSpecs(b);
  const specKeys = chooseSpecKeys(specsA, specsB);

  let verdict = "Empate técnico — la diferencia más relevante es el precio.";
  if (minA !== null && minB !== null && Math.abs(minA - minB) >= 20) {
    const cheaper = minA < minB ? a : b;
    const pricier = minA < minB ? b : a;
    const diff = Math.abs(minA - minB);
    verdict = `Si decides por precio, ${cheaper.name} es ${diff.toFixed(0)}€ más barato hoy. ${pricier.name} suele justificarse si necesitas alguna de las specs que solo ofrece su gama.`;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${a.name} vs ${b.name}`,
    itemListElement: [
      { "@type": "ListItem", position: 1, url: `https://www.orvexia.es/productos/${a.slug}`, name: a.name },
      { "@type": "ListItem", position: 2, url: `https://www.orvexia.es/productos/${b.slug}`, name: b.name },
    ],
  };

  return (
    <main className="relative min-h-screen bg-[#050310] text-white/90">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[400px] w-[900px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.14), transparent 65%)" }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <nav aria-label="Miga de pan" className="mb-6 flex items-center gap-2 text-[11px] font-semibold text-white/40">
          <Link href="/" className="transition-colors hover:text-brand-200">Inicio</Link>
          <span aria-hidden className="text-white/20">›</span>
          <Link href={`/categorias/${catSlug}`} className="transition-colors hover:text-brand-200">{catLabel}</Link>
          <span aria-hidden className="text-white/20">›</span>
          <span className="text-brand-300">Comparativa</span>
        </nav>

        <header className="reveal mb-8">
          <span className="mb-3 inline-flex h-7 items-center rounded-full border border-brand-400/30 bg-brand-400/[0.09] px-3.5 text-[11px] font-semibold tracking-wide text-brand-200">
            Cara a cara
          </span>
          <h1
            className="font-extrabold tracking-tight text-white"
            style={{ fontSize: "clamp(1.8rem, 3.6vw, 2.6rem)", lineHeight: 1.1, letterSpacing: "-0.03em", textWrap: "balance" }}
          >
            {a.name} <span className="text-brand-300/70">vs</span> {b.name}
          </h1>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>
            Comparativa cara a cara entre dos {catLabel.toLowerCase()}. Precios actualizados, specs lado a lado y veredicto rápido.
          </p>
        </header>

        <section className="reveal mb-8 grid grid-cols-2 gap-4 sm:gap-6">
          {[a, b].map((p, idx) => {
            const min = idx === 0 ? minA : minB;
            return (
              <div
                key={p.id}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/35 hover:shadow-[0_24px_60px_-24px_rgba(99,102,241,0.55)]"
              >
                <div className="relative mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-white/[0.04]">
                  {p.image ? (
                    <Image src={p.image} alt={p.name} fill className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]" sizes="(max-width:768px) 50vw, 25vw" />
                  ) : (
                    <span className="text-3xl opacity-40" aria-hidden>📦</span>
                  )}
                </div>
                <div className="mb-1 text-xs uppercase tracking-wider text-brand-300/80">{p.brand}</div>
                <Link href={`/productos/${p.slug}`} className="mb-2 block text-sm font-semibold leading-tight text-white line-clamp-2 transition-colors hover:text-brand-200">
                  {p.name}
                </Link>
                <div className="text-lg font-extrabold tabular text-white">
                  {min !== null ? `${min.toFixed(2)}€` : "Sin stock"}
                </div>
                <div className="text-xs text-white/40">{p.offers.length} tienda{p.offers.length !== 1 ? "s" : ""}</div>
              </div>
            );
          })}
        </section>

        <section className="reveal mb-8 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-white/50">Característica</th>
                  <th className="px-4 py-3 text-left font-semibold text-white">{a.name.slice(0, 40)}</th>
                  <th className="px-4 py-3 text-left font-semibold text-white">{b.name.slice(0, 40)}</th>
                </tr>
              </thead>
              <tbody>
                {specKeys.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-white/50">Sin especificaciones estructuradas comparables.</td></tr>
                ) : specKeys.map((k) => (
                  <tr key={k} className="border-t border-white/[0.05]">
                    <td className="px-4 py-2.5 text-white/50">{SPEC_LABELS[k] ?? k}</td>
                    <td className="px-4 py-2.5 text-white">{fmtSpec(specsA[k])}</td>
                    <td className="px-4 py-2.5 text-white">{fmtSpec(specsB[k])}</td>
                  </tr>
                ))}
                <tr className="border-t border-white/[0.05] bg-brand-500/[0.07]">
                  <td className="px-4 py-2.5 text-white/50">Precio actual</td>
                  <td className="px-4 py-2.5 font-bold tabular text-brand-200">{minA !== null ? `${minA.toFixed(2)}€` : "—"}</td>
                  <td className="px-4 py-2.5 font-bold tabular text-brand-200">{minB !== null ? `${minB.toFixed(2)}€` : "—"}</td>
                </tr>
                <tr className="border-t border-white/[0.05]">
                  <td className="px-4 py-2.5 text-white/50">Tiendas disponibles</td>
                  <td className="px-4 py-2.5 text-white">{a.offers.length}</td>
                  <td className="px-4 py-2.5 text-white">{b.offers.length}</td>
                </tr>
                <tr className="border-t border-white/[0.05]">
                  <td className="px-4 py-2.5 text-white/50">Valoración media</td>
                  <td className="px-4 py-2.5 text-white">{a.rating ? `${a.rating.toFixed(1)} / 5` : "—"}</td>
                  <td className="px-4 py-2.5 text-white">{b.rating ? `${b.rating.toFixed(1)} / 5` : "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section
          className="reveal relative mb-8 overflow-hidden rounded-3xl border border-brand-400/15 p-6"
          style={{ background: "linear-gradient(160deg, #100d26 0%, #0a0819 55%, #070614 100%)" }}
        >
          <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-44 w-[420px] -translate-x-1/2 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.16), transparent 70%)" }} />
          <h2 className="relative mb-2 text-lg font-extrabold tracking-tight text-white">Veredicto rápido</h2>
          <p className="relative text-sm leading-relaxed text-white/65" style={{ textWrap: "pretty" }}>{verdict}</p>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <Link
            href={`/productos/${a.slug}`}
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-4 text-center text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
          >
            Ver ficha completa de {a.brand}
          </Link>
          <Link
            href={`/productos/${b.slug}`}
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-4 text-center text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
          >
            Ver ficha completa de {b.brand}
          </Link>
        </section>
      </div>
    </main>
  );
}
