import { cn } from "./cn";

type Size = "xs" | "sm" | "md" | "lg";

const sizes: Record<Size, string> = {
  xs: "w-3 h-3 border-2",
  sm: "w-4 h-4 border-2",
  md: "w-5 h-5 border-2",
  lg: "w-7 h-7 border-[3px]",
};

/**
 * Minimal, zero-dep spinner.
 *
 * Two-color ring (transparent top, currentColor everywhere else) so it inherits
 * the parent text color and looks right on any background. Use `className` to
 * override the color (e.g. `text-cyan-300`) or the size.
 */
export function Spinner({
  size = "sm",
  className,
  label = "Cargando",
}: {
  size?: Size;
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block rounded-full border-current border-t-transparent animate-spin",
        sizes[size],
        className,
      )}
    />
  );
}
