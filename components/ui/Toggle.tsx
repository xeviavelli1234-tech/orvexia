"use client";

/**
 * Toggle binario estándar de la app — switch verde con glow cuando está ON.
 * Antes vivía duplicado en AccountSettings y ProductNetwork; ahora un único
 * componente para mantener la estética en un solo sitio.
 */
export interface ToggleProps {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** Texto accesible para lectores de pantalla cuando no hay label visible. */
  ariaLabel?: string;
}

export function Toggle({ on, onClick, disabled, ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
        on
          ? "bg-emerald-500 shadow-[0_0_14px_-2px_rgba(16,185,129,0.7)]"
          : "bg-white/15"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default Toggle;
