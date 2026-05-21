import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { Category } from "@/app/generated/prisma/client";
import { deleteProductAction, purgeCatalogAction } from "../actions";

export const metadata = { title: "Admin · Productos · Orvexia" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const CATEGORIES: Category[] = [
  "TELEVISORES",
  "LAVADORAS",
  "FRIGORIFICOS",
  "LAVAVAJILLAS",
  "SECADORAS",
  "HORNOS",
  "MICROONDAS",
  "ASPIRADORAS",
  "CAFETERAS",
  "AIRES_ACONDICIONADOS",
  "OTROS",
];

function fmt(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function sym(c: string) {
  return c === "USD" ? "$" : c === "GBP" ? "£" : "€";
}

interface SP {
  q?: string;
  brand?: string;
  category?: string;
  page?: string;
  sort?: string;
}

export default async function ProductsAdmin({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/catalog/products");
  const admin = await isAdminUser(session.userId);
  if (!admin) {
    return (
      <main className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="text-3xl font-bold text-white">403 · No autorizado</h1>
        <Link href="/" className="mt-6 inline-block text-cyan-300 hover:underline">
          ← Volver al inicio
        </Link>
      </main>
    );
  }

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const brand = (sp.brand ?? "").trim();
  const category = (sp.category ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const sort = (sp.sort ?? "recent") as "recent" | "alpha" | "offers";

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
      { model: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }
  if (brand) where.brand = { equals: brand, mode: "insensitive" };
  if (category && CATEGORIES.includes(category as Category)) where.category = category;

  const orderBy =
    sort === "alpha"
      ? { name: "asc" as const }
      : sort === "offers"
        ? undefined // ordenamos manualmente más abajo
        : { createdAt: "desc" as const };

  const [total, brands, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      select: { brand: true },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
      take: 50,
    }),
    prisma.product.findMany({
      where,
      orderBy,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        offers: {
          orderBy: { priceCurrent: "asc" },
        },
      },
    }),
  ]);

  const items =
    sort === "offers"
      ? [...products].sort((a, b) => b.offers.length - a.offers.length)
      : products;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (brand) params.set("brand", brand);
    if (category) params.set("category", category);
    if (sort !== "recent") params.set("sort", sort);
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  return (
    <main className="max-w-7xl mx-auto px-5 py-12">
      <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300 mb-2">
            ▸ /admin · catálogo · productos
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Todos los <span className="text-gradient-aurora">productos</span>{" "}
            <span className="text-white/40 text-2xl font-medium">· {total.toLocaleString("es-ES")}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/admin/catalog"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-white/80 hover:bg-white/10 transition-colors"
          >
            ← Importar CSV
          </Link>
          <form
            action={purgeCatalogAction}
            onSubmit={(e) => {
              if (!confirm("¿Borrar TODO el catálogo? Esta acción no se puede deshacer.")) {
                e.preventDefault();
              }
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-rose-200 hover:bg-rose-500/20 transition-colors text-xs"
            >
              ☠ Vaciar catálogo
            </button>
          </form>
        </div>
      </header>

      {/* Filtros */}
      <form className="mb-5 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, marca, modelo o slug…"
          className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
        />
        <select
          name="brand"
          defaultValue={brand}
          className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
        >
          <option value="">Todas las marcas</option>
          {brands.map((b) => (
            <option key={b.brand} value={b.brand}>
              {b.brand}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue={category}
          className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ").toLowerCase()}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
        >
          <option value="recent">Recientes</option>
          <option value="alpha">A-Z</option>
          <option value="offers">Más ofertas</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors"
        >
          Aplicar
        </button>
      </form>

      {/* Tabla */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <p className="text-white/60">
            No hay productos que coincidan.
            {total === 0 && (
              <>
                {" "}
                <Link
                  href="/admin/catalog"
                  className="text-cyan-300 hover:underline"
                >
                  Importa tu primer CSV →
                </Link>
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/45">
              <tr>
                <th className="px-3 py-2 text-left">Imagen</th>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Marca · Modelo</th>
                <th className="px-3 py-2 text-left">Categoría</th>
                <th className="px-3 py-2 text-right">Ofertas</th>
                <th className="px-3 py-2 text-right">Mejor precio</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const best = p.offers[0];
                return (
                  <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-3 py-2">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image}
                          alt=""
                          className="h-10 w-10 object-contain rounded border border-white/10 bg-white/5"
                        />
                      ) : (
                        <div className="h-10 w-10 grid place-items-center rounded border border-white/10 bg-white/[0.03] text-white/30 text-xs">
                          —
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/productos/${p.slug}`}
                        target="_blank"
                        className="text-white/85 hover:text-cyan-300"
                      >
                        {p.name}
                      </Link>
                      <div className="text-[11px] text-white/35 font-mono truncate">
                        /{p.slug}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-white/70 text-xs">
                      <div className="font-semibold text-white/85">{p.brand}</div>
                      <div className="font-mono">{p.model}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-white/55">
                      {p.category.replace(/_/g, " ").toLowerCase()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`inline-block min-w-[2rem] text-center rounded px-1.5 py-0.5 text-xs font-semibold ${
                          p.offers.length === 0
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {p.offers.length}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-white/85 tabular-nums whitespace-nowrap">
                      {best ? (
                        <>
                          <strong className="text-cyan-300">
                            {fmt(best.priceCurrent)} {sym("EUR")}
                          </strong>
                          <div className="text-[10px] text-white/45">{best.store}</div>
                        </>
                      ) : (
                        <span className="text-white/35 text-xs">sin oferta</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/catalog/products/${p.id}`}
                        className="text-cyan-300 hover:underline text-xs mr-2"
                      >
                        editar
                      </Link>
                      <form
                        action={deleteProductAction}
                        className="inline-block"
                      >
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="text-rose-300 hover:underline text-xs"
                        >
                          borrar
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            className={`px-3 py-1.5 rounded-lg border border-white/15 ${
              page <= 1 ? "opacity-30 pointer-events-none" : "hover:bg-white/10"
            }`}
          >
            ← anterior
          </Link>
          <span className="text-white/60 px-2">
            Página <strong className="text-white">{page}</strong> de{" "}
            <strong className="text-white">{totalPages}</strong>
          </span>
          <Link
            href={pageHref(Math.min(totalPages, page + 1))}
            className={`px-3 py-1.5 rounded-lg border border-white/15 ${
              page >= totalPages ? "opacity-30 pointer-events-none" : "hover:bg-white/10"
            }`}
          >
            siguiente →
          </Link>
        </nav>
      )}
    </main>
  );
}
