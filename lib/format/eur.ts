const EUR_CURRENCY = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const EUR_NUMBER = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const EUR_INTEGER = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 0,
});

export function formatEUR(n: number | null | undefined, fallback = "—"): string {
  if (n == null || !Number.isFinite(n)) return fallback;
  return EUR_CURRENCY.format(n);
}

export function formatEURNumber(n: number): string {
  return EUR_NUMBER.format(n);
}

export function formatEURInteger(n: number): string {
  return EUR_INTEGER.format(n);
}
