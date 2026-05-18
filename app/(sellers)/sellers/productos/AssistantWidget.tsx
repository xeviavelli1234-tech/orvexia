"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const GREETING: Msg = {
  role: "assistant",
  content:
    "¡Hola! Soy el **Asistente Orvexia**. Conozco tu catálogo y el motor de reprecio. Pregúntame lo que quieras: rango Mín/Máx, estrategias, por qué un producto no se reprecia, cómo igualar el precio de mercado…",
};

const START_SUGGESTIONS = [
  "¿Qué hace el rango Mín/Máx?",
  "¿Cómo igualo el precio de mercado?",
  "¿Por qué un producto sale en gris?",
  "¿Cada cuánto reprecia?",
];

const STORE_KEY = "orvexia_assistant_v1";

/** Render markdown-lite: **negrita**, listas "- ", saltos de línea. */
function render(text: string) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (k: number) => {
    if (!bullets.length) return;
    out.push(
      <ul key={`u${k}`} className="my-1 ml-4 list-disc space-y-0.5">
        {bullets.map((b, i) => (
          <li key={i}>{inline(b)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };
  lines.forEach((ln, i) => {
    const t = ln.trim();
    if (t.startsWith("- ") || t.startsWith("• ")) {
      bullets.push(t.slice(2));
    } else {
      flush(i);
      if (t) out.push(<p key={`p${i}`} className="my-0.5">{inline(t)}</p>);
    }
  });
  flush(lines.length);
  return out;
}
function inline(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-white">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function decodeFollowups(h: string | null): string[] {
  if (!h) return [];
  try {
    const json = decodeURIComponent(escape(atob(h)));
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.slice(0, 4) : [];
  } catch {
    return [];
  }
}

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [followups, setFollowups] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // cargar conversación
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as Msg[];
        if (Array.isArray(arr) && arr.length) setMsgs(arr);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // persistir
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-30)));
    } catch {
      /* ignore */
    }
  }, [msgs]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open, loading, followups]);

  useEffect(() => {
    if (open) setUnread(false);
  }, [open]);

  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setFollowups([]);
    const history = [...msgs, { role: "user" as const, content: q }];
    setMsgs([...history, { role: "assistant", content: "" }]);
    setInput("");
    setTimeout(autosize, 0);
    setLoading(true);
    setStreaming(false);

    try {
      const res = await fetch("/api/sellers/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.slice(1) }), // sin el saludo
      });

      const fu = decodeFollowups(res.headers.get("x-followups"));

      if (!res.ok || !res.body) {
        let reply = "No he podido responder ahora mismo. Inténtalo de nuevo.";
        try {
          const j = await res.json();
          if (j?.reply) reply = j.reply;
        } catch {
          /* ignore */
        }
        setMsgs((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "assistant", content: reply };
          return c;
        });
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      setStreaming(true);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        if (!chunk) continue;
        setMsgs((m) => {
          const c = [...m];
          c[c.length - 1] = {
            role: "assistant",
            content: c[c.length - 1].content + chunk,
          };
          return c;
        });
      }
      setFollowups(fu);
      if (!open) setUnread(true);
    } catch {
      setMsgs((m) => {
        const c = [...m];
        c[c.length - 1] = {
          role: "assistant",
          content: "Error de red. Inténtalo de nuevo.",
        };
        return c;
      });
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }

  function clearChat() {
    setMsgs([GREETING]);
    setFollowups([]);
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* ignore */
    }
  }

  const showStarters = msgs.length <= 1 && !loading;
  const chips = showStarters ? START_SUGGESTIONS : followups;

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      {open && (
        <div className="mb-3 flex h-[32rem] w-[23rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-cyan-400/20 bg-[rgba(7,7,18,0.97)] backdrop-blur-2xl shadow-[0_24px_70px_-18px_rgba(34,211,238,0.45)] fade-in">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.7)]" />
              <span className="text-sm font-bold text-white/90">
                Asistente <span className="text-gradient-neon">Orvexia</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                title="Vaciar conversación"
                className="h-7 w-7 grid place-items-center rounded-md text-white/35 hover:text-white hover:bg-white/10 transition-colors text-xs"
              >
                ⟲
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="h-7 w-7 grid place-items-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {msgs.map((m, i) => {
              const isLast = i === msgs.length - 1;
              const empty = m.role === "assistant" && m.content === "";
              return (
                <div
                  key={i}
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "ml-auto bg-[var(--brand-600)] text-white"
                      : "mr-auto bg-white/[0.05] text-white/85 border border-white/10"
                  }`}
                >
                  {empty && loading ? (
                    <span className="inline-flex gap-1 py-0.5">
                      <Dot /> <Dot d="0.15s" /> <Dot d="0.3s" />
                    </span>
                  ) : m.role === "assistant" ? (
                    <div>
                      {render(m.content)}
                      {isLast && streaming && (
                        <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-cyan-300/80" />
                      )}
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              );
            })}

            {chips.length > 0 && !loading && (
              <div className="pt-1 flex flex-wrap gap-1.5">
                {chips.map((s) => (
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

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 border-t border-white/10 p-2.5"
          >
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autosize();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Pregunta sobre el motor… (Enter envía)"
              disabled={loading}
              className="flex-1 resize-none rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-400/60 focus:outline-none max-h-[120px]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              className="h-9 w-9 shrink-0 grid place-items-center rounded-lg bg-[var(--brand-600)] text-white hover:bg-[var(--brand-700)] transition-colors disabled:opacity-40"
            >
              ➤
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Asistente Orvexia"
        className="relative ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-600)] text-white shadow-[0_8px_30px_-6px_rgba(99,102,241,0.85)] hover:bg-[var(--brand-700)] hover:scale-105 transition-all"
      >
        {unread && !open && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-cyan-400 ring-2 ring-[#020207] animate-pulse" />
        )}
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

function Dot({ d = "0s" }: { d?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce"
      style={{ animationDelay: d }}
    />
  );
}
