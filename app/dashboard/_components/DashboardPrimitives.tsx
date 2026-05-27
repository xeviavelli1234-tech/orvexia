"use client";

import Image from "next/image";
import Link from "next/link";
import { getDecision } from "./helpers";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-bg-muted rounded-xl ${className ?? ""}`} />;
}

// ─── Section header ───────────────────────────────────────────────────────────

export function SectionHeader({
  accent, label, title, count, action,
}: {
  accent: string; label: string; title: string; count?: number; action?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 rounded-full shrink-0" style={{ background: accent }} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5"
            style={{ color: accent.includes(",") ? "#7C3AED" : accent }}>
            {label}
          </p>
          <h2 className="text-[15px] font-bold text-fg leading-tight flex items-center gap-2">
            {title}
            {count !== undefined && count > 0 && (
              <span className="text-xs font-bold text-fg-subtle font-normal">({count})</span>
            )}
          </h2>
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Product image ─────────────────────────────────────────────────────────────

export function ProductThumb({ src, name, size = 48 }: { src: string | null; name: string; size?: number }) {
  return (
    <div
      className="rounded-xl bg-bg-subtle flex items-center justify-center overflow-hidden shrink-0 relative"
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

export function StatCard({
  icon, label, value, sub, accent, highlight,
}: {
  icon: string; label: string; value: string | number; sub?: string;
  accent: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 flex items-center gap-4 transition-all ${
      highlight ? "bg-gradient-to-br from-[#0F172A] to-[#1E1B4B] border-transparent shadow-lg" : "bg-bg-elevated border-border hover:border-[#C7D7F4]"
    }`}>
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ backgroundColor: highlight ? "rgba(255,255,255,0.12)" : accent + "18" }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-[22px] font-extrabold leading-tight ${highlight ? "text-white" : "text-fg"}`}>
          {value}
        </p>
        <p className={`text-[13px] font-semibold truncate ${highlight ? "text-white/80" : "text-fg-muted"}`}>
          {label}
        </p>
        {sub && (
          <p className={`text-[11px] mt-0.5 truncate ${highlight ? "text-white/50" : "text-fg-subtle"}`}>{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Decision badge ────────────────────────────────────────────────────────────

export function DecisionBadge({ discountPercent }: { discountPercent: number | null }) {
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

export function PriceDisplay({
  current, old, discount, large,
}: {
  current: number; old?: number | null; discount?: number | null; large?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className={`font-extrabold text-fg ${large ? "text-2xl" : "text-base"}`}>
        {current.toFixed(2)}€
      </span>
      {old && old > current && (
        <span className={`text-fg-subtle line-through ${large ? "text-sm" : "text-xs"}`}>
          {old.toFixed(2)}€
        </span>
      )}
      {discount && discount > 0 && (
        <span className={`font-bold text-accent-500 ${large ? "text-sm" : "text-xs"}`}>
          −{discount}%
        </span>
      )}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

export function EmptyState({
  emoji, title, sub, cta, href,
}: {
  emoji: string; title: string; sub: string; cta?: string; href?: string;
}) {
  return (
    <div className="py-10 px-6 flex flex-col items-center text-center gap-3">
      <span className="text-4xl">{emoji}</span>
      <div>
        <p className="text-[15px] font-semibold text-fg">{title}</p>
        <p className="text-[13px] text-fg-subtle mt-1 max-w-xs">{sub}</p>
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
