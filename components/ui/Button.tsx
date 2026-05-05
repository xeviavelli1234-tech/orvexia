import * as React from "react";
import Link from "next/link";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "hot" | "dark";
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
  children: React.ReactNode;
};

type ButtonProps = CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>;
type AnchorProps = CommonProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
  ...props
}: AnchorProps) {
  const isExternal = /^https?:\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
  const cls = cn(base, variants[variant], sizes[size], className);
  if (isExternal) {
    return (
      <a href={href} className={cls} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
      {children}
    </Link>
  );
}
