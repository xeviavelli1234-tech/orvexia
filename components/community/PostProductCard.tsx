"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const ProductModal = dynamic(() => import("@/components/ProductModal"), { ssr: false });

interface BasicProduct {
  id: string;
  name: string;
  image: string | null;
  slug: string;
}

interface FullProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  description: string | null;
  image: string | null;
  images: string[];
  rating: number | null;
  reviewCount: number | null;
  offers: {
    store: string;
    priceCurrent: number;
    priceOld: number | null;
    discountPercent: number | null;
    externalUrl: string;
  }[];
}

export function PostProductCard({ product }: { product: BasicProduct }) {
  const [modalProduct, setModalProduct] = useState<FullProduct | null>(null);
  const [loading, setLoading] = useState(false);

  async function openModal() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products?slug=${product.slug}&full=1`);
      const data: FullProduct | null = await res.json();
      if (data) setModalProduct(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Product image */}
      {product.image && (
        <button
          onClick={openModal}
          className="w-full h-36 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] p-2 mb-3 flex items-center justify-center overflow-hidden hover:border-[#2563EB]/30 transition cursor-pointer group"
          aria-label={`Ver detalles de ${product.name}`}
        >
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
          />
        </button>
      )}

      {/* Product name */}
      <p className="text-sm font-bold text-[#0F172A] leading-snug mb-3">
        {product.name}
      </p>

      {/* CTA button */}
      <button
        onClick={openModal}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        style={{ background: "linear-gradient(135deg,#2563EB,#4F46E5)" }}
      >
        {loading ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.416" strokeDashoffset="10" />
            </svg>
            Cargando…
          </>
        ) : (
          <>
            Ver producto
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </button>

      {/* Modal */}
      {modalProduct && (
        <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />
      )}
    </>
  );
}
