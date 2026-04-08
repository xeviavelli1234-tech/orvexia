"use client";

import { useEffect, useState } from "react";

type Props = {
  productId: string;
  store: string;
  currentPrice: number;
  className?: string;
};

export function PriceAlertButton({ productId, store, currentPrice, className = "" }: Props) {
  const [alertId, setAlertId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const active = Boolean(alertId);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/price-alerts?productId=${productId}&store=${encodeURIComponent(store)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data?.alert) {
          setAlertId(data.alert.id);
        }
      } catch {
        /* silent */
      }
    })();
    return () => { mounted = false; };
  }, [productId, store]);

  async function toggleAlert(e: React.MouseEvent) {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      if (active) {
        await fetch("/api/price-alerts", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alertId }),
        });
        setAlertId(null);
        window.dispatchEvent(new Event("orvexia:alerts-changed"));
      } else {
        const res = await fetch("/api/price-alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, store, targetPrice: currentPrice }),
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = await res.json();
        if (data?.id) setAlertId(data.id);
        window.dispatchEvent(new Event("orvexia:alerts-changed"));
      }
    } catch {
      // opcional: mostrar toast
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggleAlert}
      disabled={loading}
      title={active ? "Quitar alerta de precio" : "Activar alerta de precio"}
      aria-label={active ? "Quitar alerta de precio" : "Activar alerta de precio"}
      aria-pressed={active}
      className={`flex items-center justify-center rounded-full transition-all duration-150 ${
        active
          ? "bg-[#EEF2FF] text-[#2563EB] hover:bg-[#DBEAFE]"
          : "bg-[#F1F5F9] text-[#94A3B8] hover:bg-[#E2E8F0] hover:text-[#475569]"
      } disabled:opacity-50 ${className}`}
    >
      <svg
        width="16" height="16" viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    </button>
  );
}
