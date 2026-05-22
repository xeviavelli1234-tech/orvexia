"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EU_MARKETPLACES } from "@/lib/amazon/endpoints";
import {
  updateAccountSettingsAction,
  exportMyDataAction,
  deleteMyAccountAction,
} from "./actions";

export interface AccountSettingsData {
  marketplaceId: string;
  scheduleEnabled: boolean;
  scheduleStartHour: number;
  scheduleEndHour: number;
  dryRun: boolean;
  patchDelayMs: number;
  autoSyncHours: number;
  defaultStrategy: "BUYBOX" | "MATCH" | "FIXED" | "MARGIN";
  defaultUndercutType: "AMOUNT" | "PERCENT";
  defaultUndercutValue: number;
  defaultNoCompetition: "MAX" | "HOLD" | "STEP_UP";
  defaultStepUpType: "AMOUNT" | "PERCENT";
  defaultStepUpValue: number;
  alertsEnabled: boolean;
  alertEmail: string;
  alertOnBuyBoxLost: boolean;
  alertOnPriceFloor: boolean;
  alertOnError: boolean;
}

export function SettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("orvexia:open-settings"))}
      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors text-left"
    >
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
        Ajustes de cuenta
      </span>
      <span className="text-[11px] text-white/40">horario · simulación →</span>
    </button>
  );
}

function Toggle({
  on,
  onClick,
  disabled,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
        on ? "bg-emerald-500 shadow-[0_0_14px_-2px_rgba(16,185,129,0.7)]" : "bg-white/15"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function AccountSettings({ initial }: { initial: AccountSettingsData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [s, setS] = useState<AccountSettingsData>(initial);
  const [delConfirm, setDelConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  function exportData() {
    setErr(null);
    setBusy(true);
    exportMyDataAction().then((r) => {
      setBusy(false);
      if (!r.ok || !r.json) {
        setErr(r.ok ? "no_data" : r.error);
        return;
      }
      const blob = new Blob([r.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "orvexia-mis-datos.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function deleteAccount() {
    setErr(null);
    setBusy(true);
    deleteMyAccountAction("ELIMINAR").then((r) => {
      setBusy(false);
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      setOpen(false);
      window.location.href = "/dashboard";
    });
  }

  useEffect(() => {
    function onOpen() {
      setS(initial);
      setErr(null);
      setDelConfirm(false);
      setOpen(true);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("orvexia:open-settings", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("orvexia:open-settings", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, [initial]);

  function save() {
    setErr(null);
    setSaving(true);
    const fd = new FormData();
    fd.set("marketplaceId", s.marketplaceId);
    fd.set("scheduleEnabled", String(s.scheduleEnabled));
    fd.set("scheduleStartHour", String(s.scheduleStartHour));
    fd.set("scheduleEndHour", String(s.scheduleEndHour));
    fd.set("dryRun", String(s.dryRun));
    fd.set("patchDelayMs", String(s.patchDelayMs));
    fd.set("autoSyncHours", String(s.autoSyncHours));
    fd.set("defaultStrategy", s.defaultStrategy);
    fd.set("defaultUndercutType", s.defaultUndercutType);
    fd.set("defaultUndercutValue", String(s.defaultUndercutValue));
    fd.set("defaultNoCompetition", s.defaultNoCompetition);
    fd.set("defaultStepUpType", s.defaultStepUpType);
    fd.set("defaultStepUpValue", String(s.defaultStepUpValue));
    fd.set("alertsEnabled", String(s.alertsEnabled));
    fd.set("alertEmail", s.alertEmail);
    fd.set("alertOnBuyBoxLost", String(s.alertOnBuyBoxLost));
    fd.set("alertOnPriceFloor", String(s.alertOnPriceFloor));
    fd.set("alertOnError", String(s.alertOnError));
    updateAccountSettingsAction(fd).then((r) => {
      setSaving(false);
      if (!r.ok) setErr(r.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) return null;
  const lbl = "text-[10px] uppercase tracking-wider text-white/40";
  const inp =
    "mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none";

  return (
    <div
      className="fixed inset-0 z-[58] bg-black/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      onClick={() => setOpen(false)}
    >
      <div
        className="mx-auto max-w-lg min-h-full sm:min-h-0 rounded-none sm:rounded-2xl border-0 sm:border sm:border-cyan-400/20 bg-[rgba(7,8,18,0.99)] sm:shadow-[0_30px_80px_-20px_rgba(34,211,238,0.4)] fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-white/10 bg-[rgba(7,8,18,0.99)] backdrop-blur-md sm:rounded-t-2xl">
          <h2 className="text-base font-extrabold tracking-tight">
            Ajustes de <span className="text-gradient-neon">cuenta</span>
          </h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="h-9 w-9 grid place-items-center rounded-full text-white/55 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
          {/* Marketplace */}
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-semibold text-white/90">Marketplace</div>
            <p className="mt-1 text-[11px] text-white/45">
              Marketplace de Amazon EU sobre el que se reprecia.
            </p>
            <select
              value={s.marketplaceId}
              onChange={(e) =>
                setS((v) => ({ ...v, marketplaceId: e.target.value }))
              }
              className={`${inp} mt-2`}
            >
              {EU_MARKETPLACES.map((m) => (
                <option key={m.id} value={m.id}>
                  Amazon {m.label} ({m.code}) · {m.currency}
                </option>
              ))}
            </select>
          </section>

          {/* Programación horaria */}
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white/90">Programación horaria</span>
              <Toggle
                on={s.scheduleEnabled}
                disabled={saving}
                onClick={() => setS((v) => ({ ...v, scheduleEnabled: !v.scheduleEnabled }))}
              />
            </div>
            <p className="mt-1 text-[11px] text-white/40">
              Solo reprecia dentro de la franja (hora de España).
            </p>
            {s.scheduleEnabled && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={lbl}>Desde (h)</span>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={s.scheduleStartHour}
                    onChange={(e) =>
                      setS((v) => ({ ...v, scheduleStartHour: Number(e.target.value) }))
                    }
                    className={inp}
                  />
                </label>
                <label className="block">
                  <span className={lbl}>Hasta (h, excl.)</span>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={s.scheduleEndHour}
                    onChange={(e) =>
                      setS((v) => ({ ...v, scheduleEndHour: Number(e.target.value) }))
                    }
                    className={inp}
                  />
                </label>
              </div>
            )}
          </section>

          {/* Simulación + throttling */}
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white/90">Modo simulación</div>
                <div className="text-[11px] text-white/45">
                  Calcula pero NO aplica el precio en Amazon.
                </div>
              </div>
              <Toggle
                on={s.dryRun}
                disabled={saving}
                onClick={() => setS((v) => ({ ...v, dryRun: !v.dryRun }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={lbl}>Retardo PATCH (ms)</span>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  step={100}
                  value={s.patchDelayMs}
                  onChange={(e) => setS((v) => ({ ...v, patchDelayMs: Number(e.target.value) }))}
                  className={inp}
                />
              </label>
              <label className="block">
                <span className={lbl}>Auto-sync (h, 0=off)</span>
                <input
                  type="number"
                  min={0}
                  max={168}
                  value={s.autoSyncHours}
                  onChange={(e) =>
                    setS((v) => ({ ...v, autoSyncHours: Number(e.target.value) }))
                  }
                  className={inp}
                />
              </label>
            </div>
            <p className="text-[10px] text-white/35">
              Auto-sync: el motor re-sincroniza tu catálogo de Amazon cada N horas
              automáticamente (además del botón manual).
            </p>
          </section>

          {/* Estrategia por defecto de la cuenta */}
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-semibold text-white/90">
              Estrategia por defecto
            </div>
            <p className="mt-1 text-[11px] text-white/45">
              Se aplica a productos con “Usar ajustes de la cuenta”.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className={lbl}>Estrategia</span>
                <select
                  value={s.defaultStrategy}
                  onChange={(e) =>
                    setS((v) => ({
                      ...v,
                      defaultStrategy: e.target.value as AccountSettingsData["defaultStrategy"],
                    }))
                  }
                  className={inp}
                >
                  <option value="BUYBOX">Ganar Buy Box</option>
                  <option value="MATCH">Igualar</option>
                  <option value="FIXED">Precio fijo</option>
                  <option value="MARGIN">Por margen</option>
                </select>
              </label>
              <label className="block">
                <span className={lbl}>Sin competencia</span>
                <select
                  value={s.defaultNoCompetition}
                  onChange={(e) =>
                    setS((v) => ({
                      ...v,
                      defaultNoCompetition: e.target
                        .value as AccountSettingsData["defaultNoCompetition"],
                    }))
                  }
                  className={inp}
                >
                  <option value="MAX">Subir al máximo</option>
                  <option value="HOLD">Mantener</option>
                  <option value="STEP_UP">Subir gradualmente</option>
                </select>
              </label>
              {s.defaultNoCompetition === "STEP_UP" && (
                <>
                  <label className="block">
                    <span className={lbl}>Paso por</span>
                    <select
                      value={s.defaultStepUpType}
                      onChange={(e) =>
                        setS((v) => ({
                          ...v,
                          defaultStepUpType: e.target
                            .value as AccountSettingsData["defaultStepUpType"],
                        }))
                      }
                      className={inp}
                    >
                      <option value="AMOUNT">Importe €</option>
                      <option value="PERCENT">Porcentaje %</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className={lbl}>
                      {s.defaultStepUpType === "PERCENT" ? "% / ciclo" : "€ / ciclo"}
                    </span>
                    <input
                      inputMode="decimal"
                      value={s.defaultStepUpValue}
                      onChange={(e) =>
                        setS((v) => ({
                          ...v,
                          defaultStepUpValue:
                            Number.parseFloat(e.target.value.replace(",", ".")) || 0,
                        }))
                      }
                      className={inp}
                    />
                  </label>
                </>
              )}
              <label className="block">
                <span className={lbl}>Bajar por</span>
                <select
                  value={s.defaultUndercutType}
                  onChange={(e) =>
                    setS((v) => ({
                      ...v,
                      defaultUndercutType: e.target
                        .value as AccountSettingsData["defaultUndercutType"],
                    }))
                  }
                  className={inp}
                >
                  <option value="AMOUNT">Importe €</option>
                  <option value="PERCENT">Porcentaje %</option>
                </select>
              </label>
              <label className="block">
                <span className={lbl}>Valor</span>
                <input
                  inputMode="decimal"
                  value={s.defaultUndercutValue}
                  onChange={(e) =>
                    setS((v) => ({
                      ...v,
                      defaultUndercutValue:
                        Number.parseFloat(e.target.value.replace(",", ".")) || 0,
                    }))
                  }
                  className={inp}
                />
              </label>
            </div>
          </section>

          {/* Alertas por email */}
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white/90">
                  Alertas por email
                </div>
                <div className="text-[11px] text-white/45">
                  Un resumen por ciclo si pasa algo relevante.
                </div>
              </div>
              <Toggle
                on={s.alertsEnabled}
                disabled={saving}
                onClick={() => setS((v) => ({ ...v, alertsEnabled: !v.alertsEnabled }))}
              />
            </div>
            {s.alertsEnabled && (
              <>
                <label className="block">
                  <span className={lbl}>Email (vacío = el de tu cuenta)</span>
                  <input
                    type="email"
                    value={s.alertEmail}
                    placeholder="avisos@tuempresa.com"
                    onChange={(e) =>
                      setS((v) => ({ ...v, alertEmail: e.target.value }))
                    }
                    className={inp}
                  />
                </label>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm text-white/85">Al perder la Buy Box</span>
                    <Toggle
                      on={s.alertOnBuyBoxLost}
                      disabled={saving}
                      onClick={() =>
                        setS((v) => ({ ...v, alertOnBuyBoxLost: !v.alertOnBuyBoxLost }))
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm text-white/85">
                      Al tocar el precio mínimo
                    </span>
                    <Toggle
                      on={s.alertOnPriceFloor}
                      disabled={saving}
                      onClick={() =>
                        setS((v) => ({ ...v, alertOnPriceFloor: !v.alertOnPriceFloor }))
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm text-white/85">Ante errores de reprecio</span>
                    <Toggle
                      on={s.alertOnError}
                      disabled={saving}
                      onClick={() =>
                        setS((v) => ({ ...v, alertOnError: !v.alertOnError }))
                      }
                    />
                  </label>
                </div>
              </>
            )}
          </section>

          {/* Datos y privacidad (RGPD) */}
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div>
              <div className="text-sm font-semibold text-white/90">
                Datos y privacidad (RGPD)
              </div>
              <div className="text-[11px] text-white/45">
                Descarga o elimina todos tus datos del repricer.
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={exportData}
              className="w-full rounded-lg border border-white/15 py-2 text-sm font-semibold text-white/80 hover:bg-white/[0.05] transition-colors disabled:opacity-50"
            >
              {busy ? "Procesando…" : "Descargar mis datos (JSON)"}
            </button>
            {!delConfirm ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setDelConfirm(true)}
                className="w-full rounded-lg border border-red-400/40 bg-red-500/10 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                Eliminar mi cuenta y todos mis datos
              </button>
            ) : (
              <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 space-y-2">
                <p className="text-[12px] text-white/80">
                  Esto borra <strong>de forma permanente</strong> tu conexión
                  con Amazon, productos, estrategias e histórico. No se puede
                  deshacer.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={deleteAccount}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {busy ? "Eliminando…" : "Sí, eliminar todo"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDelConfirm(false)}
                    className="text-sm text-white/55 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>

          {err && (
            <p className="text-xs text-red-300 rounded-lg border border-red-400/25 bg-red-500/10 p-2.5">
              {err}
            </p>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-lg bg-[var(--brand-600)] text-white py-2.5 text-sm font-semibold hover:bg-[var(--brand-700)] transition-colors disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar ajustes"}
          </button>
        </div>
      </div>
    </div>
  );
}
