"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatRelativeShort } from "@/lib/format/relative";

interface RowError {
  line: number;
  message: string;
}

interface SampleRow {
  sku: string;
  title: string;
  priceCurrent: number;
  priceMin: number | null;
  priceMax: number | null;
  cost: number | null;
  currency: string;
}

interface PreviewResponse {
  ok?: boolean;
  preview?: boolean;
  columns?: string[];
  validRows?: number;
  tooManyRows?: boolean;
  sample?: SampleRow[];
  skipped?: number;
  errors?: RowError[];
  error?: string;
}

interface ImportResponse {
  ok?: boolean;
  inserted?: number;
  updated?: number;
  skipped?: number;
  total?: number;
  error?: string;
  errors?: RowError[];
}

/**
 * Botón "Subir catálogo" para modo manual.
 *
 * Flujo: seleccionar/soltar CSV → vista previa (parseo + validación en el
 * servidor, sin escribir) → confirmar importación. Reduce las subidas a ciegas
 * y los errores: el vendedor ve qué se va a importar antes de hacerlo.
 */
export function UploadCsvButton({ lastSyncAt }: { lastSyncAt: Date | null }) {
  const router = useRouter();
  const { error: toastErr, loading: toastLoading, update, dismiss } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, busy]);

  function resetPreview() {
    setPreview(null);
    setPendingFile(null);
  }

  // Paso 1: validar el archivo y pedir la vista previa (no escribe nada).
  async function handleFile(file: File) {
    if (busy) return;
    if (file.size === 0) {
      toastErr("Archivo vacío");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toastErr("Archivo demasiado grande", { description: "Máximo 5 MB." });
      return;
    }
    setBusy(true);
    setPreview(null);
    const tid = toastLoading("Analizando CSV…", { description: file.name });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/sellers/manual/import?preview=1", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as PreviewResponse;
      if (!res.ok || !data.ok) {
        update(tid, {
          variant: "error",
          message: "No se pudo leer el CSV",
          description: humanizeError(data.error),
        });
        return;
      }
      dismiss(tid);
      setPreview(data);
      setPendingFile(file);
    } catch (e) {
      dismiss(tid);
      toastErr("Error de red al analizar", {
        description: e instanceof Error ? e.message : "network_error",
      });
    } finally {
      setBusy(false);
    }
  }

  // Paso 2: confirmar e importar de verdad el archivo previsualizado.
  async function confirmImport() {
    if (busy || !pendingFile) return;
    setBusy(true);
    const tid = toastLoading("Importando catálogo…", { description: pendingFile.name });
    try {
      const fd = new FormData();
      fd.append("file", pendingFile);
      const res = await fetch("/api/sellers/manual/import", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as ImportResponse;
      if (!res.ok || !data.ok) {
        update(tid, {
          variant: "error",
          message: "No se pudo importar el CSV",
          description: humanizeError(data.error),
        });
        return;
      }
      const parts: string[] = [];
      if (data.inserted) parts.push(`${data.inserted} nuevos`);
      if (data.updated) parts.push(`${data.updated} actualizados`);
      if (data.skipped) parts.push(`${data.skipped} omitidos`);
      update(tid, {
        variant: "success",
        message: `${data.total ?? 0} productos importados`,
        description: parts.length ? parts.join(" · ") : "Sin cambios",
      });
      resetPreview();
      setOpen(false);
      router.refresh();
    } catch (e) {
      dismiss(tid);
      toastErr("Error de red al importar", {
        description: e instanceof Error ? e.message : "network_error",
      });
    } finally {
      setBusy(false);
    }
  }

  const validRows = preview?.validRows ?? 0;
  const skipped = preview?.skipped ?? 0;

  return (
    <>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={() => {
            resetPreview();
            setOpen(true);
          }}
          className="w-full shadow-[0_0_18px_-6px_rgba(16,185,129,0.7)]"
        >
          Subir catálogo CSV
        </Button>
        {lastSyncAt && (
          <span
            className="text-[11px] text-white/40"
            title={new Intl.DateTimeFormat("es-ES", {
              dateStyle: "short",
              timeStyle: "short",
            }).format(lastSyncAt)}
          >
            Última carga: hace {formatRelativeShort(lastSyncAt)}
          </span>
        )}
      </div>

      {open && mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm fade-in p-3 sm:p-6"
            onClick={() => !busy && setOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl border border-teal-400/25 bg-[rgba(7,7,18,0.97)] shadow-[0_20px_60px_-20px_rgba(45,212,191,0.55)]"
            >
              <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
                <div>
                  <div className="font-mono-ui text-[10px] uppercase tracking-wider text-teal-300">
                    ▸ /manual · import
                  </div>
                  <h3 className="mt-0.5 text-base font-bold text-white">
                    {preview ? "Revisa antes de importar" : "Subir catálogo en CSV"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => !busy && setOpen(false)}
                  aria-label="Cerrar"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-md text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </header>

              {/* ── Vista previa ─────────────────────────────────────────── */}
              {preview ? (
                <div className="p-5 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400/[0.1] border border-emerald-400/25 px-3 py-1.5 text-sm font-semibold text-emerald-300">
                      ✓ {validRows.toLocaleString("es-ES")} filas válidas
                    </span>
                    {skipped > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/[0.1] border border-amber-400/25 px-3 py-1.5 text-sm font-semibold text-amber-300">
                        ⚠ {skipped.toLocaleString("es-ES")} con error
                      </span>
                    )}
                  </div>

                  {preview.tooManyRows && (
                    <p className="rounded-lg border border-rose-400/30 bg-rose-500/[0.07] px-3 py-2 text-xs text-rose-200">
                      El archivo supera las 10.000 filas. Recórtalo antes de importar.
                    </p>
                  )}

                  {validRows > 0 && preview.sample && preview.sample.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-white/10">
                      <table className="w-full text-[11px]">
                        <thead className="bg-white/[0.04] text-white/50">
                          <tr>
                            <th className="text-left font-semibold px-2.5 py-2">SKU</th>
                            <th className="text-left font-semibold px-2.5 py-2">Título</th>
                            <th className="text-right font-semibold px-2.5 py-2">Precio</th>
                            <th className="text-right font-semibold px-2.5 py-2">Mín</th>
                            <th className="text-right font-semibold px-2.5 py-2">Máx</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06] text-white/75">
                          {preview.sample.map((r, i) => (
                            <tr key={i}>
                              <td className="px-2.5 py-1.5 font-mono-ui text-teal-300/80">{r.sku}</td>
                              <td className="px-2.5 py-1.5 max-w-[160px] truncate">{r.title}</td>
                              <td className="px-2.5 py-1.5 text-right">{r.priceCurrent}</td>
                              <td className="px-2.5 py-1.5 text-right text-white/45">{r.priceMin ?? "—"}</td>
                              <td className="px-2.5 py-1.5 text-right text-white/45">{r.priceMax ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {validRows > (preview.sample.length ?? 0) && (
                        <p className="px-2.5 py-1.5 text-[10px] text-white/40 bg-white/[0.02]">
                          … y {(validRows - preview.sample.length).toLocaleString("es-ES")} filas más.
                        </p>
                      )}
                    </div>
                  )}

                  {validRows === 0 && (
                    <p className="rounded-lg border border-rose-400/30 bg-rose-500/[0.07] px-3 py-2 text-sm text-rose-200">
                      No hay ninguna fila válida. Revisa que existan las columnas{" "}
                      <code className="text-rose-100">sku</code>,{" "}
                      <code className="text-rose-100">title</code> y{" "}
                      <code className="text-rose-100">price</code>.
                    </p>
                  )}

                  {preview.errors && preview.errors.length > 0 && (
                    <div className="rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-3 py-3">
                      <p className="font-mono-ui text-[10px] uppercase tracking-wider text-amber-300 mb-2">
                        ▸ filas con error (se omitirán)
                      </p>
                      <ul className="text-[11px] text-amber-100/85 space-y-0.5 max-h-28 overflow-y-auto">
                        {preview.errors.slice(0, 30).map((e, i) => (
                          <li key={i}>
                            línea {e.line}: {e.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      disabled={busy || validRows === 0 || preview.tooManyRows}
                      onClick={() => void confirmImport()}
                      className="flex-1"
                    >
                      {busy
                        ? "Importando…"
                        : `Importar ${validRows.toLocaleString("es-ES")} producto${validRows === 1 ? "" : "s"}`}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      disabled={busy}
                      onClick={resetPreview}
                    >
                      Elegir otro archivo
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── Selección de archivo ───────────────────────────────── */
                <div className="p-5 space-y-4">
                  <p className="text-xs text-white/55 leading-relaxed">
                    Sube un archivo CSV con tu catálogo. Columnas mínimas: <code className="text-teal-300">sku</code>,{" "}
                    <code className="text-teal-300">title</code>, <code className="text-teal-300">price</code>. Opcionales:{" "}
                    <code className="text-white/70">min, max, cost, currency, image_url</code>.
                  </p>

                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) void handleFile(f);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 cursor-pointer rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
                      dragging
                        ? "border-teal-400/70 bg-teal-400/[0.08]"
                        : "border-white/15 bg-white/[0.02] hover:border-teal-400/40 hover:bg-teal-400/[0.04]"
                    }`}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleFile(f);
                        e.target.value = ""; // reset for re-upload of same file
                      }}
                    />
                    <span className="text-3xl" aria-hidden>
                      📥
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {busy ? "Analizando…" : "Arrastra tu CSV aquí o haz clic"}
                    </span>
                    <span className="text-[11px] text-white/45">
                      Máximo 5 MB · hasta 10.000 filas
                    </span>
                  </label>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <a
                      href="/api/sellers/manual/import"
                      className="inline-flex items-center gap-1.5 text-teal-300 hover:text-teal-200 underline underline-offset-4"
                      download
                    >
                      ⬇︎ Descargar plantilla CSV
                    </a>
                    <span className="text-white/30">·</span>
                    <span className="text-white/45">
                      Coge tu export de Shopify/WooCommerce y renombra las columnas si hace falta.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function humanizeError(code: string | undefined): string {
  switch (code) {
    case "missing_file":
      return "No se envió ningún archivo.";
    case "file_too_large":
      return "Archivo demasiado grande (máx 5 MB).";
    case "too_many_rows":
      return "Demasiadas filas (máx 10.000).";
    case "no_valid_rows":
      return "Ninguna fila válida en el CSV.";
    case "bad_body":
      return "No pudimos leer el archivo.";
    case "not_manual_mode":
      return "Esta cuenta no está en modo manual.";
    case "rate_limited":
      return "Demasiados intentos. Espera unos minutos.";
    case "unauthorized":
      return "Sesión expirada.";
    default:
      return code ?? "Error desconocido.";
  }
}
