import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import CatalogImportClient from "./CatalogImportClient";

export const metadata = { title: "Admin · Catálogo · Orvexia" };
export const dynamic = "force-dynamic";

export default async function CatalogAdmin() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/catalog");
  const admin = await isAdminUser(session.userId);
  if (!admin) {
    return (
      <main className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="text-3xl font-bold text-white">403 · No autorizado</h1>
        <p className="mt-3 text-white/60">
          Esta zona es solo para administradores.
        </p>
        <Link href="/" className="mt-6 inline-block text-cyan-300 hover:underline">
          ← Volver al inicio
        </Link>
      </main>
    );
  }

  const [productCount, offerCount, lgCount] = await Promise.all([
    prisma.product.count(),
    prisma.offer.count(),
    prisma.product.count({ where: { brand: { equals: "LG", mode: "insensitive" } } }),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-5 py-12">
      <header className="mb-8">
        <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300 mb-2">
          ▸ /admin · catalog import
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Importar catálogo <span className="text-gradient-aurora">CSV</span>
        </h1>
        <p className="mt-2 text-sm text-white/55 max-w-2xl">
          Sube un CSV con productos y ofertas. Una fila = una oferta (producto en una
          tienda). Filas con el mismo <code className="text-cyan-300">brand + model</code>{" "}
          se agrupan en el mismo producto con varias ofertas. Si actualizas el mismo CSV
          al día siguiente con precios distintos, se guarda historial automáticamente.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-3 mb-8">
        <Kpi label="Productos" value={productCount} />
        <Kpi label="Ofertas" value={offerCount} />
        <Kpi label="LG en catálogo" value={lgCount} tone="ok" />
      </section>

      <CatalogImportClient />

      <section className="mt-10 rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-base font-bold text-white mb-2">Cómo funciona</h2>
        <ol className="text-sm text-white/70 list-decimal pl-5 space-y-1">
          <li>
            Descarga la plantilla{" "}
            <a
              href="/api/admin/catalog/import"
              className="text-cyan-300 hover:underline"
              download
            >
              orvexia-catalogo-plantilla.csv
            </a>{" "}
            con las cabeceras esperadas.
          </li>
          <li>Ábrela en Excel/Numbers/Google Sheets y rellena los productos.</li>
          <li>Vuelve aquí y arrastra el CSV o pégalo en el cuadro de abajo.</li>
          <li>Revisa el resumen: filas válidas, errores por fila y productos creados/actualizados.</li>
        </ol>
        <div className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-500/[0.06] p-3 text-sm text-white/80">
          🎁 <strong>Semilla LG lista para usar</strong>:{" "}
          <a
            href="/seed/lg-catalog.csv"
            className="text-emerald-300 hover:underline"
            download
          >
            descarga lg-catalog.csv
          </a>{" "}
          (30 modelos LG reales en TVs, lavadoras, frigoríficos, secadoras, lavavajillas,
          microondas, aspiradoras y aires). El catálogo viene <em>sin precios</em>: añade
          tú las columnas <code className="text-emerald-300">store, price, external_url</code>{" "}
          (y <code>price_old, image_url</code> si quieres) y vuelve a subir el CSV
          editado para que cada producto tenga sus ofertas reales.
        </div>
        <p className="mt-3 text-xs text-white/45">
          Cabeceras obligatorias:{" "}
          <code className="text-cyan-300">brand, model, name, category, store, price, external_url</code>
          . Opcionales: <code>asin, image_url, description, price_old, in_stock</code>.
        </p>
        <p className="mt-1 text-xs text-white/45">
          Categorías válidas:{" "}
          <code className="text-cyan-300">
            TELEVISORES, LAVADORAS, FRIGORIFICOS, LAVAVAJILLAS, SECADORAS, HORNOS, MICROONDAS,
            ASPIRADORAS, CAFETERAS, AIRES_ACONDICIONADOS, OTROS
          </code>{" "}
          (también alias como <code>tv</code>, <code>nevera</code>, etc.).
        </p>
      </section>
    </main>
  );
}

function Kpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "ok" | "neutral";
}) {
  const color = tone === "ok" ? "text-emerald-300" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className={`mt-0.5 text-2xl font-bold ${color}`}>{value.toLocaleString("es-ES")}</div>
    </div>
  );
}
