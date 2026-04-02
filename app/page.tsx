import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

async function getProductos() {
  return prisma.product.findMany({
    include: {
      offers: { orderBy: { priceCurrent: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function HomePage() {
  const productos = await getProductos();

  return (
    <main className="min-h-screen bg-white">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EAF3FF] to-white py-20 px-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#2563EB] opacity-[0.06] rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <span className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-semibold bg-[#EAF3FF] text-[#2563EB] border border-[#D6E8FF]">
            🎯 Rastreador de precios de electrodomésticos
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#0F172A] leading-tight mb-4">
            Encuentra el mejor precio<br />
            <span style={{ background: "linear-gradient(90deg, #2563EB, #10B981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              en el momento perfecto
            </span>
          </h1>
          <p className="text-lg text-[#64748B] mb-8 max-w-xl mx-auto">
            Seguimos los precios de miles de electrodomésticos para que nunca pagues de más.
          </p>
          <div className="flex items-center gap-2 bg-white rounded-2xl shadow-md border border-[#E5F0FF] px-4 py-3 max-w-xl mx-auto mb-6">
            <svg className="w-5 h-5 text-[#94A3B8] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input type="text" placeholder="Busca un electrodoméstico... ej: lavadora Samsung" className="flex-1 text-sm text-[#0F172A] placeholder-[#94A3B8] outline-none bg-transparent" />
            <button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              Buscar
            </button>
          </div>
          <Link href="/ofertas-destacadas" className="inline-flex items-center gap-2 bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
            Explorar ofertas
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── PRODUCTOS ─────────────────────────────────────────────── */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#0F172A]">Ofertas destacadas</h2>
            <p className="text-sm text-[#64748B] mt-1">{productos.length} producto{productos.length !== 1 ? "s" : ""} disponible{productos.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {productos.length === 0 ? (
          <div className="text-center py-20 text-[#94A3B8]">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-sm">No hay productos todavía</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {productos.map((producto) => {
              const mejorOferta = producto.offers[0];
              return (
                <div key={producto.id} className="group block rounded-xl overflow-hidden bg-white border border-[#E5F0FF] hover:shadow-md hover:border-[#2563EB]/30 transition-all duration-200">
                  {/* Imagen */}
                  <div className="relative h-48 bg-[#F0F7FF] flex items-center justify-center p-4">
                    {producto.image ? (
                      <Image
                        src={producto.image}
                        alt={producto.name}
                        fill
                        className="object-contain p-4"
                        sizes="(max-width: 640px) 100vw, 25vw"
                      />
                    ) : (
                      <span className="text-5xl">📺</span>
                    )}
                    {mejorOferta?.discountPercent && (
                      <span className="absolute top-3 left-3 bg-[#2563EB] text-white text-xs font-bold px-2 py-1 rounded-lg">
                        -{mejorOferta.discountPercent}%
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <p className="text-xs text-[#64748B] mb-1">{producto.brand} · {producto.category}</p>
                    <h3 className="text-sm font-semibold text-[#0F172A] leading-snug mb-3 line-clamp-2 group-hover:text-[#2563EB] transition-colors">
                      {producto.name}
                    </h3>

                    {mejorOferta ? (
                      <>
                        <div className="flex items-end gap-2 mb-3">
                          <span className="text-xl font-bold text-[#0F172A]">{mejorOferta.priceCurrent.toFixed(2)}€</span>
                          {mejorOferta.priceOld && (
                            <span className="text-sm text-[#94A3B8] line-through mb-0.5">{mejorOferta.priceOld.toFixed(2)}€</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#64748B]">en {mejorOferta.store}</span>
                          <a
                            href={mejorOferta.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Ver oferta →
                          </a>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-[#94A3B8]">Sin ofertas disponibles</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="rounded-2xl p-10 bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[-40px] right-[-40px] w-40 h-40 rounded-full bg-white opacity-5" />
              <div className="absolute bottom-[-40px] left-[-20px] w-32 h-32 rounded-full bg-[#10B981] opacity-10" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 relative">Empieza a ahorrar hoy</h2>
            <p className="text-[#BFDBFE] mb-8 relative text-sm">
              Únete a miles de usuarios que ya compran más inteligente con DealTracker.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center relative">
              <Link href="/register" className="bg-white text-[#2563EB] font-bold px-6 py-3 rounded-xl hover:bg-[#EFF6FF] transition-colors text-sm">
                Crear cuenta gratis
              </Link>
              <Link href="/ofertas-destacadas" className="bg-[#1D4ED8] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#1E40AF] border border-white/20 transition-colors text-sm">
                Ver ofertas ahora
              </Link>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
