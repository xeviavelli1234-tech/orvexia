"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";

const ProductModal = dynamic(() => import("@/components/ProductModal"), { ssr: false });

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

interface Props {
  slug: string;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function ProductModalButton({ slug, children, className, "aria-label": ariaLabel }: Props) {
  const [modalProduct, setModalProduct] = useState<FullProduct | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products?slug=${encodeURIComponent(slug)}&full=1`);
      const data: FullProduct | null = await res.json();
      if (data) setModalProduct(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`relative ${className ?? ""}`}
        aria-label={ariaLabel}
        type="button"
        disabled={loading}
      >
        {children}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center rounded-inherit bg-white/60">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="#2563EB" strokeWidth="3" strokeDasharray="31.416" strokeDashoffset="10" />
            </svg>
          </span>
        )}
      </button>

      {modalProduct && (
        <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />
      )}
    </>
  );
}
