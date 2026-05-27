/**
 * Subcomponentes presentacionales del inspector y del canvas.
 * No tienen estado propio — pura presentación. Extraídos para reducir el
 * monolito de ProductNetwork.tsx.
 */

export interface CostFieldProps {
  label: string;
  value: string;
  set: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}

export function CostField({
  label,
  value,
  set,
  placeholder,
  disabled,
}: CostFieldProps) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        inputMode="decimal"
        placeholder={placeholder}
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
      />
    </label>
  );
}

export interface RowProps {
  k: string;
  v: string;
  warn?: boolean;
  accent?: boolean;
}

export function Row({ k, v, warn, accent }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/45">{k}</span>
      <span
        className={`font-mono font-semibold tabular-nums ${
          warn
            ? "text-amber-300"
            : accent
              ? "text-cyan-200"
              : "text-white/85"
        }`}
      >
        {v}
      </span>
    </div>
  );
}

export interface ZoomBtnProps {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}

export function ZoomBtn({ children, label, onClick }: ZoomBtnProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="h-9 w-9 grid place-items-center rounded-lg border border-white/15 bg-[rgba(8,8,20,0.7)] backdrop-blur text-white/80 text-lg leading-none hover:bg-white/10 hover:text-white transition-colors"
    >
      {children}
    </button>
  );
}
