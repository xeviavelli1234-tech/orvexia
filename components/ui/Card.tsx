import * as React from "react";
import { cn } from "./cn";

type Variant = "default" | "elevated" | "subtle" | "ghost";
type Padding = "none" | "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  default:
    "bg-bg-elevated border border-border",
  elevated:
    "bg-bg-elevated border border-border shadow-md",
  subtle:
    "bg-bg-subtle border border-border-subtle",
  ghost:
    "bg-transparent border border-border",
};

const paddings: Record<Padding, string> = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  padding?: Padding;
  hoverable?: boolean;
}

export function Card({
  variant = "default",
  padding = "md",
  hoverable = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl transition-all duration-200 ease-out",
        variants[variant],
        paddings[padding],
        hoverable && "hover:border-border-strong hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
