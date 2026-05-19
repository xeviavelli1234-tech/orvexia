"use client";

import { useEffect, useMemo, useState } from "react";
import type { NetNode } from "./ProductNetwork";
import { profitAt, minPriceForMargin, type CostInputs } from "@/lib/reprice/margin";

export function ProfitButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("orvexia:open-profit"))}
      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors text-left"
    >
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Rentabilidad (margen real)
      </span>
      <span className="text-[11px] text-white/40">€ por SKU →</span>
    </button>
  );
}

type Status = "nocost" | "loss" | "below" | "ok";
type Filter = "all" | "withcost" | "nocost" | "loss" | "below" | "active";
type SortKey = "margin" | "profit" | "price" | "title";

interface Row {
  n: NetNode;
  hasCost: boolean;
  fixedCost: number;
  referralFee: number;
  vat: number;
  netRevenue: number;
  profit: number;
  marginPct: number;
  minProfitable: number | null;
  targetMargin: number;
  status: Status;
}

function eur(n: number) {
  return (
    n.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}
function pct(n: number) {
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + " %";
}

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  ok: { label: "Rentable", cls: "text-emerald-300 bg-emerald-400/10 border-emerald-400/25" },
  below: { label: "Bajo objetivo", cls: "text-amber-300 bg-amber-400/10 border-amber-400/25" },
  loss: { label: "Pérdida", cls: "text-red-300 bg-red-500/10 border-red-400/30" },
  nocost: { label: "Sin coste", cls: "text-white/45 bg-white/[0.05] border-white/10" },
};

export default function ProfitOverlay({ items }: { items: NetNode[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("margin");

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("orvexia:open-profit", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("orvexia:open-profit", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const allRows = useMemo<Row[]>(() => {
    return items.map((n) => {
      const hasCost = n.cost != null && n.cost > 0;
      const targetMargin = n.targetMargin ?? 10;
      if (!hasCost || n.priceCurrent <= 0) {
        return {
          n,
          hasCost,
          fixedCost: 0,
          referralFee: 0,
          vat: 0,
          netRevenue: 0,
          profit: 0,
          marginPct: 0,
          minProfitable: null,
          targetMargin,
          status: "nocost" as Status,
        };
      }
      const c: CostInputs = {
        cost: n.cost as number,
        shipping: n.shippingCost,
        fbaFee: n.fbaFee,
        referralPct: n.feePercent ?? 15,
        vatPct: n.vatRate ?? 21,
      };
      const b = profitAt(n.priceCurrent, c);
      const vat = Math.round((n.priceCurrent - b.netRevenue) * 100) / 100;
      const minP = minPriceForMargin(c, targetMargin);
      const status: Status =
        b.profit < 0 ? "loss" : b.marginPct < targetMargin ? "below" : "ok";
      return {
        n,
        hasCost: true,
        fixedCost: b.unitCost,
        referralFee: b.referralFee,
        vat,
        netRevenue: b.netRevenue,
        profit: b.profit,
        marginPct: b.marginPct,
        minProfitable: minP,
        targetMargin,
        status,
      };
    });
  }, [items]);

  const kpi = useMemo(() => {
    const withCost = allRows.filter((r) => r.hasCost);
    const loss = withCost.filter((r) => r.status === "loss").length;
    const below = withCost.filter((r) => r.status === "below").length;
    const avgMargin =
      withCost.length > 0
        ? withCost.reduce((s, r) => s + r.marginPct, 0) / withCost.length
        : 0;
    const avgProfit =
      withCost.length > 0
        ? withCost.reduce((s, r) => s + r.profit, 0) / withCost.length
        : 0;
    return {
      total: allRows.length,
      withCost: withCost.length,
      loss,
      below,
      ok: withCost.length - loss - below,
      avgMargin,
      avgProfit,
    };
  }, [allRows]);

  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const f = allRows.filter((r) => {
      const n = r.n;
      if (qq && !`${n.title} ${n.sku} ${n.asin}`.toLowerCase().includes(qq))
        return false;
      if (filter === "withcost") return r.hasCost;
      if (filter === "nocost") return !r.hasCost;
      if (filter === "loss") return r.status === "loss";
      if (filter === "below") return r.status === "below";
      if (filter === "active") return n.repricingEnabled;
      return true;
    });
    const noCostLast = (r: Row) => (r.hasCost ? 0 : 1);
    f.sort((a, b) => {
      const nc = noCostLast(a) - noCostLast(b);
      if (nc !== 0) return nc;
      if (sort === "margin") return a.marginPct - b.marginPct;
      if (sort === "profit") return a.profit - b.profit;
      if (sort === "price") return b.n.priceCurrent - a.n.priceCurrent;
      return a.n.title.localeCompare(b.n.title);
    });
    return f;
  }, [allRows, q, filter, sort]);

  function exportCsv() {
    const cols = [
      "sku",
      "title",
      "asin",
      "priceCurrent",
      "fixedCost",
      "referralFee",
      "vat",
      "netRevenue",
      "profit",
      "marginPct",
      "targetMargin",
      "minProfitable",
      "status",
    ];
    const f2 = (n: number) => n.toFixed(2);
    const line = (r: Row) =>
      [
        r.n.sku,
        r.n.title.replace(/"/g, "'"),
        r.n.asin,
        f2(r.n.priceCurrent),
        r.hasCost ? f2(r.fixedCost) : "",
        r.hasCost ? f2(r.referralFee) : "",
        r.hasCost ? f2(r.vat) : "",
        r.hasCost ? f2(r.netRevenue) : "",
        r.hasCost ? f2(r.profit) : "",
        r.hasCost ? f2(r.marginPct) : "",
        f2(r.targetMargin),
        r.minProfitable != null ? f2(r.minProfitable) : "",
        STATUS_META[r.status].label,
      ]
        .map((v) => `"${String(v)}"`)
        .join(",");
    const csv =
      "﻿" + cols.join(",") + "\n" + rows.map(line).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orvexia-rentabilidad.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[58] bg-black/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      onClick={() => setOpen(false)}
    >
      <div
        className="mx-auto max-w-6xl rounded-2xl border border-emerald-400/20 bg-[rgba(7,8,18,0.99)] shadow-[0_30px_80px_-20px_rgba(16,185,129,0.4)] fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera + KPIs */}
        <div className="sticky top-0 z-10 px-5 py-4 border-b border-white/10 bg-[rgba(7,8,18,0.99)] rounded-t-2xl">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base font-extrabold tracking-tight">
              Panel de <span className="text-gradient-neon">rentabilidad</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={exportCsv}
                className="rounded-lg border border-emerald-400/40 text-emerald-200 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-400/10 transition-colors"
              >
                Exportar CSV
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="h-8 w-8 grid place-items-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Kpi label="Con coste" value={`${kpi.withCost}/${kpi.total}`} />
            <Kpi label="Rentables" value={String(kpi.ok)} tone="ok" />
            <Kpi label="Bajo objetivo" value={String(kpi.below)} tone="warn" />
            <Kpi label="En pérdida" value={String(kpi.loss)} tone="bad" />
            <Kpi label="Margen medio" value={pct(kpi.avgMargin)} />
            <Kpi label="Beneficio medio/ud" value={eur(kpi.avgProfit)} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar título/SKU/ASIN…"
              className="flex-1 min-w-[140px] rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-emerald-400/60 focus:outline-none"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white focus:border-emerald-400/60 focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="withcost">Con coste</option>
              <option value="nocost">Sin coste</option>
              <option value="loss">En pérdida</option>
              <option value="below">Bajo objetivo</option>
              <option value="active">Repreciando</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white focus:border-emerald-400/60 focus:outline-none"
            >
              <option value="margin">Orden: margen ↑</option>
              <option value="profit">Orden: beneficio ↑</option>
              <option value="price">Orden: precio ↓</option>
              <option value="title">Orden: nombre</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="p-3 sm:p-5">
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/45">
              Sin productos para este filtro.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
                    <th className="text-left py-2 px-2">Producto</th>
                    <th className="text-right py-2 px-2">Precio</th>
                    <th className="text-right py-2 px-2 hidden sm:table-cell">
                      Coste fijo
                    </th>
                    <th className="text-right py-2 px-2 hidden md:table-cell">
                      Comisión
                    </th>
                    <th className="text-right py-2 px-2 hidden md:table-cell">IVA</th>
                    <th className="text-right py-2 px-2 hidden lg:table-cell">
                      Ing. neto
                    </th>
                    <th className="text-right py-2 px-2">Benef./ud</th>
                    <th className="text-right py-2 px-2">Margen</th>
                    <th className="text-right py-2 px-2 hidden sm:table-cell">
                      Mín. rentable
                    </th>
                    <th className="text-center py-2 px-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const m = STATUS_META[r.status];
                    return (
                      <tr
                        key={r.n.id}
                        className="border-b border-white/[0.06] hover:bg-white/[0.03] cursor-pointer"
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent("orvexia:open-analytics", {
                              detail: { productId: r.n.id },
                            }),
                          )
                        }
                        title="Ver analítica de este producto"
                      >
                        <td className="py-2 px-2 max-w-[280px]">
                          <div className="truncate text-white/90">{r.n.title}</div>
                          <div className="text-[10px] text-white/40 truncate">
                            {r.n.sku} · {r.n.asin}
                            {r.n.repricingEnabled && (
                              <span className="ml-1 text-emerald-400/80">
                                · repreciando
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums text-white/85">
                          {eur(r.n.priceCurrent)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums text-white/55 hidden sm:table-cell">
                          {r.hasCost ? eur(r.fixedCost) : "—"}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums text-white/55 hidden md:table-cell">
                          {r.hasCost ? eur(r.referralFee) : "—"}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums text-white/55 hidden md:table-cell">
                          {r.hasCost ? eur(r.vat) : "—"}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums text-white/55 hidden lg:table-cell">
                          {r.hasCost ? eur(r.netRevenue) : "—"}
                        </td>
                        <td
                          className={`py-2 px-2 text-right font-mono tabular-nums font-semibold ${
                            !r.hasCost
                              ? "text-white/35"
                              : r.profit < 0
                                ? "text-red-300"
                                : "text-emerald-300"
                          }`}
                        >
                          {r.hasCost ? eur(r.profit) : "—"}
                        </td>
                        <td
                          className={`py-2 px-2 text-right font-mono tabular-nums font-semibold ${
                            !r.hasCost
                              ? "text-white/35"
                              : r.profit < 0
                                ? "text-red-300"
                                : r.status === "below"
                                  ? "text-amber-300"
                                  : "text-emerald-300"
                          }`}
                        >
                          {r.hasCost ? pct(r.marginPct) : "—"}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums text-white/55 hidden sm:table-cell">
                          {r.minProfitable != null ? eur(r.minProfitable) : "—"}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}
                          >
                            {m.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-[11px] text-white/35">
            Beneficio por unidad vendida (sin volumen de ventas). Precios con
            IVA incluido; margen sobre el ingreso neto. Define coste, envío,
            FBA, comisión e IVA en cada producto (estrategia «Por margen»).
            Clic en una fila para ver su analítica.
          </p>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "bad";
}) {
  const v =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "bad"
          ? "text-red-300"
          : "text-cyan-300";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.12em] text-white/40 truncate">
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-base font-extrabold tabular-nums ${v}`}>
        {value}
      </div>
    </div>
  );
}
