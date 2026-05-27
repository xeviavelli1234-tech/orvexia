// ─── Decision helper ─────────────────────────────────────────────────────────

export function getDecision(discountPercent: number | null, drop?: number): {
  label: string; icon: string; bg: string; text: string; border: string;
} {
  const pct = discountPercent ?? 0;
  if (pct >= 25) return { label: "Compra ahora", icon: "✓", bg: "#DCFCE7", text: "#166534", border: "#86EFAC" };
  if (pct >= 15) return { label: "Buen precio",  icon: "↓", bg: "var(--brand-100)", text: "#1E40AF", border: "#93C5FD" };
  if (pct >= 5)  return { label: "Precio justo", icon: "~", bg: "#FEF9C3", text: "#854D0E", border: "#FDE047" };
  return              { label: "Considera esperar", icon: "⏱", bg: "var(--bg-subtle)", text: "var(--fg-muted)", border: "var(--fg-faint)" };
}
