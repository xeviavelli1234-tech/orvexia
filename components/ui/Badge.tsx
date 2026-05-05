import * as React from "react";
import { cn } from "./cn";

type Tone = "neutral" | "brand" | "accent" | "hot" | "warn" | "danger" | "dark";
type Size = "sm" | "md";

const tones: Record<Tone, string> = {
  neutral: "bg-bg-subtle text-fg-muted border-border",
  brand:   "bg-brand-50 text-brand-700 border-brand-100",
  accent:  "bg-accent-50 text-accent-700 border-accent-100",
  hot:     "bg-hot-50 text-hot-700 border-hot-100",
  warn:    "bg-amber-50 text-amber-700 border-amber-100",
  danger:  "bg-danger-500 text-white border-transparent",
  dark:    "bg-fg-strong text-bg border-transparent",
};

const sizes: Record<Size, string> = {
  sm: "text-[10px] h-5 px-2 rounded-md font-bold tracking-wide",
  md: "text-xs h-6 px-2.5 rounded-md font-semibold",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: Size;
}

export function Badge({
  tone = "neutral",
  size = "sm",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border whitespace-nowrap",
        tones[tone],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

interface SectionLabelProps extends React.HTMLAttributes<HTMLParagraphElement> {
  tone?: "brand" | "hot" | "accent" | "neutral";
}

const labelTones = {
  brand: "text-brand-600",
  hot: "text-hot-600",
  accent: "text-accent-600",
  neutral: "text-fg-subtle",
};

export function SectionLabel({
  tone = "brand",
  className,
  children,
  ...props
}: SectionLabelProps) {
  return (
    <p
      className={cn(
        "text-[10px] font-bold uppercase tracking-[0.2em]",
        labelTones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}
