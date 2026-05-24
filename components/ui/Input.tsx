import * as React from "react";
import { cn } from "./cn";

type Tone = "default" | "dark";
type Size = "sm" | "md";
type State = "default" | "error" | "success";

const base =
  "block rounded-lg font-medium transition-colors duration-150 " +
  "focus:outline-none focus-visible:outline-none " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none " +
  "placeholder:text-current placeholder:opacity-40";

const tones: Record<Tone, string> = {
  default:
    "bg-bg border border-fg/15 text-fg focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/25",
  dark:
    "bg-black/40 border border-white/15 text-white focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20",
};

const states: Record<State, string> = {
  default: "",
  error:
    "!border-rose-400/60 focus:!border-rose-400 focus:!ring-rose-400/25",
  success:
    "!border-emerald-400/50 focus:!border-emerald-400 focus:!ring-emerald-400/25",
};

const sizes: Record<Size, string> = {
  sm: "h-8 text-xs px-2.5",
  md: "h-10 text-sm px-3",
};

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  tone?: Tone;
  inputSize?: Size;
  state?: State;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { tone = "default", inputSize = "md", state = "default", className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(base, tones[tone], states[state], sizes[inputSize], className)}
      {...props}
    />
  );
});

export type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  tone?: Tone;
  inputSize?: Size;
  state?: State;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { tone = "default", inputSize = "md", state = "default", className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(base, tones[tone], states[state], sizes[inputSize], "pr-8", className)}
      {...props}
    >
      {children}
    </select>
  );
});
