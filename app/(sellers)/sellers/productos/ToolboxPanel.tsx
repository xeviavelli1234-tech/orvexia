"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setVacationModeAction,
  addNotificationChannelAction,
  deleteNotificationChannelAction,
  testNotificationChannelAction,
} from "./actions";

interface HealthData {
  health: {
    score: number;
    letter: "A" | "B" | "C" | "D" | "F";
    breakdown: {
      active: number;
      configured: number;
      costed: number;
      winning: number;
      healthy: number;
      total: number;
      byBucket: Record<string, number>;
    };
  };
  suggestions: Array<{
    id: string;
    kind: string;
    severity: "info" | "warn" | "critical";
    listingId?: string;
    title: string;
    detail: string;
    action: string;
  }>;
}

interface Channel {
  id: string;
  kind: string;
  label: string;
  webhookUrl: string;
  extraTarget: string;
  enabled: boolean;
  lastSentAt: string | null;
  lastError: string | null;
}

interface VacationData {
  vacationFrom: string | null;
  vacationTo: string | null;
  vacationNote: string;
}

export function ToolboxButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("orvexia:open-toolbox"))}
      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors text-left"
    >
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
        Herramientas extra
      </span>
      <span className="text-[11px] text-white/40">salud · vacaciones · canales →</span>
    </button>
  );
}

export default function ToolboxPanel({
  initialVacation,
}: {
  initialVacation: VacationData;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"health" | "vacation" | "channels">("health");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("orvexia:open-toolbox", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("orvexia:open-toolbox", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    if (tab === "health" && !health) loadHealth();
    if (tab === "channels") loadChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  async function loadHealth() {
    setLoading(true);
    try {
      const r = await fetch("/api/sellers/health");
      if (r.ok) setHealth(await r.json());
    } finally {
      setLoading(false);
    }
  }
  async function loadChannels() {
    setLoading(true);
    try {
      const r = await fetch("/api/sellers/channels");
      if (r.ok) {
        const j = (await r.json()) as { channels: Channel[] };
        setChannels(j.channels);
      }
    } finally {
      setLoading(false);
    }
  }

  function onVacationSubmit(fd: FormData) {
    startTransition(async () => {
      const r = await setVacationModeAction(fd);
      setMsg(r.ok ? { ok: true, text: "Modo vacaciones actualizado." } : { ok: false, text: r.error ?? "Error" });
      if (r.ok) router.refresh();
    });
  }

  function onAddChannel(fd: FormData) {
    startTransition(async () => {
      const r = await addNotificationChannelAction(fd);
      if (r.ok) {
        setMsg({ ok: true, text: "Canal añadido." });
        await loadChannels();
      } else {
        setMsg({ ok: false, text: r.error ?? "Error" });
      }
    });
  }

  function onTestChannel(id: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const r = await testNotificationChannelAction(fd);
      setMsg(
        r.ok
          ? { ok: true, text: "Mensaje de prueba enviado." }
          : { ok: false, text: r.error ?? "Falló el envío de prueba." },
      );
    });
  }

  function onDeleteChannel(id: string) {
    if (!confirm("¿Borrar este canal?")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const r = await deleteNotificationChannelAction(fd);
      if (r.ok) {
        setMsg({ ok: true, text: "Canal borrado." });
        await loadChannels();
      } else {
        setMsg({ ok: false, text: r.error ?? "Error" });
      }
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 backdrop-blur-sm fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[min(720px,calc(100vw-2rem))] max-h-[92vh] overflow-y-auto rounded-2xl border border-fuchsia-400/25 bg-[rgba(7,7,18,0.97)] shadow-[0_20px_60px_-20px_rgba(232,121,249,0.45)]"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5 bg-[rgba(7,7,18,0.97)] backdrop-blur-xl">
          <div>
            <p className="font-mono-ui text-[10px] uppercase tracking-wider text-fuchsia-300">
              ▸ herramientas extra
            </p>
            <h3 className="text-base font-bold text-white">Toolbox del Repricer</h3>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-white/10 p-0.5 text-xs">
            {(["health", "vacation", "channels"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-md transition-colors capitalize ${
                  tab === t ? "bg-fuchsia-500/80 text-black" : "text-white/55 hover:text-white"
                }`}
              >
                {t === "health" ? "Salud" : t === "vacation" ? "Vacaciones" : "Canales"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="h-8 w-8 grid place-items-center rounded-md text-white/40 hover:text-white hover:bg-white/10"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div className="px-5 py-4 space-y-4">
          {msg && (
            <p
              className={`text-xs px-3 py-2 rounded-lg border ${
                msg.ok
                  ? "text-emerald-300 border-emerald-400/30 bg-emerald-500/[0.06]"
                  : "text-rose-300 border-rose-400/30 bg-rose-500/[0.06]"
              }`}
            >
              {msg.text}
            </p>
          )}

          {/* ── HEALTH ────────────────────────────────────────── */}
          {tab === "health" && (
            <section className="space-y-4">
              {loading && !health ? (
                <p className="text-sm text-white/55">Cargando…</p>
              ) : health ? (
                <>
                  <div className="rounded-xl border border-cyan-400/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.10),rgba(232,121,249,0.06))] p-5 flex items-center gap-5">
                    <div
                      className={`text-5xl font-extrabold tabular-nums ${
                        health.health.score >= 75
                          ? "text-emerald-300"
                          : health.health.score >= 55
                            ? "text-amber-300"
                            : "text-rose-300"
                      }`}
                    >
                      {health.health.score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-white/45">
                        Score de salud del catálogo
                      </div>
                      <div className="mt-0.5 text-2xl font-bold text-white">
                        Nota:{" "}
                        <span
                          className={
                            health.health.letter === "A"
                              ? "text-emerald-300"
                              : health.health.letter === "F"
                                ? "text-rose-300"
                                : "text-amber-300"
                          }
                        >
                          {health.health.letter}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                        <Stat label="Activos" value={`${health.health.breakdown.active}%`} />
                        <Stat label="Con rango" value={`${health.health.breakdown.configured}%`} />
                        <Stat label="Con coste" value={`${health.health.breakdown.costed}%`} />
                        <Stat label="Buy Box" value={`${health.health.breakdown.winning}%`} />
                        <Stat label="Sin errores" value={`${health.health.breakdown.healthy}%`} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-white/45 mb-2">
                      Sugerencias accionables ({health.suggestions.length})
                    </h4>
                    {health.suggestions.length === 0 ? (
                      <p className="text-sm text-white/55 rounded-lg border border-emerald-400/25 bg-emerald-500/[0.05] px-3 py-3">
                        🎉 Todo en orden. No hay nada accionable pendiente.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {health.suggestions.slice(0, 15).map((s) => (
                          <li
                            key={s.id}
                            className={`rounded-lg border px-3 py-2.5 text-sm ${
                              s.severity === "critical"
                                ? "border-rose-400/30 bg-rose-500/[0.06]"
                                : s.severity === "warn"
                                  ? "border-amber-400/30 bg-amber-500/[0.06]"
                                  : "border-white/10 bg-white/[0.03]"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span
                                className={
                                  s.severity === "critical"
                                    ? "text-rose-300"
                                    : s.severity === "warn"
                                      ? "text-amber-300"
                                      : "text-white/55"
                                }
                              >
                                {s.severity === "critical" ? "⛔" : s.severity === "warn" ? "⚠" : "ℹ"}
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-white/90">{s.title}</div>
                                <div className="text-xs text-white/65 mt-0.5">{s.detail}</div>
                                <div className="text-[11px] text-cyan-300 mt-1">→ {s.action}</div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : null}
            </section>
          )}

          {/* ── VACATION ─────────────────────────────────────── */}
          {tab === "vacation" && (
            <section className="space-y-4">
              <p className="text-sm text-white/65">
                Mientras esté activo, el motor <strong className="text-white">NO reprecia</strong>{" "}
                ningún producto. Útil para vacaciones, festivos o si quieres congelar tu catálogo
                durante un evento.
              </p>
              <form
                action={onVacationSubmit}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label>
                    <span className="text-[10px] uppercase tracking-wider text-white/45">Desde</span>
                    <input
                      type="datetime-local"
                      name="vacationFrom"
                      defaultValue={initialVacation.vacationFrom ?? ""}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label>
                    <span className="text-[10px] uppercase tracking-wider text-white/45">Hasta</span>
                    <input
                      type="datetime-local"
                      name="vacationTo"
                      defaultValue={initialVacation.vacationTo ?? ""}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-white/45">
                    Nota (opcional, para tu equipo)
                  </span>
                  <input
                    name="vacationNote"
                    defaultValue={initialVacation.vacationNote}
                    placeholder="Vacaciones agosto · evitar cambios durante Prime Day…"
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                  />
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg bg-fuchsia-500/90 px-4 py-2 text-sm font-semibold text-black hover:bg-fuchsia-400 transition-colors disabled:opacity-50"
                  >
                    Guardar
                  </button>
                  <button
                    type="submit"
                    formAction={(fd) => {
                      fd.set("vacationFrom", "");
                      fd.set("vacationTo", "");
                      fd.set("vacationNote", "");
                      onVacationSubmit(fd);
                    }}
                    className="text-xs text-white/55 hover:text-white"
                  >
                    Desactivar
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* ── CHANNELS ──────────────────────────────────────── */}
          {tab === "channels" && (
            <section className="space-y-4">
              <p className="text-sm text-white/65">
                Envía las alertas del repricer también a <strong>Slack</strong>,{" "}
                <strong>Telegram</strong>, <strong>Discord</strong> o un{" "}
                <strong>webhook genérico</strong> (Make, Zapier, n8n…).
              </p>

              <form
                action={onAddChannel}
                className="rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/[0.04] p-4 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label>
                    <span className="text-[10px] uppercase tracking-wider text-white/45">Tipo</span>
                    <select
                      name="kind"
                      defaultValue="slack"
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                    >
                      <option value="slack">Slack</option>
                      <option value="discord">Discord</option>
                      <option value="telegram">Telegram</option>
                      <option value="webhook">Webhook genérico</option>
                    </select>
                  </label>
                  <label>
                    <span className="text-[10px] uppercase tracking-wider text-white/45">Etiqueta</span>
                    <input
                      name="label"
                      placeholder="#alertas-repricer"
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-white/45">
                    URL del webhook (Slack/Discord) o base del bot Telegram
                  </span>
                  <input
                    name="webhookUrl"
                    required
                    placeholder="https://hooks.slack.com/services/… · https://discord.com/api/webhooks/… · https://api.telegram.org/bot{TOKEN}"
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs font-mono text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-white/45">
                    chat_id (solo Telegram)
                  </span>
                  <input
                    name="extraTarget"
                    placeholder="123456789 o -100123456789 (grupo)"
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs font-mono text-white"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-fuchsia-500/90 px-4 py-2 text-sm font-semibold text-black hover:bg-fuchsia-400 transition-colors disabled:opacity-50"
                >
                  + Añadir canal
                </button>
              </form>

              {/* Lista */}
              <div className="space-y-2">
                {loading ? (
                  <p className="text-sm text-white/55">Cargando…</p>
                ) : channels.length === 0 ? (
                  <p className="text-sm text-white/45">
                    Aún no tienes canales externos. Añade uno arriba.
                  </p>
                ) : (
                  channels.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-white/10 bg-white/[0.03] p-3 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white/90">
                          {kindEmoji(c.kind)} {c.label}{" "}
                          <span className="text-xs text-white/40 ml-1 font-mono">· {c.kind}</span>
                        </div>
                        <div className="text-[11px] text-white/45 font-mono truncate max-w-[420px]">
                          {c.webhookUrl}
                        </div>
                        {c.lastError && (
                          <div className="text-[11px] text-rose-300 mt-0.5">
                            Último error: {c.lastError}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onTestChannel(c.id)}
                          disabled={busy}
                          className="text-xs text-cyan-300 hover:underline"
                        >
                          probar
                        </button>
                        <button
                          onClick={() => onDeleteChannel(c.id)}
                          disabled={busy}
                          className="text-xs text-rose-300 hover:underline"
                        >
                          borrar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/[0.04] px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="text-sm font-bold text-white">{value}</div>
    </div>
  );
}

function kindEmoji(k: string) {
  return k === "slack" ? "💬" : k === "telegram" ? "✈️" : k === "discord" ? "🎮" : "🔗";
}
