"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import ProductModal from "@/components/ProductModal";
import { SaveButton } from "@/components/SaveButton";
import { useProfile } from "@/components/ProfileProvider";
import { useSaved } from "@/components/SavedProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModalOffer {
  store: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  externalUrl: string;
}

interface ModalProduct {
  id: string; name: string; brand: string; category: string;
  description: string | null; image: string | null; images: string[];
  rating: number | null; reviewCount: number | null;
  offers: ModalOffer[];
}

interface DashboardData {
  stats: {
    savedCount: number;
    alertsActive: number;
    alertsTriggered: number;
    potentialSavings: number;
  };
  savedProducts: {
    id: string; productId: string; slug: string; name: string; brand: string;
    category: string; description: string | null; image: string | null; images: string[];
    rating: number | null; reviewCount: number | null;
    offers: ModalOffer[];
    priceCurrent: number | null; priceOld: number | null;
    discountPercent: number | null; store: string | null;
    externalUrl: string | null; savedAt: string;
  }[];
  recentDrops: {
    productId: string; slug: string; name: string; brand: string; category: string;
    description: string | null; image: string | null; images: string[];
    rating: number | null; reviewCount: number | null;
    offers: ModalOffer[];
    priceCurrent: number; priceOld: number; drop: number;
    dropPercent: number; store: string; externalUrl: string;
  }[];
  alerts: {
    id: string; productId: string; productName: string; productImage: string | null;
    slug: string; brand: string; category: string; description: string | null;
    images: string[]; rating: number | null; reviewCount: number | null;
    offers: ModalOffer[];
    store: string; targetPrice: number; currentPrice: number | null; active?: boolean;
    basePrice?: number;
    difference: number | null; triggered: boolean; createdAt: string;
  }[];
  recommended: {
    id: string; slug: string; name: string; brand: string; category: string;
    description: string | null; image: string | null; images: string[];
    rating: number | null; reviewCount: number | null;
    offers: ModalOffer[];
    priceCurrent: number | null; priceOld: number | null; discountPercent: number | null;
    store: string | null; externalUrl: string | null;
  }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  TELEVISORES: "Televisores", LAVADORAS: "Lavadoras", FRIGORIFICOS: "Frigoríficos",
  LAVAVAJILLAS: "Lavavajillas", SECADORAS: "Secadoras", HORNOS: "Hornos",
  MICROONDAS: "Microondas", ASPIRADORAS: "Aspiradoras", CAFETERAS: "Cafeteras",
  AIRES_ACONDICIONADOS: "Aire acondicionado", OTROS: "Otros",
};

// ─── Decision helper ─────────────────────────────────────────────────────────

function getDecision(discountPercent: number | null, drop?: number): {
  label: string; icon: string; bg: string; text: string; border: string;
} {
  const pct = discountPercent ?? 0;
  if (pct >= 25) return { label: "Compra ahora", icon: "✓", bg: "#DCFCE7", text: "#166534", border: "#86EFAC" };
  if (pct >= 15) return { label: "Buen precio",  icon: "↓", bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" };
  if (pct >= 5)  return { label: "Precio justo", icon: "~", bg: "#FEF9C3", text: "#854D0E", border: "#FDE047" };
  return              { label: "Considera esperar", icon: "⏱", bg: "#F1F5F9", text: "#475569", border: "#CBD5E1" };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#E2E8F0] rounded-xl ${className ?? ""}`} />;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  accent, label, title, count, action,
}: {
  accent: string; label: string; title: string; count?: number; action?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 rounded-full shrink-0" style={{ background: accent }} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5"
            style={{ color: accent.includes(",") ? "#7C3AED" : accent }}>
            {label}
          </p>
          <h2 className="text-[15px] font-bold text-[#0F172A] leading-tight flex items-center gap-2">
            {title}
            {count !== undefined && count > 0 && (
              <span className="text-xs font-bold text-[#94A3B8] font-normal">({count})</span>
            )}
          </h2>
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Product image ─────────────────────────────────────────────────────────────

function ProductThumb({ src, name, size = 48 }: { src: string | null; name: string; size?: number }) {
  return (
    <div
      className="rounded-xl bg-[#F8FAFC] flex items-center justify-center overflow-hidden shrink-0 relative"
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={name} fill className="object-contain p-1" sizes={`${size}px`} />
      ) : (
        <span className="text-xl">📦</span>
      )}
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, accent, highlight,
}: {
  icon: string; label: string; value: string | number; sub?: string;
  accent: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 flex items-center gap-4 transition-all ${
      highlight ? "bg-gradient-to-br from-[#0F172A] to-[#1E1B4B] border-transparent shadow-lg" : "bg-white border-[#E2E8F0] hover:border-[#C7D7F4]"
    }`}>
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ backgroundColor: highlight ? "rgba(255,255,255,0.12)" : accent + "18" }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-[22px] font-extrabold leading-tight ${highlight ? "text-white" : "text-[#0F172A]"}`}>
          {value}
        </p>
        <p className={`text-[13px] font-semibold truncate ${highlight ? "text-white/80" : "text-[#475569]"}`}>
          {label}
        </p>
        {sub && (
          <p className={`text-[11px] mt-0.5 truncate ${highlight ? "text-white/50" : "text-[#94A3B8]"}`}>{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Decision badge ────────────────────────────────────────────────────────────

function DecisionBadge({ discountPercent }: { discountPercent: number | null }) {
  const d = getDecision(discountPercent);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 whitespace-nowrap"
      style={{ background: d.bg, color: d.text, borderColor: d.border }}
    >
      <span className="font-black text-[13px] leading-none">{d.icon}</span>
      {d.label}
    </span>
  );
}

// ─── Price display ─────────────────────────────────────────────────────────────

function PriceDisplay({
  current, old, discount, large,
}: {
  current: number; old?: number | null; discount?: number | null; large?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className={`font-extrabold text-[#0F172A] ${large ? "text-2xl" : "text-base"}`}>
        {current.toFixed(2)}€
      </span>
      {old && old > current && (
        <span className={`text-[#94A3B8] line-through ${large ? "text-sm" : "text-xs"}`}>
          {old.toFixed(2)}€
        </span>
      )}
      {discount && discount > 0 && (
        <span className={`font-bold text-[#10B981] ${large ? "text-sm" : "text-xs"}`}>
          −{discount}%
        </span>
      )}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  emoji, title, sub, cta, href,
}: {
  emoji: string; title: string; sub: string; cta?: string; href?: string;
}) {
  return (
    <div className="py-10 px-6 flex flex-col items-center text-center gap-3">
      <span className="text-4xl">{emoji}</span>
      <div>
        <p className="text-[15px] font-semibold text-[#0F172A]">{title}</p>
        <p className="text-[13px] text-[#94A3B8] mt-1 max-w-xs">{sub}</p>
      </div>
      {cta && href && (
        <Link href={href}
          className="mt-1 text-sm font-semibold text-white px-5 py-2 rounded-full"
          style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}>
          {cta}
        </Link>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardClient({ user }: { user: { name: string; email: string } }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [modalProduct, setModalProduct] = useState<ModalProduct | null>(null);
  const [alertsCount, setAlertsCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error();
      setData(await res.json());
      setLastUpdated(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const silentRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) return;
      setData(await res.json());
      setLastUpdated(new Date());
    } catch {
      // silent — don't show error on background refresh
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Refetch when tab regains focus
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") silentRefresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [silentRefresh]);

  // Poll every 30 s
  useEffect(() => {
    const id = setInterval(silentRefresh, 30_000);
    return () => clearInterval(id);
  }, [silentRefresh]);

  async function refreshAlertsCount() {
    try {
      const res = await fetch("/api/price-alerts?all=1");
      if (!res.ok) return;
      const json = await res.json();
      setAlertsCount(Array.isArray(json?.alerts) ? json.alerts.length : 0);
    } catch {
      setAlertsCount(null);
    }
  }

  useEffect(() => {
    refreshAlertsCount();
    const handler = () => {
      refreshAlertsCount();
      silentRefresh();
    };
    window.addEventListener("orvexia:alerts-changed", handler);
    return () => window.removeEventListener("orvexia:alerts-changed", handler);
  }, []);

  // Listen for save/unsave events from SaveButton (any page)
  useEffect(() => {
    window.addEventListener("orvexia:data-changed", silentRefresh);
    return () => window.removeEventListener("orvexia:data-changed", silentRefresh);
  }, [silentRefresh]);

  async function deleteAlert(alertId: string) {
    await fetch("/api/price-alerts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId }),
    });
    await refreshAlertsCount();
    silentRefresh();
    window.dispatchEvent(new Event("orvexia:alerts-changed"));
  }

  async function unsave(productId: string) {
    await toggleSaved(productId);
    silentRefresh();
  }

  function openModal(product: {
    id: string; name: string; brand: string; category: string;
    description: string | null; image: string | null; images: string[];
    rating: number | null; reviewCount: number | null; offers: ModalOffer[];
  }) {
    setModalProduct(product);
  }

  const isNew = !loading && !error
    && data?.stats.savedCount === 0 && data?.stats.alertsActive === 0;

  const alertsList = (data?.alerts ?? []).map((a) => {
    const basePrice = a.offers?.[0]?.priceOld ?? a.targetPrice;
    return { ...a, basePrice };
  });

  const triggeredAlerts = alertsList.filter(
    (a) => a.currentPrice !== null && a.basePrice !== null && a.basePrice !== undefined && a.currentPrice < a.basePrice
  );
  const activeAlerts    = alertsList.filter((a) => a.active && !(a.currentPrice !== null && a.basePrice !== null && a.basePrice !== undefined && a.currentPrice < a.basePrice));

  const { profile: avatarProfile } = useProfile();
  const { toggle: toggleSaved } = useSaved();
  const firstName = user.name.split(" ")[0];
  const initials  = user.name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  // ─── LOADING ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC]">
        {/* Header */}
        <div className="bg-white border-b border-[#E2E8F0]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-4">
            <Sk className="w-11 h-11 rounded-full" />
            <div className="flex flex-col gap-2"><Sk className="h-5 w-44" /><Sk className="h-3 w-64" /></div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Sk key={i} className="h-20" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <Sk className="h-6 w-40" />
              {[1, 2, 3].map((i) => <Sk key={i} className="h-20" />)}
            </div>
            <div className="space-y-3">
              <Sk className="h-6 w-32" />
              {[1, 2].map((i) => <Sk key={i} className="h-16" />)}
            </div>
          </div>
          <Sk className="h-6 w-40" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <Sk key={i} className="h-24" />)}
          </div>
        </div>
      </main>
    );
  }

  // ─── ERROR ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center px-6 py-16 max-w-sm">
          <p className="text-5xl mb-4">⚠️</p>
          <h2 className="text-lg font-bold text-[#0F172A] mb-2">No se pudo cargar el dashboard</h2>
          <p className="text-sm text-[#94A3B8] mb-6">
            Ha ocurrido un error al obtener tus datos. Inténtalo de nuevo.
          </p>
          <button
            onClick={load}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors"
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  // ─── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#F8FAFC]">

      {/* ── TOPBAR PERSONALIZADA ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">

          {/* Left: avatar + greeting */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            {avatarProfile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarProfile.avatarUrl}
                alt={user.name}
                className="w-12 h-12 rounded-2xl object-cover shrink-0 shadow-sm"
                aria-hidden="true"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shrink-0 shadow-sm select-none"
                style={{
                  background: avatarProfile?.avatarColor ?? "linear-gradient(135deg,#2563EB,#7C3AED)",
                  fontSize: avatarProfile?.avatarEmoji ? 22 : 15,
                }}
                aria-hidden="true"
              >
                {avatarProfile?.avatarEmoji || initials}
              </div>
            )}

            {/* Text */}
            <div className="min-w-0">
              <h1 className="text-[16px] font-bold text-[#0F172A] leading-tight truncate">
                Hola, {firstName} 👋
              </h1>
              <p className="text-[12px] text-[#94A3B8] mt-0.5 truncate">
                {isNew
                  ? "Empieza guardando productos para seguir sus precios"
                  : `${data!.stats.savedCount} en seguimiento · ${data!.stats.alertsActive} alerta${data!.stats.alertsActive !== 1 ? "s" : ""} activa${data!.stats.alertsActive !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {/* Right: refresh indicator + CTA */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {lastUpdated && (
              <span className="text-[11px] text-[#CBD5E1] tabular-nums">
                {refreshing ? "Actualizando…" : `${lastUpdated.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`}
              </span>
            )}
            <button
              onClick={silentRefresh}
              disabled={refreshing}
              title="Actualizar datos"
              aria-label="Actualizar dashboard"
              className={`flex items-center justify-center w-7 h-7 rounded-lg text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F9] transition-all disabled:opacity-30 ${refreshing ? "animate-spin" : ""}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
              </svg>
            </button>
            <Link
              href="/ofertas-destacadas"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-full hover:opacity-90 transition-opacity shadow-sm"
              style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}
            >
              Explorar ofertas →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 space-y-7">

        {/* ── TRIGGERED ALERTS BANNER ──────────────────────────────────────── */}
        {triggeredAlerts.length > 0 && (
          <div
            className="rounded-2xl p-4 sm:p-5 space-y-3 border border-[#22C55E]/30 bg-[#ECFDF3]"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center text-white text-xl shrink-0 shadow-sm">
                🎯
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-sm font-extrabold text-[#14532D] uppercase tracking-wide">
                    ¡{triggeredAlerts.length === 1 ? "Producto en oferta" : `${triggeredAlerts.length} productos en oferta`}!
                  </p>
                  <Link
                    href="/ofertas-destacadas"
                    className="inline-flex items-center justify-center text-sm font-bold text-white bg-[#16A34A] hover:bg-[#15803D] px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Ver ofertas →
                  </Link>
                </div>
                <p className="text-[12px] text-[#166534]">Mejor precio vs. su base original.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {triggeredAlerts.map((a) => (
                <div
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    openModal({
                      id: a.productId,
                      name: a.productName,
                      brand: a.brand,
                      category: a.category,
                      description: a.description,
                      image: a.productImage ?? null,
                      images: a.images ?? [],
                      rating: a.rating,
                      reviewCount: a.reviewCount,
                      offers:
                        a.offers.length > 0
                          ? a.offers
                          : [
                              {
                                store: a.store,
                                priceCurrent: a.currentPrice ?? 0,
                                priceOld: a.basePrice ?? undefined,
                                discountPercent:
                                  a.basePrice && a.currentPrice
                                    ? Math.max(0, Math.round((1 - a.currentPrice / a.basePrice) * 100))
                                    : null,
                                externalUrl: "#",
                              },
                            ],
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      openModal({
                        id: a.productId,
                        name: a.productName,
                        brand: a.brand,
                        category: a.category,
                        description: a.description,
                        image: a.productImage ?? null,
                        images: a.images ?? [],
                        rating: a.rating,
                        reviewCount: a.reviewCount,
                        offers:
                          a.offers.length > 0
                            ? a.offers
                            : [
                                {
                                  store: a.store,
                                  priceCurrent: a.currentPrice ?? 0,
                                  priceOld: a.basePrice ?? undefined,
                                  discountPercent:
                                    a.basePrice && a.currentPrice
                                      ? Math.max(0, Math.round((1 - a.currentPrice / a.basePrice) * 100))
                                      : null,
                                  externalUrl: "#",
                                },
                              ],
                      });
                    }
                  }}
                  className="relative overflow-hidden rounded-xl bg-white border border-[#22C55E]/40 px-3 py-2 flex flex-col gap-1 shadow-[0_6px_16px_rgba(34,197,94,0.08)] hover:shadow-[0_10px_24px_rgba(34,197,94,0.14)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E]"
                >
                  <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#22C55E] to-[#16A34A]" aria-hidden="true" />
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] mt-2" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#0F172A] line-clamp-1">{a.productName}</p>
                      <p className="text-[11px] text-[#16A34A] font-bold">
                        Ahora {a.currentPrice?.toFixed(0)}€{" "}
                        {a.basePrice ? (
                          <span className="text-[#14532D] font-semibold">
                            (−{Math.max(0, Math.round((1 - (a.currentPrice ?? 0) / a.basePrice) * 100))}% vs {a.basePrice.toFixed(0)}€)
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-[#6B7280]">
                        Tienda: {a.store || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STATS ROW ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            icon="💰" label="Ahorro potencial"
            value={data!.stats.potentialSavings > 0 ? `${data!.stats.potentialSavings.toFixed(0)}€` : "—"}
            sub={data!.stats.potentialSavings > 0 ? "en tus productos guardados" : "Guarda productos con descuento"}
            accent="#10B981"
            highlight={data!.stats.potentialSavings > 0}
          />
          <StatCard
            icon="📦" label="Productos guardados"
            value={data!.stats.savedCount}
            sub={data!.stats.savedCount === 0 ? "Guarda tu primer producto" : `${data!.recentDrops.length} con bajada reciente`}
            accent="#2563EB"
          />
          <StatCard
            icon="🔔" label="Alertas activas"
            value={
              alertsCount !== null
                ? alertsCount
                : activeAlerts.length
            }
            sub={triggeredAlerts.length > 0 ? `¡${triggeredAlerts.length} en oferta!` : "Te avisamos cuando baje"}
            accent="#7C3AED"
          />
        </div>

        {/* ── NEW USER ONBOARDING ───────────────────────────────────────────── */}
        {isNew && (
          <div
            className="rounded-3xl overflow-hidden"
            style={{ background: "linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#1D4ED8 100%)" }}
          >
            <div className="px-6 sm:px-10 py-10 text-center">
              <p className="text-5xl mb-4">🚀</p>
              <h2 className="text-2xl font-extrabold text-white mb-2">Empieza a comprar más inteligente</h2>
              <p className="text-white/70 mb-7 max-w-md mx-auto text-sm leading-relaxed">
                Guarda productos que te interesan, crea alertas de precio y te
                avisamos cuando bajen. Compara entre tiendas con un solo clic.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/ofertas-destacadas"
                  className="bg-white text-[#1D4ED8] font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#EFF6FF] transition-all w-full sm:w-auto text-center">
                  Ver ofertas destacadas
                </Link>
                <Link href="/categorias"
                  className="text-white font-semibold px-6 py-3 rounded-xl border border-white/25 text-sm hover:bg-white/10 transition-all w-full sm:w-auto text-center">
                  Explorar categorías
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── MAIN 2-COLUMN GRID ───────────────────────────────────────────── */}
        {!isNew && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* LEFT (2/3): Oportunidades ─────────────────────────────────── */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <SectionHeader
                accent="linear-gradient(180deg,#10B981,#059669)"
                label="Bajadas en tu watchlist"
                title="Oportunidades de hoy"
                count={data!.recentDrops.length}
              />

              {data!.recentDrops.length === 0 ? (
                <EmptyState
                  emoji="📊"
                  title="Sin bajadas recientes"
                  sub="Te avisaremos cuando uno de tus productos baje de precio."
                />
              ) : (
                <div className="divide-y divide-[#F8FAFC]">
                  {data!.recentDrops.map((drop) => (
                    <div
                      key={drop.productId}
                      role="button"
                      tabIndex={0}
                      aria-label={`Ver detalles de ${drop.name}`}
                      className="flex items-center gap-3 p-4 hover:bg-[#F8FAFC] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#2563EB] focus-visible:outline-offset-[-2px]"
                      onClick={() => openModal({
                        id: drop.productId, name: drop.name, brand: drop.brand,
                        category: drop.category, description: drop.description,
                        image: drop.image, images: drop.images,
                        rating: drop.rating, reviewCount: drop.reviewCount,
                        offers: drop.offers,
                      })}
                      onKeyDown={(e) => e.key === "Enter" && openModal({
                        id: drop.productId, name: drop.name, brand: drop.brand,
                        category: drop.category, description: drop.description,
                        image: drop.image, images: drop.images,
                        rating: drop.rating, reviewCount: drop.reviewCount,
                        offers: drop.offers,
                      })}
                    >
                      {/* Image */}
                      <ProductThumb src={drop.image} name={drop.name} size={48} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#0F172A] line-clamp-1 leading-snug">
                          {drop.name}
                        </p>
                        <p className="text-[12px] text-[#94A3B8] mb-1">{drop.store}</p>
                        <PriceDisplay current={drop.priceCurrent} old={drop.priceOld} discount={drop.dropPercent} />
                      </div>

                      {/* Decision badge */}
                      <DecisionBadge discountPercent={drop.dropPercent} />

                      {/* CTA */}
                      <a
                        href={drop.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Comprar ${drop.name} en ${drop.store}`}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 text-[12px] font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
                      >
                        Ver →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT (1/3): Alertas ────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <SectionHeader
                accent="linear-gradient(180deg,#7C3AED,#6D28D9)"
                label="Precio objetivo"
                title="Mis alertas"
                count={data!.alerts.length}
                action={
                  triggeredAlerts.length > 0 ? (
                    <span className="text-[11px] font-bold text-white bg-[#EF4444] px-2 py-0.5 rounded-full">
                      {triggeredAlerts.length} activ{triggeredAlerts.length > 1 ? "as" : "a"}
                    </span>
                  ) : undefined
                }
              />

              {data!.alerts.length === 0 ? (
                <EmptyState
                  emoji="🔔"
                  title="Sin alertas todavía"
                  sub="Abre un producto y crea una alerta para recibir aviso cuando baje."
                />
              ) : (
                <div className="divide-y divide-[#F8FAFC]">
                  {/* Triggered primero */}
                  {[...triggeredAlerts, ...activeAlerts].map((alert) => {
                    const reached = alert.currentPrice !== null && alert.basePrice !== null && alert.basePrice !== undefined && alert.currentPrice < alert.basePrice;
                    return (
                      <div
                        key={alert.id}
                        className={`flex items-start gap-3 p-4 transition-colors cursor-pointer ${
                          reached ? "bg-[#ECFDF3] border-l-4 border-[#22C55E]/60" : "hover:bg-[#F8FAFC]"
                        }`}
                        onClick={() => openModal({
                          id: alert.productId,
                          name: alert.productName,
                          brand: alert.brand,
                          category: alert.category,
                      description: alert.description,
                      image: alert.productImage ?? null,
                      images: alert.images ?? [],
                      rating: alert.rating,
                      reviewCount: alert.reviewCount,
                      offers: alert.offers.length > 0 ? alert.offers : (alert.currentPrice !== null ? [{
                        store: alert.store,
                        priceCurrent: alert.currentPrice,
                        priceOld: alert.basePrice ?? undefined,
                        discountPercent: alert.basePrice ? Math.max(0, Math.round((1 - alert.currentPrice / alert.basePrice) * 100)) : null,
                        externalUrl: "#",
                      }] : []),
                    })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            openModal({
                              id: alert.productId,
                              name: alert.productName,
                              brand: alert.brand,
                              category: alert.category,
                              description: alert.description,
                              image: alert.productImage ?? null,
                              images: alert.images ?? [],
                              rating: alert.rating,
                              reviewCount: alert.reviewCount,
                              offers: alert.offers.length > 0 ? alert.offers : (alert.currentPrice !== null ? [{
                                store: alert.store,
                                priceCurrent: alert.currentPrice,
                                priceOld: alert.basePrice ?? undefined,
                                discountPercent: alert.basePrice ? Math.max(0, Math.round((1 - alert.currentPrice / alert.basePrice) * 100)) : null,
                                externalUrl: "#",
                              }] : []),
                            });
                          }
                        }}
                        tabIndex={0}
                      >
                        {/* State indicator */}
                        <div
                          className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${reached ? "bg-[#22C55E]" : "bg-[#94A3B8]"}`}
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#0F172A] line-clamp-1 leading-snug">
                            {alert.productName}
                          </p>
                          <p className="text-[11px] mt-0.5">
                            <span className="font-medium text-[#475569]">Precio base:</span>{" "}
                            <span className={reached ? "text-[#14532D] font-semibold" : "text-[#6B7280]"}>
                              {alert.basePrice ? `${alert.basePrice.toFixed(0)}€` : "—"}
                            </span>
                            {alert.currentPrice !== null && (
                              <>
                                {" · "}
                                <span className="font-medium text-[#475569]">Ahora:</span>{" "}
                                <span className={reached ? "font-bold text-[#16A34A]" : alert.currentPrice === alert.basePrice ? "text-[#94A3B8]" : "text-[#0F172A]"}>
                                  {alert.currentPrice.toFixed(0)}€
                                </span>
                                {reached && alert.basePrice ? (
                                  <span className="text-[11px] text-[#14532D] font-semibold">
                                    {" "}(−{Math.max(0, Math.round((1 - (alert.currentPrice ?? 0) / alert.basePrice) * 100))}%)
                                  </span>
                                ) : null}
                              </>
                            )}
                          </p>
                          {reached && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-[#14532D] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                              <span aria-hidden="true">✓</span> ¡Precio alcanzado!
                            </span>
                          )}
                        </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteAlert(alert.id); }}
                        aria-label={`Eliminar alerta de ${alert.productName}`}
                        className="shrink-0 text-[#CBD5E1] hover:text-[#EF4444] transition-colors p-1 rounded focus-visible:outline-2 focus-visible:outline-[#EF4444]"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── WATCHLIST ─────────────────────────────────────────────────────── */}
        {!isNew && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <SectionHeader
              accent="linear-gradient(180deg,#2563EB,#7C3AED)"
              label="Tu lista de seguimiento"
              title="Watchlist"
              count={data!.savedProducts.length}
            />

            {data!.savedProducts.length === 0 ? (
              <EmptyState
                emoji="📋"
                title="Tu watchlist está vacía"
                sub="Añade productos con el icono de marcador y sigue sus precios."
                cta="Explorar ofertas"
                href="/ofertas-destacadas"
              />
            ) : (
              <>
                {/* Table header — desktop only */}
                <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-2.5 bg-[#F8FAFC] border-b border-[#F1F5F9] text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  <span>Producto</span>
                  <span className="text-right">Precio</span>
                  <span className="text-center w-32">¿Compro ahora?</span>
                  <span className="w-16" />
                </div>

                <div className="divide-y divide-[#F8FAFC]">
                  {data!.savedProducts.map((sp) => (
                    <div
                      key={sp.id}
                      className="group relative flex sm:grid sm:grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563EB]"
                      role="button"
                      tabIndex={0}
                      aria-label={`Ver detalles de ${sp.name}`}
                      onClick={() => openModal({
                        id: sp.productId, name: sp.name, brand: sp.brand,
                        category: sp.category, description: sp.description,
                        image: sp.image, images: sp.images,
                        rating: sp.rating, reviewCount: sp.reviewCount,
                        offers: sp.offers,
                      })}
                      onKeyDown={(e) => e.key === "Enter" && openModal({
                        id: sp.productId, name: sp.name, brand: sp.brand,
                        category: sp.category, description: sp.description,
                        image: sp.image, images: sp.images,
                        rating: sp.rating, reviewCount: sp.reviewCount,
                        offers: sp.offers,
                      })}
                    >
                      {/* Product info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ProductThumb src={sp.image} name={sp.name} size={44} />
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-[#0F172A] line-clamp-1 leading-snug">
                            {sp.name}
                          </p>
                          <p className="text-[11px] text-[#94A3B8]">
                            {CATEGORY_LABELS[sp.category] ?? sp.category}
                            {sp.store && <> · {sp.store}</>}
                          </p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="hidden sm:block text-right shrink-0">
                        {sp.priceCurrent !== null && (
                          <PriceDisplay
                            current={sp.priceCurrent}
                            old={sp.priceOld}
                            discount={sp.discountPercent}
                          />
                        )}
                      </div>

                      {/* Decision */}
                      <div className="hidden sm:flex justify-center w-32 shrink-0">
                        <DecisionBadge discountPercent={sp.discountPercent} />
                      </div>

                      {/* Actions */}
                      <div
                        className="hidden sm:flex items-center gap-3 w-20 justify-end shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {sp.externalUrl && (
                          <a
                            href={sp.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Ver ${sp.name} en tienda`}
                            className="text-[12px] font-bold text-[#2563EB] hover:underline"
                          >
                            Ver →
                          </a>
                        )}
                        <button
                          onClick={async (e) => { e.stopPropagation(); await unsave(sp.productId); }}
                          aria-label={`Quitar ${sp.name} de la watchlist`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] hover:text-[#EF4444] hover:border-[#EF4444] shrink-0"
                        >
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Mobile: price + unsave */}
                      <div className="sm:hidden flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {sp.priceCurrent !== null && (
                          <span className="text-[14px] font-bold text-[#0F172A]">
                            {sp.priceCurrent.toFixed(0)}€
                          </span>
                        )}
                        {sp.discountPercent && sp.discountPercent > 0 && (
                          <span className="text-[11px] font-bold text-[#10B981]">−{sp.discountPercent}%</span>
                        )}
                        <button
                          onClick={async (e) => { e.stopPropagation(); await unsave(sp.productId); }}
                          aria-label={`Quitar ${sp.name} de la watchlist`}
                          className="w-6 h-6 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] hover:text-[#EF4444] hover:border-[#EF4444] shrink-0"
                        >
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── RECOMENDADOS ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          <SectionHeader
            accent="linear-gradient(180deg,#F97316,#EF4444)"
            label={isNew ? "Populares ahora" : "Basado en tus guardados"}
            title="Recomendados para ti"
            action={
              <Link href="/ofertas-destacadas"
                className="text-[12px] font-semibold text-[#2563EB] hover:underline shrink-0">
                Ver todos →
              </Link>
            }
          />

          {(data?.recommended.length ?? 0) === 0 ? (
            <EmptyState
              emoji="✨"
              title="Sin recomendaciones"
              sub="A medida que guardes productos, aquí verás alternativas relevantes."
            />
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {data!.recommended.map((p) => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Ver detalles de ${p.name}`}
                  className="group flex gap-3 p-3 rounded-xl border border-[#F1F5F9] hover:border-[#C7D7F4] hover:shadow-sm transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                  onClick={() => openModal({
                    id: p.id, name: p.name, brand: p.brand,
                    category: p.category, description: p.description,
                    image: p.image, images: p.images,
                    rating: p.rating, reviewCount: p.reviewCount,
                    offers: p.offers,
                  })}
                  onKeyDown={(e) => e.key === "Enter" && openModal({
                    id: p.id, name: p.name, brand: p.brand,
                    category: p.category, description: p.description,
                    image: p.image, images: p.images,
                    rating: p.rating, reviewCount: p.reviewCount,
                    offers: p.offers,
                  })}
                >
                  {/* Image */}
                  <div className="relative shrink-0">
                    <ProductThumb src={p.image} name={p.name} size={52} />
                    {p.discountPercent && p.discountPercent > 0 && (
                      <span className="absolute -top-1 -left-1 text-[9px] font-black text-white bg-[#EF4444] px-1 py-0.5 rounded-md leading-none">
                        −{p.discountPercent}%
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#0F172A] line-clamp-2 leading-snug mb-1">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-[#94A3B8] mb-1.5">
                      {CATEGORY_LABELS[p.category] ?? p.category}
                    </p>
                    {p.priceCurrent !== null && (
                      <PriceDisplay current={p.priceCurrent} old={p.priceOld} discount={p.discountPercent} />
                    )}
                  </div>

                  {/* Save button */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <SaveButton productId={p.id} className="w-8 h-8" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── MODAL ───────────────────────────────────────────────────────────── */}
      {modalProduct && (
        <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />
      )}
    </main>
  );
}
