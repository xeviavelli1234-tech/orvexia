"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import ProductCard from "@/components/ProductCard";

interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  description: string | null;
  image: string | null;
  images: string[];
  rating: number | null;
  reviewCount: number | null;
  slug: string;
  offers: {
    store: string;
    priceCurrent: number;
    priceOld: number | null;
    discountPercent: number | null;
    externalUrl: string | null;
  }[];
}

export function RecomendadosClient({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) return;
      const data = await res.json();
      if (data.recommended?.length > 0) {
        setProducts(data.recommended);
      }
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  }, []);

  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(t1);
      clearTimeout(t2);
      t1 = setTimeout(() => refreshRef.current(), 500);
      t2 = setTimeout(() => refreshRef.current(), 1500);
    };
    window.addEventListener("orvexia:data-changed", handler);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("orvexia:data-changed", handler);
    };
  }, []);

  return (
    <div className="relative">
      {refreshing && (
        <div className="absolute top-0 right-0 flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
          </svg>
          Actualizando…
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={{ ...p, brand: p.brand ?? "", offers: p.offers.map(o => ({ ...o, externalUrl: o.externalUrl ?? "" })) }} priority={i === 0} />
        ))}
      </div>
    </div>
  );
}
