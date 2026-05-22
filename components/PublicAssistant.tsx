"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface ProductChip {
  slug: string;
  name: string;
  brand: string;
  image: string | null;
  price: number | null;
  oldPrice: number | null;
  discount: number | null;
  store: string | null;
}

interface AssistantAnswer {
  answer: string;
  products?: ProductChip[];
  links?: { label: string; href: string }[];
  follow?: string[];
}

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  products?: ProductChip[];
  links?: { label: string; href: string }[];
  follow?: string[];
}

const STORAGE_KEY = "orvexia-assistant-thread-v1";
const SUGGESTIONS = [
  "¿Qué ofertas hay en frigoríficos?",
  "Recomiéndame una lavadora",
  "¿Cómo creo una alerta de precio?",
  "Bajadas recientes en televisores",
];

export function PublicAssistant() {
  const pathname = usePathname();
  // No se muestra en /sellers/* (tiene su propio asistente del repricer)
  // ni en rutas de auth (login/register) para no distraer.
  const hidden =
    pathname?.startsWith("/sellers") ||
    pathname === "/login" ||
    pathname === "/register";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persistencia ligera en localStorage para no perder la conversación al
  // navegar de página.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Message[];
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          idRef.current = parsed.length;
        }
      }
    } catch { /* localStorage no disponible o JSON malformado: ignorar */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    if (open) {
      // Pequeño delay para que la animación termine antes de hacer foco/scroll
      setTimeout(() => {
        inputRef.current?.focus();
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 80);
    }
  }, [open, messages.length]);

  const send = useCallback(async (raw: string) => {
    const question = raw.trim();
    if (!question || loading) return;
    setInput("");
    const userMsg: Message = { id: ++idRef.current, role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const r = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await r.json()) as AssistantAnswer | { error?: string };
      const text = "answer" in data && data.answer
        ? data.answer
        : "Algo ha fallado por mi parte. Inténtalo de nuevo.";
      const reply: Message = {
        id: ++idRef.current,
        role: "assistant",
        text,
        products: "products" in data ? data.products : undefined,
        links:    "links"    in data ? data.links    : undefined,
        follow:   "follow"   in data ? data.follow   : undefined,
      };
      setMessages((prev) => [...prev, reply]);
    } catch {
      setMessages((prev) => [...prev, {
        id: ++idRef.current,
        role: "assistant",
        text: "No he podido conectar. Revisa tu conexión y vuelve a intentarlo.",
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const reset = useCallback(() => {
    setMessages([]);
    idRef.current = 0;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  if (hidden) return null;

  return (
    <>
      {/* Botón flotante */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir asistente"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 inline-flex items-center gap-2 h-12 sm:h-14 px-4 sm:px-5 rounded-full text-white font-semibold text-sm shadow-lg shadow-brand-600/30 hover:scale-[1.03] active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}
        >
          <span className="text-lg sm:text-xl" aria-hidden>💬</span>
          <span className="hidden sm:inline">Asistente</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Asistente Orvexia"
          className="fixed z-50 bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-[380px] h-[90vh] sm:h-[600px] max-h-[90vh] bg-bg-elevated border border-border-subtle sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <header
            className="px-4 py-3 border-b border-border-subtle flex items-center justify-between gap-2"
            style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.10), rgba(124,58,237,0.10))" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg" aria-hidden>💬</span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-fg leading-none">Asistente Orvexia</p>
                <p className="text-[10px] text-fg-subtle mt-0.5">Te ayudo con productos, precios y la web</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={reset}
                  className="text-[11px] font-semibold text-fg-muted hover:text-fg px-2 h-7 rounded-md hover:bg-bg-subtle"
                  aria-label="Empezar nueva conversación"
                >
                  Limpiar
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-fg-muted hover:text-fg hover:bg-bg-subtle"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </header>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <Welcome onPick={send} />
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} onFollow={send} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-[12px] text-fg-subtle px-3">
                <Dots />
                <span>Pensando…</span>
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="px-3 sm:px-4 py-3 border-t border-border-subtle bg-bg-elevated"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregunta lo que quieras…"
                maxLength={500}
                className="flex-1 h-10 px-3 rounded-lg bg-bg-subtle border border-border text-[13px] text-fg placeholder:text-fg-subtle focus:outline-none focus:border-brand-500/60 focus:bg-bg-elevated"
                aria-label="Escribe tu pregunta"
              />
              <button
                type="submit"
                disabled={loading || input.trim().length === 0}
                aria-label="Enviar"
                className="h-10 w-10 inline-flex items-center justify-center rounded-lg text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-fg-subtle mt-1.5 text-center">
              Sin IA externa — respuestas locales con datos reales de Orvexia.
            </p>
          </form>
        </div>
      )}
    </>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function Welcome({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="px-2 py-2">
      <p className="text-[14px] font-bold text-fg mb-1">¡Hola! 👋</p>
      <p className="text-[12px] text-fg-muted leading-relaxed mb-3">
        Te puedo ayudar a encontrar productos, ver ofertas, recomendarte algo,
        o explicarte cómo usar cualquier parte de la web (alertas, comparador,
        guardados, cuenta…).
      </p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle mb-1.5">Prueba:</p>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="text-[11px] font-medium px-2.5 py-1.5 rounded-full bg-bg-subtle border border-border hover:border-brand-500/50 hover:bg-brand-500/5 text-fg-muted hover:text-fg transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message, onFollow }: { message: Message; onFollow: (q: string) => void }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tr-md bg-brand-600 text-white text-[13px] leading-relaxed break-words">
          {message.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-2 min-w-0">
        <div className="px-3 py-2 rounded-2xl rounded-tl-md bg-bg-subtle border border-border-subtle text-[13px] text-fg leading-relaxed break-words">
          <RenderMarkdown text={message.text} />
        </div>
        {message.products && message.products.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {message.products.slice(0, 4).map((p) => (
              <ProductChipCard key={p.slug} product={p} />
            ))}
          </div>
        )}
        {message.links && message.links.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/30 hover:bg-brand-500/15"
              >
                {l.label} →
              </Link>
            ))}
          </div>
        )}
        {message.follow && message.follow.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            {message.follow.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onFollow(f)}
                className="text-left text-[11px] text-fg-muted hover:text-fg px-2 py-1 rounded hover:bg-bg-subtle"
              >
                ↳ {f}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductChipCard({ product }: { product: ProductChip }) {
  return (
    <Link
      href={`/productos/${product.slug}`}
      className="block rounded-lg border border-border-subtle bg-bg-elevated p-1.5 hover:border-brand-500/50 transition-colors"
    >
      <div className="aspect-square w-full bg-white rounded border border-border overflow-hidden relative mb-1.5">
        {product.image ? (
          <Image src={product.image} alt="" fill className="object-contain p-1" sizes="120px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-25">📦</div>
        )}
        {product.discount ? (
          <span className="absolute top-1 left-1 inline-flex items-center px-1 h-4 rounded bg-fg-strong text-bg text-[9px] font-bold">
            −{product.discount}%
          </span>
        ) : null}
      </div>
      <p className="text-[9px] font-bold text-cyan-300 truncate">{product.brand}</p>
      <p className="text-[10px] font-bold text-fg line-clamp-2 leading-tight">{product.name}</p>
      {product.price !== null && (
        <p className="text-[11px] font-extrabold text-fg tabular mt-0.5">
          {formatPrice(product.price)}
        </p>
      )}
    </Link>
  );
}

function Dots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-fg-subtle animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-fg-subtle animate-bounce" style={{ animationDelay: "120ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-fg-subtle animate-bounce" style={{ animationDelay: "240ms" }} />
    </span>
  );
}

// ─── Markdown-lite renderer ──────────────────────────────────────────────────
// Pensado SOLO para el output controlado del asistente — no es seguro contra
// HTML/XSS de usuario. Soporta: **negrita**, *italic*, listas "- ", saltos
// de línea, y enlaces [texto](/ruta). Los enlaces que empiezan por "/" se
// renderizan con <Link> de Next; los externos se ignoran (el asistente no
// genera enlaces externos).

const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks = useMemo(() => parseBlocks(lines), [lines]);
  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "list") {
          return (
            <ul key={i} className="list-disc pl-5 my-1 space-y-0.5">
              {block.items.map((line, j) => <li key={j}><Inline text={line} /></li>)}
            </ul>
          );
        }
        return <p key={i} className={i > 0 ? "mt-2" : ""}><Inline text={block.text} /></p>;
      })}
    </>
  );
}

type Block = { type: "p"; text: string } | { type: "list"; items: string[] };

function parseBlocks(lines: string[]): Block[] {
  const out: Block[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.length === 0) return;
    out.push({ type: "p", text: buf.join(" ") });
    buf = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("- ")) {
      flush();
      const item = line.slice(2);
      const last = out[out.length - 1];
      if (last && last.type === "list") last.items.push(item);
      else out.push({ type: "list", items: [item] });
    } else if (line.length === 0) {
      flush();
    } else {
      buf.push(line);
    }
  }
  flush();
  return out;
}

function Inline({ text }: { text: string }) {
  const parts = text.split(INLINE_RE).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return <strong key={i} className="font-bold text-fg">{p.slice(2, -2)}</strong>;
        }
        if (p.startsWith("*") && p.endsWith("*")) {
          return <em key={i} className="italic">{p.slice(1, -1)}</em>;
        }
        const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(p);
        if (linkMatch) {
          const [, label, href] = linkMatch;
          if (href.startsWith("/")) {
            return <Link key={i} href={href} className="text-brand-300 hover:text-brand-200 underline underline-offset-2">{label}</Link>;
          }
          // No generamos enlaces externos, pero por si acaso renderiza solo el texto.
          return <span key={i}>{label}</span>;
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function formatPrice(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}
