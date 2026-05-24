import * as React from "react";
import Link from "next/link";
import { cn } from "./cn";
import { Spinner } from "./Spinner";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "hot"
  | "dark"
  | "neon"
  | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap " +
  "transition-all duration-150 ease-out select-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
  "disabled:opacity-50 disabled:pointer-events-none " +
  "active:scale-[0.97]";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 hover:bg-brand-700 text-white shadow-sm shadow-brand-600/20 hover:shadow-md hover:shadow-brand-600/30",
  secondary:
    "bg-bg-elevated text-fg border border-border hover:bg-bg-subtle hover:border-border-strong",
  ghost:
    "text-fg-muted hover:text-fg hover:bg-bg-subtle",
  outline:
    "bg-transparent text-fg-muted border border-border hover:text-fg hover:border-border-strong hover:bg-bg-subtle",
  hot:
    "bg-hot-600 hover:bg-hot-700 text-white shadow-sm shadow-hot-600/20 hover:shadow-md hover:shadow-hot-600/30",
  dark:
    "bg-fg-strong hover:bg-fg text-bg shadow-sm",
  neon:
    "bg-transparent text-cyan-200 border border-cyan-400/40 hover:bg-cyan-400/10 hover:border-cyan-400/60 hover:text-cyan-100 shadow-[0_0_18px_-8px_rgba(34,211,238,0.6)] hover:shadow-[0_0_22px_-6px_rgba(34,211,238,0.8)]",
  danger:
    "bg-rose-500/90 hover:bg-rose-500 text-white shadow-sm shadow-rose-500/20 hover:shadow-md hover:shadow-rose-500/30",
};

const sizes: Record<Size, string> = {
  sm: "text-xs px-3 h-8 rounded-md",
  md: "text-sm px-4 h-10 rounded-lg",
  lg: "text-sm px-5 h-12 rounded-xl",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  /** When true, replaces the leading area with a spinner and disables the button. */
  loading?: boolean;
  /** Optional label shown next to the spinner while loading (defaults to children). */
  loadingText?: React.ReactNode;
  children: React.ReactNode;
};

type ButtonProps = CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>;
type AnchorProps = CommonProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

const spinnerSizeFor: Record<Size, "xs" | "sm" | "md"> = {
  sm: "xs",
  md: "sm",
  lg: "sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  loading = false,
  loadingText,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={spinnerSizeFor[size]} />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  loading = false,
  loadingText,
  href,
  children,
  ...props
}: AnchorProps) {
  const isExternal = /^https?:\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
  const cls = cn(
    base,
    variants[variant],
    sizes[size],
    loading && "opacity-60 pointer-events-none",
    className,
  );
  const content = loading ? (
    <>
      <Spinner size={spinnerSizeFor[size]} />
      <span>{loadingText ?? children}</span>
    </>
  ) : (
    children
  );
  if (isExternal) {
    return (
      <a href={href} className={cls} {...props}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
      {content}
    </Link>
  );
}
