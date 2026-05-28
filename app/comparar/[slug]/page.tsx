import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

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
  const { a, b } = await getPair(pair[0], pair[1]);
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
  const { a, b } = await getPair(pair[0], pair[1]);
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
    <main className="min-h-screen max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-wider text-white/40 mb-4">
        <Link href="/" className="hover:text-cyan-300">~/</Link>
        <span className="text-white/25">›</span>
        <Link href={`/categorias/${catSlug}`} className="hover:text-cyan-300">{catSlug}</Link>
        <span className="text-white/25">›</span>
        <span className="text-cyan-300">comparativa</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          {a.name} <span className="text-white/40">vs</span> {b.name}
        </h1>
        <p className="mt-3 text-white/70 max-w-3xl">
          Comparativa cara a cara entre dos {catLabel.toLowerCase()}. Precios actualizados, specs lado a lado y veredicto rápido.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:gap-6 mb-8">
        {[a, b].map((p, idx) => {
          const min = idx === 0 ? minA : minB;
          return (
            <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="aspect-square relative bg-white/5 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                {p.image ? (
                  <Image src={p.image} alt={p.name} fill className="object-contain p-3" sizes="(max-width:768px) 50vw, 25vw" />
                ) : (
                  <span className="text-3xl opacity-40" aria-hidden>📦</span>
                )}
              </div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">{p.brand}</div>
              <Link href={`/productos/${p.slug}`} className="block text-sm font-semibold text-white hover:text-cyan-300 leading-tight mb-2 line-clamp-2">
                {p.name}
              </Link>
              <div className="text-lg font-bold text-cyan-300">
                {min !== null ? `${min.toFixed(2)}€` : "Sin stock"}
              </div>
              <div className="text-xs text-white/40">{p.offers.length} tienda{p.offers.length !== 1 ? "s" : ""}</div>
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left px-4 py-3 text-white/60 font-medium">Característica</th>
              <th className="text-left px-4 py-3 text-white font-semibold">{a.name.slice(0, 40)}</th>
              <th className="text-left px-4 py-3 text-white font-semibold">{b.name.slice(0, 40)}</th>
            </tr>
          </thead>
          <tbody>
            {specKeys.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-6 text-white/50 text-center">Sin especificaciones estructuradas comparables.</td></tr>
            ) : specKeys.map((k) => (
              <tr key={k} className="border-t border-white/5">
                <td className="px-4 py-2.5 text-white/60">{SPEC_LABELS[k] ?? k}</td>
                <td className="px-4 py-2.5 text-white">{fmtSpec(specsA[k])}</td>
                <td className="px-4 py-2.5 text-white">{fmtSpec(specsB[k])}</td>
              </tr>
            ))}
            <tr className="border-t border-white/5 bg-cyan-500/5">
              <td className="px-4 py-2.5 text-white/60">Precio actual</td>
              <td className="px-4 py-2.5 font-bold text-cyan-300">{minA !== null ? `${minA.toFixed(2)}€` : "—"}</td>
              <td className="px-4 py-2.5 font-bold text-cyan-300">{minB !== null ? `${minB.toFixed(2)}€` : "—"}</td>
            </tr>
            <tr className="border-t border-white/5">
              <td className="px-4 py-2.5 text-white/60">Tiendas disponibles</td>
              <td className="px-4 py-2.5 text-white">{a.offers.length}</td>
              <td className="px-4 py-2.5 text-white">{b.offers.length}</td>
            </tr>
            <tr className="border-t border-white/5">
              <td className="px-4 py-2.5 text-white/60">Valoración media</td>
              <td className="px-4 py-2.5 text-white">{a.rating ? `${a.rating.toFixed(1)} / 5` : "—"}</td>
              <td className="px-4 py-2.5 text-white">{b.rating ? `${b.rating.toFixed(1)} / 5` : "—"}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-5 mb-8">
        <h2 className="text-lg font-semibold text-white mb-2">Veredicto rápido</h2>
        <p className="text-white/80">{verdict}</p>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <Link href={`/productos/${a.slug}`} className="rounded-lg border border-white/10 px-4 py-3 text-center text-cyan-300 hover:bg-white/5">
          Ver ficha completa de {a.brand}
        </Link>
        <Link href={`/productos/${b.slug}`} className="rounded-lg border border-white/10 px-4 py-3 text-center text-cyan-300 hover:bg-white/5">
          Ver ficha completa de {b.brand}
        </Link>
      </section>
    </main>
  );
}
