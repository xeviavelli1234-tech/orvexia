"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

function madridParts(): { date: string; secsToMidnight: number } {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // YYYY-MM-DD (igual que dailyKey en el server)

  const t = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => Number(t.find((p) => p.type === type)?.value ?? 0);
  let h = get("hour");
  if (h === 24) h = 0;
  const elapsed = h * 3600 + get("minute") * 60 + get("second");
  return { date, secsToMidnight: Math.max(0, 86400 - elapsed) };
}

function fmt(total: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

export default function DealsCountdown({ dayKey }: { dayKey: string }) {
  const router = useRouter();
  // null hasta montar: server y primer render cliente coinciden (sin
  // desajuste de hidratación); el primer tick rellena el valor.
  const [secs, setSecs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const { date, secsToMidnight } = madridParts();
      if (date !== dayKey) {
        // Cambió el día → nueva tanda de ofertas: recargar datos del server.
        router.refresh();
        return;
      }
      setSecs(secsToMidnight);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [dayKey, router]);

  return (
    <p
      className="mt-3 inline-flex items-center gap-2 font-mono-ui text-[11px] uppercase tracking-wide
        text-cyan-200/80 border border-cyan-400/20 bg-cyan-400/[0.05] rounded-full px-3 h-7"
      aria-live="off"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60 animate-ping" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400" />
      </span>
      {secs === null ? (
        "Nuevas ofertas cada día"
      ) : (
        <>
          Nuevas ofertas en
          <span className="tabular-nums text-white font-bold ml-1">{fmt(secs)}</span>
        </>
      )}
    </p>
  );
}
