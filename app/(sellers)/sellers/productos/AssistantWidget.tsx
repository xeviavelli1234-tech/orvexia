"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const GREETING: Msg = {
  role: "assistant",
  content:
    "¡Hola! Soy el asistente de Orvexia. Pregúntame sobre el motor de reprecio, el rango Mín/Máx, las estrategias o cómo igualar el precio de mercado.",
};

const SUGGESTIONS = [
  "¿Qué hace el rango Mín/Máx?",
  "¿Cómo igualo el precio de mercado?",
  "¿Cada cuánto reprecia?",
  "¿Por qué un producto sale en gris?",
];

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/sellers/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(1) }), // sin el saludo
      });
      const data = await res.json();
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: data.reply ?? "No he podido responder ahora mismo. Inténtalo de nuevo.",
        },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Error de red. Inténtalo de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      {open && (
        <div className="mb-3 flex h-[30rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-cyan-400/20 bg-[rgba(7,7,18,0.97)] backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(34,211,238,0.4)] fade-in">
          {/* Cabecera */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.7)]" />
              <span className="text-sm font-bold text-white/90">
                Asistente <span className="text-gradient-neon">Orvexia</span>
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="h-6 w-6 grid place-items-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[88%] rounded-xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "ml-auto bg-[var(--brand-600)] text-white"
                    : "mr-auto bg-white/[0.05] text-white/85 border border-white/10"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="mr-auto rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[13px] text-white/50">
                Escribiendo…
              </div>
            )}
            {msgs.length <= 1 && !loading && (
              <div className="pt-1 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-cyan-400/25 bg-cyan-400/5 px-2.5 py-1 text-[11px] text-cyan-200/90 hover:bg-cyan-400/10 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Entrada */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-white/10 p-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta sobre el motor…"
              disabled={loading}
              className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-400/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-lg bg-[var(--brand-600)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-700)] transition-colors disabled:opacity-40"
            >
              ➤
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Asistente Orvexia"
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-600)] text-white shadow-[0_8px_30px_-6px_rgba(99,102,241,0.8)] hover:bg-[var(--brand-700)] hover:scale-105 transition-all"
      >
        {open ? (
          <span className="text-2xl leading-none">×</span>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 3C7 3 3 6.4 3 10.6c0 2.3 1.2 4.3 3.2 5.7L5.5 20l4.1-2.1c.8.1 1.6.2 2.4.2 5 0 9-3.4 9-7.6S17 3 12 3Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
