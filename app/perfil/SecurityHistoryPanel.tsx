"use client";

import { useState } from "react";

interface Attempt {
  id: string;
  ip: string | null;
  country: string | null;
  userAgent: string | null;
  method: string;
  success: boolean;
  reason: string | null;
  createdAt: string;
}
interface Location {
  id: string;
  ip: string;
  country: string | null;
  label: string;
  lastSeenAt: string;
}

function fmt(iso: string) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );
}

function shortUa(ua: string | null) {
  if (!ua) return "—";
  const m = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
  const os = ua.match(/\((.*?)\)/);
  return [m?.[0], os?.[1]].filter(Boolean).join(" · ").slice(0, 80) || ua.slice(0, 60);
}

export default function SecurityHistoryPanel({
  attempts,
  locations,
}: {
  attempts: Attempt[];
  locations: Location[];
}) {
  const [tab, setTab] = useState<"attempts" | "locations">("attempts");
  const box = "rounded-2xl border border-fg/10 bg-bg p-6 mt-6";

  return (
    <section className={box}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-fg">Actividad de seguridad</h2>
          <p className="text-sm text-fg-muted mt-0.5">
            Últimos accesos y ubicaciones que conocemos para tu cuenta.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-fg/10 p-0.5 text-xs">
          <button
            onClick={() => setTab("attempts")}
            className={`px-3 py-1 rounded-md transition-colors ${
              tab === "attempts" ? "bg-[var(--brand-600)] text-white" : "text-fg-muted hover:text-fg"
            }`}
          >
            Accesos
          </button>
          <button
            onClick={() => setTab("locations")}
            className={`px-3 py-1 rounded-md transition-colors ${
              tab === "locations" ? "bg-[var(--brand-600)] text-white" : "text-fg-muted hover:text-fg"
            }`}
          >
            Ubicaciones ({locations.length})
          </button>
        </div>
      </div>

      {tab === "attempts" ? (
        attempts.length === 0 ? (
          <p className="text-sm text-fg-muted">Sin actividad registrada todavía.</p>
        ) : (
          <ul className="divide-y divide-fg/10">
            {attempts.map((a) => (
              <li key={a.id} className="py-2.5 grid grid-cols-[auto_1fr_auto] gap-3 items-center">
                <span
                  title={a.success ? "ok" : a.reason ?? "fallo"}
                  className={`inline-block h-2 w-2 rounded-full ${
                    a.success ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-sm text-fg">
                    {labelMethod(a.method)}{" "}
                    {!a.success && (
                      <span className="text-rose-300 text-xs ml-1">· {a.reason ?? "fallido"}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-fg-muted truncate">
                    {a.ip ?? "ip oculta"} · {a.country ?? "—"} · {shortUa(a.userAgent)}
                  </div>
                </div>
                <span className="text-[11px] text-fg-muted whitespace-nowrap">
                  {fmt(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : locations.length === 0 ? (
        <p className="text-sm text-fg-muted">Aún no hay ubicaciones de confianza.</p>
      ) : (
        <ul className="divide-y divide-fg/10">
          {locations.map((l) => (
            <li key={l.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-fg">
                  {l.label} <span className="text-xs text-fg-muted font-normal">· {l.country ?? "—"}</span>
                </div>
                <div className="text-[11px] text-fg-muted font-mono truncate">{l.ip}</div>
              </div>
              <span className="text-[11px] text-fg-muted whitespace-nowrap">
                Vista {fmt(l.lastSeenAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[11px] text-fg-muted">
        🔒 Recibirás un email automáticamente si alguien inicia sesión en tu cuenta desde una
        ubicación que nunca habíamos visto.
      </p>
    </section>
  );
}

function labelMethod(m: string): string {
  switch (m) {
    case "password": return "Contraseña";
    case "passkey": return "Passkey";
    case "magic": return "Enlace por email";
    case "totp_verify": return "2FA";
    case "google": return "Google";
    default: return m;
  }
}
