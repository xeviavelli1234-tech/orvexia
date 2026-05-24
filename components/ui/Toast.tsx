"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Spinner } from "./Spinner";
import { cn } from "./cn";

// ─── Types ────────────────────────────────────────────────────────────────

type Variant = "success" | "error" | "info" | "loading";

interface ToastItem {
  id: string;
  variant: Variant;
  message: string;
  description?: string;
  duration: number;
  createdAt: number;
}

interface ToastApi {
  success: (message: string, opts?: { description?: string; duration?: number }) => string;
  error: (message: string, opts?: { description?: string; duration?: number }) => string;
  info: (message: string, opts?: { description?: string; duration?: number }) => string;
  loading: (message: string, opts?: { description?: string }) => string;
  /**
   * Replace a previous toast (typically a loading one) with a new variant.
   * Returns the same id.
   */
  update: (
    id: string,
    next: {
      variant: Variant;
      message: string;
      description?: string;
      duration?: number;
    },
  ) => void;
  dismiss: (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    // Safe no-op fallback so consumers don't crash if used outside the provider.
    // Returns an empty id; not ideal but better than a hard error in dev SSR.
    const noop = () => "";
    return {
      success: noop,
      error: noop,
      info: noop,
      loading: noop,
      update: () => undefined,
      dismiss: () => undefined,
    };
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────

const DEFAULT_DURATION: Record<Variant, number> = {
  success: 3500,
  error: 5500,
  info: 3500,
  loading: 0, // sticky until updated or dismissed
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const timeouts = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    // Defer the mount flag flip so React doesn't see a setState in the effect
    // body (cascading render lint rule). Microtask is enough — we just need it
    // off the render path of the initial pass.
    queueMicrotask(() => setMounted(true));
    const handles = timeouts.current;
    return () => {
      for (const t of handles.values()) clearTimeout(t);
      handles.clear();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((arr) => arr.filter((t) => t.id !== id));
    const handle = timeouts.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timeouts.current.delete(id);
    }
  }, []);

  const scheduleDismiss = useCallback(
    (id: string, duration: number) => {
      const prev = timeouts.current.get(id);
      if (prev) clearTimeout(prev);
      if (duration <= 0) {
        timeouts.current.delete(id);
        return;
      }
      const handle = setTimeout(() => dismiss(id), duration);
      timeouts.current.set(id, handle);
    },
    [dismiss],
  );

  const push = useCallback(
    (variant: Variant, message: string, opts?: { description?: string; duration?: number }) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const duration = opts?.duration ?? DEFAULT_DURATION[variant];
      const item: ToastItem = {
        id,
        variant,
        message,
        description: opts?.description,
        duration,
        createdAt: Date.now(),
      };
      setToasts((arr) => [...arr, item]);
      scheduleDismiss(id, duration);
      return id;
    },
    [scheduleDismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, o) => push("success", m, o),
      error: (m, o) => push("error", m, o),
      info: (m, o) => push("info", m, o),
      loading: (m, o) => push("loading", m, { ...o, duration: 0 }),
      update: (id, next) => {
        setToasts((arr) =>
          arr.map((t) =>
            t.id === id
              ? {
                  ...t,
                  variant: next.variant,
                  message: next.message,
                  description: next.description,
                  duration: next.duration ?? DEFAULT_DURATION[next.variant],
                }
              : t,
          ),
        );
        scheduleDismiss(id, next.duration ?? DEFAULT_DURATION[next.variant]);
      },
      dismiss,
    }),
    [push, dismiss, scheduleDismiss],
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {mounted && typeof document !== "undefined"
        ? createPortal(<ToastViewport items={toasts} onDismiss={dismiss} />, document.body)
        : null}
    </ToastCtx.Provider>
  );
}

// ─── Viewport ─────────────────────────────────────────────────────────────

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-3 pb-4 sm:items-end sm:px-5 sm:pb-5"
    >
      {items.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────

const variantStyles: Record<
  Variant,
  { ring: string; label: string; iconColor: string; tag: string }
> = {
  success: {
    ring: "border-emerald-400/30 shadow-[0_0_28px_-12px_rgba(16,185,129,0.7)]",
    label: "text-emerald-300",
    iconColor: "text-emerald-300",
    tag: "▸ /ok",
  },
  error: {
    ring: "border-rose-400/35 shadow-[0_0_28px_-12px_rgba(244,63,94,0.7)]",
    label: "text-rose-300",
    iconColor: "text-rose-300",
    tag: "▸ /err",
  },
  info: {
    ring: "border-cyan-400/30 shadow-[0_0_28px_-12px_rgba(34,211,238,0.7)]",
    label: "text-cyan-300",
    iconColor: "text-cyan-300",
    tag: "▸ /info",
  },
  loading: {
    ring: "border-cyan-400/30 shadow-[0_0_28px_-12px_rgba(34,211,238,0.7)]",
    label: "text-cyan-300",
    iconColor: "text-cyan-300",
    tag: "▸ /sync",
  },
};

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const s = variantStyles[item.variant];
  return (
    <div
      role={item.variant === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto w-full max-w-sm rounded-xl border bg-[rgba(6,7,18,0.95)] backdrop-blur-xl px-4 py-3",
        "animate-slide-in-right-fade flex items-start gap-3",
        s.ring,
      )}
    >
      <span className={cn("mt-0.5 flex-shrink-0", s.iconColor)} aria-hidden>
        {item.variant === "loading" ? (
          <Spinner size="sm" />
        ) : item.variant === "success" ? (
          <CheckIcon />
        ) : item.variant === "error" ? (
          <XCircleIcon />
        ) : (
          <InfoIcon />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-mono-ui text-[9px] uppercase tracking-[0.18em] mb-0.5",
            s.label,
          )}
        >
          {s.tag}
        </p>
        <p className="text-sm font-semibold text-white leading-tight">{item.message}</p>
        {item.description ? (
          <p className="mt-1 text-xs text-white/60 leading-relaxed">{item.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Cerrar notificación"
        className="flex-shrink-0 w-6 h-6 inline-flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v5h1" strokeLinecap="round" />
    </svg>
  );
}
