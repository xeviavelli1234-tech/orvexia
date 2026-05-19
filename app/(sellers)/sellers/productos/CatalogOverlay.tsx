"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { NetNode } from "./ProductNetwork";
import { collectTags, parseTags } from "@/lib/tags";
import {
  bulkListingsAction,
  bulkTagAction,
  importConfigAction,
  pauseAllAction,
} from "./actions";

export function CatalogButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("orvexia:open-catalog"))}
      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors text-left"
    >
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
        Catálogo (lista, masiva, CSV)
      </span>
      <span className="text-[11px] text-white/40">→</span>
    </button>
  );
}

export function PanicButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-xl border border-red-400/40 bg-red-500/10 text-red-300 px-3 py-2.5 text-sm font-semibold hover:bg-red-500/20 transition-colors"
      >
        ⛔ Pausar TODO el reprecio
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm">
      <p className="text-white/80">¿Pausar el reprecio de todos los productos?</p>
      <div className="mt-2 flex gap-2">
        <button
          disabled={busy}
          onClick={() => {
            setBusy(true);
            pauseAllAction().then(() => {
              setBusy(false);
              setConfirming(false);
              router.refresh();
            });
          }}
          className="rounded-md bg-red-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? "Pausando…" : "Sí, pausar todo"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm text-white/55 hover:text-white"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

type Filter = "all" | "active" | "paused" | "norange" | "noprice";

const CSV_COLS = [
  "sku",
  "title",
  "priceCurrent",
  "priceMin",
  "priceMax",
  "strategy",
  "undercutType",
  "undercutValue",
  "fixedPrice",
  "cost",
  "feePercent",
  "targetMargin",
  "noCompetition",
  "ignoreAmazon",
  "fulfillmentFilter",
  "minSellerRating",
  "useAccountDefaults",
  "repricingEnabled",
  "tags",
] as const;

function val(n: NetNode, c: (typeof CSV_COLS)[number]): string {
  const v = (n as unknown as Record<string, unknown>)[c];
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "1" : "0";
  return String(v);
}

export default function CatalogOverlay({ items }: { items: NetNode[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const allTags = useMemo(
    () => collectTags(items.map((i) => i.tags)),
    [items],
  );

  useEffect(() => {
    function onOpen() {
      setSel(new Set());
      setMsg(null);
      setOpen(true);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("orvexia:open-catalog", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("orvexia:open-catalog", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const tf = tagFilter.toLowerCase();
    return items.filter((n) => {
      if (qq && !(`${n.title} ${n.sku} ${n.asin}`.toLowerCase().includes(qq))) return false;
      if (
        tf &&
        !parseTags(n.tags).some((t) => t.toLowerCase() === tf)
      )
        return false;
      const noprice = n.priceCurrent <= 0 || !n.asin;
      const norange = n.priceMin == null || n.priceMax == null;
      if (filter === "active") return n.repricingEnabled;
      if (filter === "paused") return !n.repricingEnabled && !noprice;
      if (filter === "norange") return norange;
      if (filter === "noprice") return noprice;
      return true;
    });
  }, [items, q, filter, tagFilter]);

  function applyTag(mode: "add" | "remove") {
    const tag = tagInput.trim();
    if (sel.size === 0 || !tag) return;
    setBusy(true);
    setMsg(null);
    bulkTagAction([...sel], tag, mode).then((r) => {
      setBusy(false);
      if (!r.ok) setMsg("Error: " + r.error);
      else {
        setMsg(
          `Etiqueta "${tag}" ${mode === "add" ? "añadida a" : "quitada de"} ${
            r.count ?? 0
          } producto(s).`,
        );
        setSel(new Set());
        setTagInput("");
        router.refresh();
      }
    });
  }

  function toggle(id: string) {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function selectAll() {
    setSel((s) =>
      s.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
    );
  }

  function bulk(action: "enable" | "disable" | "defaultsOn" | "defaultsOff") {
    if (sel.size === 0) return;
    setBusy(true);
    setMsg(null);
    bulkListingsAction([...sel], action).then((r) => {
      setBusy(false);
      if (!r.ok) setMsg("Error: " + r.error);
      else {
        setMsg(`Aplicado a ${sel.size} producto(s).`);
        setSel(new Set());
        router.refresh();
      }
    });
  }

  function exportCsv() {
    const src = sel.size > 0 ? items.filter((i) => sel.has(i.id)) : items;
    const head = CSV_COLS.join(",");
    const body = src
      .map((n) => CSV_COLS.map((c) => `"${val(n, c).replace(/"/g, "'")}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + head + "\n" + body], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orvexia-config.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setMsg(null);
    f.text().then((text) => {
      importConfigAction(text).then((r) => {
        setBusy(false);
        if (!r.ok) setMsg("Error import: " + r.error);
        else {
          setMsg(`Importado: ${r.updated} actualizados, ${r.skipped} ignorados.`);
          router.refresh();
        }
        if (fileRef.current) fileRef.current.value = "";
      });
    });
  }

  if (!open) return null;
  const allSel = rows.length > 0 && sel.size === rows.length;

  return (
    <div
      className="fixed inset-0 z-[58] bg-black/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      onClick={() => setOpen(false)}
    >
      <div
        className="mx-auto max-w-5xl rounded-2xl border border-cyan-400/20 bg-[rgba(7,8,18,0.99)] shadow-[0_30px_80px_-20px_rgba(34,211,238,0.4)] fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 px-5 py-3.5 border-b border-white/10 bg-[rgba(7,8,18,0.99)] rounded-t-2xl">
          <h2 className="text-base font-extrabold tracking-tight">
            Catálogo <span className="text-gradient-neon">· {items.length}</span>
          </h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar título/SKU/ASIN…"
            className="ml-2 flex-1 min-w-[140px] rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-cyan-400/60 focus:outline-none"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
          >
            <option value="all">Todos</option>
            <option value="active">Repreciando</option>
            <option value="paused">Pausados</option>
            <option value="norange">Sin rango</option>
            <option value="noprice">Sin oferta</option>
          </select>
          {allTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
              title="Filtrar por etiqueta"
            >
              <option value="">Todas las etiquetas</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={exportCsv}
            className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-white/70 hover:bg-white/10"
            title="Exportar configuración (selección o todos)"
          >
            Export CSV
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-white/70 hover:bg-white/10"
          >
            Import CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onImport}
            className="hidden"
          />
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="h-8 w-8 grid place-items-center rounded-md text-white/40 hover:text-white hover:bg-white/10 text-lg leading-none"
          >
            ×
          </button>
        </div>

        {msg && (
          <div className="px-5 pt-3 text-[11px] text-cyan-200">{msg}</div>
        )}

        <div className="p-3 sm:p-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="py-2 px-2 w-8">
                  <input type="checkbox" checked={allSel} onChange={selectAll} />
                </th>
                <th className="py-2 px-2">Producto</th>
                <th className="py-2 px-2 whitespace-nowrap">Precio</th>
                <th className="py-2 px-2">Estrategia</th>
                <th className="py-2 px-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => {
                const noprice = n.priceCurrent <= 0 || !n.asin;
                const st = noprice
                  ? "Sin oferta"
                  : n.repricingEnabled
                    ? "Repreciando"
                    : n.priceMin != null && n.priceMax != null
                      ? "Pausado"
                      : "Sin rango";
                return (
                  <tr key={n.id} className="border-t border-white/[0.06]">
                    <td className="py-2 px-2">
                      <input
                        type="checkbox"
                        checked={sel.has(n.id)}
                        onChange={() => toggle(n.id)}
                      />
                    </td>
                    <td className="py-2 px-2 max-w-[300px]">
                      <div className="truncate text-white/85">{n.title}</div>
                      <div className="font-mono text-[10px] text-white/35">{n.sku}</div>
                      {parseTags(n.tags).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {parseTags(n.tags).map((t) => (
                            <span
                              key={t}
                              className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-0.5 text-[9px] text-cyan-200"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 font-mono text-white/70 whitespace-nowrap">
                      {n.priceCurrent > 0 ? n.priceCurrent.toFixed(2) + " €" : "—"}
                    </td>
                    <td className="py-2 px-2 text-white/60">
                      {n.useAccountDefaults ? "Cuenta" : n.strategy}
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={
                          st === "Repreciando"
                            ? "text-emerald-300"
                            : st === "Sin oferta"
                              ? "text-white/40"
                              : "text-blue-300"
                        }
                      >
                        {st}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-white/45">
                    Sin resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {sel.size > 0 && (
          <div className="sticky bottom-0 flex flex-wrap items-center gap-2 px-5 py-3 border-t border-white/10 bg-[rgba(7,8,18,0.99)] rounded-b-2xl">
            <span className="text-sm text-white/70">{sel.size} seleccionados:</span>
            <BulkBtn disabled={busy} onClick={() => bulk("enable")}>
              Activar reprecio
            </BulkBtn>
            <BulkBtn disabled={busy} onClick={() => bulk("disable")}>
              Pausar
            </BulkBtn>
            <BulkBtn disabled={busy} onClick={() => bulk("defaultsOn")}>
              Usar ajustes cuenta
            </BulkBtn>
            <BulkBtn disabled={busy} onClick={() => bulk("defaultsOff")}>
              Config propia
            </BulkBtn>
            <span className="mx-1 h-5 w-px bg-white/15" />
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="etiqueta…"
              list="catalog-tags"
              className="w-32 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-cyan-400/60 focus:outline-none"
            />
            <datalist id="catalog-tags">
              {allTags.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <BulkBtn
              disabled={busy || !tagInput.trim()}
              onClick={() => applyTag("add")}
            >
              Etiquetar
            </BulkBtn>
            <BulkBtn
              disabled={busy || !tagInput.trim()}
              onClick={() => applyTag("remove")}
            >
              Quitar etiqueta
            </BulkBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function BulkBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-cyan-400/30 bg-cyan-400/5 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
    >
      {children}
    </button>
  );
}
