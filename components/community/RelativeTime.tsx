"use client";

import { useState, useEffect } from "react";

function calc(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 2) return "ahora mismo";
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours < 24) return `hace ${hours}h`;
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(iso));
}

export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const [label, setLabel] = useState(() => calc(iso));

  useEffect(() => {
    // Refresh every 30 s so the label stays accurate
    const id = setInterval(() => setLabel(calc(iso)), 30_000);
    return () => clearInterval(id);
  }, [iso]);

  return (
    <time dateTime={iso} className={className} title={new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short" }).format(new Date(iso))}>
      {label}
    </time>
  );
}
