"use client";

import { useState } from "react";

interface ApplyResult {
  productsCreated: number;
  productsUpdated: number;
  offersCreated: number;
  offersUpdated: number;
  priceHistoryEntries: number;
  errors: string[];
}
interface ParseSummary {
  totalLines: number;
  validRows: number;
  errors: Array<{ rowIndex: number; field: string; message: string; raw?: string }>;
  errorCount: number;
}
interface Result {
  ok: boolean;
  stage?: string;
  parsed?: ParseSummary;
  products?: number;
  apply?: ApplyResult;
  errors?: Array<{ rowIndex: number; field: string; message: string; raw?: string }>;
  totalLines?: number;
}

export default function CatalogImportClient() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [drag, setDrag] = useState(false);

  async function readFile(file: File) {
    const t = await file.text();
    setText(t);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) readFile(f);
  }

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch("/api/admin/catalog/import", {
        method: "POST",
        headers: { "content-type": "text/csv" },
        body: text,
      });
      const j = (await r.json()) as Result;
      setResult(j);
    } catch (e) {
      setResult({ ok: false, errors: [{ rowIndex: 0, field: "_", message: String(e) }] });
    } finally {
      setBusy(false);
    }
  }

  const sample = `brand,model,name,category,asin,image_url,description,store,price,price_old,external_url,in_stock
LG,OLED65C44LA,LG OLED evo C4 65",TELEVISORES,B0CW2VHBQM,https://www.lg.com/.../C4.jpg,Modelo 2024,Amazon,2299.00,2599.00,https://amzn.eu/d/abc,true
LG,OLED65C44LA,LG OLED evo C4 65",TELEVISORES,,,,MediaMarkt,2349.00,,https://mediamarkt.es/...,true`;

  return (
    <section className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.04] p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-base font-bold text-white">Subir CSV</h2>
        <a
          href="/api/admin/catalog/import"
          download
          className="text-xs text-cyan-300 hover:underline"
        >
          ↓ descargar plantilla
        </a>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`mb-3 rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm transition-colors ${
          drag
            ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
            : "border-white/15 bg-black/30 text-white/55"
        }`}
      >
        Arrastra aquí tu archivo <code>.csv</code> o pégalo en el cuadro de abajo
        <label className="block mt-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) readFile(f);
            }}
            className="text-xs text-white/60"
          />
        </label>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={sample}
        className="w-full font-mono text-[11px] rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-cyan-400/60 focus:outline-none"
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          className="rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors disabled:opacity-40"
        >
          {busy ? "Procesando…" : "Importar al catálogo"}
        </button>
        <button
          onClick={() => {
            setText("");
            setResult(null);
          }}
          disabled={busy}
          className="text-xs text-white/45 hover:text-white"
        >
          limpiar
        </button>
      </div>

      {result && (
        <div className="mt-5 space-y-3">
          {result.ok && result.apply ? (
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/[0.06] p-4">
              <div className="font-semibold text-emerald-200">
                ✓ Importación completada
              </div>
              <ul className="mt-2 text-sm text-white/80 list-disc pl-5 space-y-0.5">
                <li>
                  Productos: <strong className="text-emerald-200">
                    +{result.apply.productsCreated}
                  </strong>{" "}
                  creados,{" "}
                  <strong>{result.apply.productsUpdated}</strong> actualizados
                </li>
                <li>
                  Ofertas: <strong className="text-emerald-200">
                    +{result.apply.offersCreated}
                  </strong>{" "}
                  creadas, <strong>{result.apply.offersUpdated}</strong> actualizadas
                </li>
                <li>
                  Entradas de historial:{" "}
                  <strong>{result.apply.priceHistoryEntries}</strong>
                </li>
                {result.parsed && (
                  <li>
                    Filas válidas: <strong>{result.parsed.validRows}</strong> de{" "}
                    {result.parsed.totalLines - 1}
                  </li>
                )}
                {result.apply.errors.length > 0 && (
                  <li className="text-rose-300">
                    Errores al aplicar: {result.apply.errors.length}
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/[0.06] p-4">
              <div className="font-semibold text-rose-200">
                ✕ No se aplicó nada
              </div>
              <p className="text-xs text-white/65 mt-1">
                El CSV no se pudo parsear o no había filas válidas. Revisa los
                errores abajo.
              </p>
            </div>
          )}

          {(result.parsed?.errors ?? result.errors)?.length ? (
            <details className="rounded-lg border border-amber-400/30 bg-amber-500/[0.05] p-3">
              <summary className="cursor-pointer text-sm font-semibold text-amber-200">
                ⚠ {(result.parsed?.errors ?? result.errors)?.length ?? 0} errores por fila
              </summary>
              <ul className="mt-2 text-xs text-white/75 list-disc pl-5 space-y-0.5 max-h-60 overflow-auto">
                {(result.parsed?.errors ?? result.errors ?? []).map((e, i) => (
                  <li key={i}>
                    Fila <strong>{e.rowIndex}</strong> · campo{" "}
                    <code className="text-amber-300">{e.field}</code>: {e.message}
                    {e.raw ? ` ("${e.raw}")` : ""}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {result.apply && result.apply.errors.length > 0 && (
            <details className="rounded-lg border border-rose-400/30 bg-rose-500/[0.05] p-3">
              <summary className="cursor-pointer text-sm font-semibold text-rose-200">
                Errores al guardar
              </summary>
              <ul className="mt-2 text-xs text-white/75 list-disc pl-5 space-y-0.5">
                {result.apply.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
