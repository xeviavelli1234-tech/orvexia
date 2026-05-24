"use client";

import { useState, useTransition } from "react";
import { updateListingRangeAction, toggleListingAction } from "./actions";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

interface Props {
  listing: {
    id: string;
    asin: string;
    sku: string;
    title: string;
    imageUrl: string | null;
    priceCurrent: number;
    priceMin: number | null;
    priceMax: number | null;
    currency: string;
    repricingEnabled: boolean;
  };
}

function fmtInput(v: number | null): string {
  return v == null ? "" : v.toFixed(2);
}

export function RangeRow({ listing }: Props) {
  const { success: toastOk, error: toastErr } = useToast();
  const [min, setMin] = useState<string>(fmtInput(listing.priceMin));
  const [max, setMax] = useState<string>(fmtInput(listing.priceMax));
  const [enabled, setEnabled] = useState(listing.repricingEnabled);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  async function saveRange() {
    setError(null);
    const minStr = min.trim();
    const maxStr = max.trim();
    if (minStr === fmtInput(listing.priceMin) && maxStr === fmtInput(listing.priceMax)) return;

    setSaving(true);
    const fd = new FormData();
    fd.set("listingId", listing.id);
    fd.set("priceMin", minStr);
    fd.set("priceMax", maxStr);
    const res = await updateListingRangeAction(fd);
    setSaving(false);
    if (!res.ok) {
      const msg = translateError(res.error);
      setError(msg);
      // revert local state
      setMin(fmtInput(listing.priceMin));
      setMax(fmtInput(listing.priceMax));
      toastErr("No se pudo guardar el rango", {
        description: `${listing.sku} · ${msg}`,
      });
    } else {
      const range = `${minStr || "—"} / ${maxStr || "—"} ${currencySymbol(listing.currency)}`;
      toastOk("Rango guardado", {
        description: `${listing.sku} · ${range}`,
        duration: 2200,
      });
    }
  }

  async function handleToggle() {
    const next = !enabled;
    setEnabled(next); // optimistic
    setError(null);
    const fd = new FormData();
    fd.set("listingId", listing.id);
    fd.set("enabled", String(next));
    startTransition(async () => {
      const res = await toggleListingAction(fd);
      if (!res.ok) {
        setEnabled(!next); // revert
        const msg = translateError(res.error);
        setError(msg);
        toastErr("No se pudo cambiar el estado", {
          description: `${listing.sku} · ${msg}`,
        });
      } else {
        toastOk(next ? "Reprecio activado" : "Reprecio pausado", {
          description: listing.sku,
          duration: 2200,
        });
      }
    });
  }

  return (
    <tr className="border-t border-fg/5 hover:bg-fg/[0.02]">
      <td className="py-3 px-2">
        {listing.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-12 h-12 object-contain rounded bg-fg/5"
          />
        ) : (
          <div className="w-12 h-12 rounded bg-fg/5" aria-hidden />
        )}
      </td>
      <td className="py-3 px-2">
        <div className="font-medium text-sm leading-tight line-clamp-2 max-w-[280px]">
          {listing.title}
        </div>
        <div className="mt-1 text-xs text-fg/50 font-mono">
          {listing.asin} · {listing.sku}
        </div>
      </td>
      <td className="py-3 px-2 text-sm whitespace-nowrap">
        {listing.priceCurrent > 0 ? (
          <span className="text-fg/80">
            {listing.priceCurrent.toFixed(2)} {currencySymbol(listing.currency)}
          </span>
        ) : (
          <span
            className="text-amber-600"
            title="Publicado en Amazon pero sin oferta/precio activo. No se repreciará hasta que tenga precio."
          >
            Sin precio
          </span>
        )}
      </td>
      <td className="py-3 px-2">
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onBlur={saveRange}
          placeholder="0,00"
          disabled={saving}
          inputSize="sm"
          state={error ? "error" : "default"}
          aria-label="Precio mínimo"
          className="w-24"
        />
      </td>
      <td className="py-3 px-2">
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onBlur={saveRange}
          placeholder="0,00"
          disabled={saving}
          inputSize="sm"
          state={error ? "error" : "default"}
          aria-label="Precio máximo"
          className="w-24"
        />
      </td>
      <td className="py-3 px-2">
        <button
          type="button"
          onClick={handleToggle}
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? "Pausar reprecio" : "Activar reprecio"}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-[var(--accent-500)]" : "bg-fg/20"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
        {error && <div className="mt-1 text-[10px] text-red-600 max-w-[120px]">{error}</div>}
      </td>
    </tr>
  );
}

function currencySymbol(code: string): string {
  if (code === "EUR") return "€";
  if (code === "USD") return "$";
  if (code === "GBP") return "£";
  return code;
}

function translateError(code: string): string {
  const map: Record<string, string> = {
    price_max_must_be_greater_or_equal_to_min: "El máximo debe ser ≥ al mínimo",
    missing_price_range: "Define min y max antes de activar",
    listing_not_repriceable: "Sin precio/ASIN en Amazon: no se puede repreciar aún",
    listing_not_found_or_not_owned: "Producto no encontrado",
    unauthorized: "Sesión expirada",
    validation_failed: "Datos inválidos",
  };
  return map[code] ?? code;
}
