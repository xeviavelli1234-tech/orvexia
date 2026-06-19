import React from "react";

// Tiny reusable HUD bracket frame
export function HudFrame({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`hud-corners ${className}`}>
      <span className="hud-tl" /><span className="hud-tr" /><span className="hud-bl" /><span className="hud-br" />
      {children}
    </div>
  );
}

// Kicker pill — the small mono "eyebrow" above section titles. Pulsing dot +
// accent-tinted glassy chip. Reused by the hero and every SectionHeading so the
// whole page shares one consistent label language.
export function Kicker({ label, accent = "#5EEAD4" }: { label: React.ReactNode; accent?: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3.5 h-7 font-mono-ui text-[10px] uppercase tracking-[0.18em] backdrop-blur-sm"
      style={{ color: accent, background: `${accent}14`, border: `1px solid ${accent}38`, boxShadow: `0 0 28px -12px ${accent}` }}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: accent }} />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
      </span>
      {label}
    </span>
  );
}

// Centered section heading: kicker → big gradient-accented title → short accent
// hairline → optional subtitle. One primitive so every section reads the same.
export function SectionHeading({
  kicker,
  accent = "#5EEAD4",
  title,
  subtitle,
  className = "",
}: {
  kicker: React.ReactNode;
  accent?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto mb-12 max-w-2xl text-center ${className}`}>
      <Kicker label={kicker} accent={accent} />
      <h2
        className="mt-5 font-extrabold text-white"
        style={{ fontSize: "clamp(2rem, 5vw, 3.1rem)", lineHeight: 1.04, letterSpacing: "-0.03em" }}
      >
        {title}
      </h2>
      <div
        className="mx-auto mt-5 h-px w-14 rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      {subtitle ? (
        <p className="mt-5 text-[15px] leading-relaxed text-white/55">{subtitle}</p>
      ) : null}
    </div>
  );
}
