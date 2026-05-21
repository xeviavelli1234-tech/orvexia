/**
 * Motor de aprendizaje continuo del asistente.
 *
 * Bucle supervisado:
 *   1) Cada Q&A se registra en AssistantInteraction.
 *   2) El usuario puede marcar 👍/👎 → helpful en la fila.
 *   3) Cron diario agrupa interacciones de baja calidad (sin match o 👎),
 *      crea candidatos AssistantLearnedTopic (approved=false).
 *   4) El admin aprueba/edita → approved=true. El runtime los usa.
 *   5) Cada uso incrementa usageCount; el feedback ajusta helpful/unhelpful.
 *
 * No usa embeddings externos (cero coste API): clustering por Jaccard de
 * tokens normalizados. Suficiente para FAQs cortas y reproducible en test.
 */

// ─── Tokenización ──────────────────────────────────────────────────────────
const STOP = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas",
  "de", "del", "al", "a", "en", "y", "o", "u", "que", "qué",
  "como", "cómo", "para", "por", "con", "sin", "sobre", "es", "son",
  "se", "le", "lo", "me", "te", "mi", "tu", "su", "mis", "tus", "sus",
  "ser", "soy", "eres", "este", "esta", "esto", "ese", "esa", "eso",
  "yo", "tu", "él", "el", "ella", "nosotros", "ellos",
  "si", "no", "ya", "muy", "mas", "más", "menos", "tan",
  "hay", "haya", "hace", "hacer", "puedo", "puedes", "puede",
  "the", "is", "of", "to", "and", "a", "an", "in", "on",
]);

export function tokenize(text: string): string[] {
  const norm = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // sin acentos
    .replace(/[^\w\s]/g, " ");
  return norm
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const uni = sa.size + sb.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

// ─── Clustering simple (greedy, conexión por similitud > umbral) ───────────
export interface ClusterInput {
  id: string;
  question: string;
  tokens?: string[];
}
export interface Cluster {
  questions: ClusterInput[];
  representative: ClusterInput; // la más "central" (mayor solapamiento medio)
  keywords: string[]; // top tokens por frecuencia en el cluster
}

export function clusterQuestions(
  inputs: ClusterInput[],
  threshold = 0.34,
): Cluster[] {
  const prepared = inputs.map((q) => ({ ...q, tokens: q.tokens ?? tokenize(q.question) }));
  const clusters: ClusterInput[][] = [];

  for (const q of prepared) {
    let best = -1;
    let bestSim = threshold;
    for (let i = 0; i < clusters.length; i++) {
      // similitud media contra todos los miembros del cluster
      const sims = clusters[i].map((m) => jaccard(q.tokens!, m.tokens!));
      const avg = sims.reduce((s, v) => s + v, 0) / sims.length;
      if (avg >= bestSim) {
        bestSim = avg;
        best = i;
      }
    }
    if (best === -1) clusters.push([q]);
    else clusters[best].push(q);
  }

  return clusters.map((arr) => {
    // representante = el que maximiza similitud media con el resto
    let rep = arr[0];
    let repScore = -1;
    for (const a of arr) {
      const score =
        arr.length === 1
          ? 1
          : arr.reduce((s, b) => (a === b ? s : s + jaccard(a.tokens!, b.tokens!)), 0) /
            (arr.length - 1);
      if (score > repScore) {
        repScore = score;
        rep = a;
      }
    }
    // keywords = top tokens por frecuencia, máx 8
    const freq = new Map<string, number>();
    for (const q of arr) for (const t of q.tokens!) freq.set(t, (freq.get(t) ?? 0) + 1);
    const keywords = [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([k]) => k);
    return { questions: arr, representative: rep, keywords };
  });
}

// ─── Serialización keywords ────────────────────────────────────────────────
export function serializeKeywords(ks: string[]): string {
  return ks.map((k) => k.trim()).filter(Boolean).join(",");
}
export function parseKeywords(s: string): string[] {
  return s
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}
export function parseFollowUps(s: string): string[] {
  return s.split("|").map((k) => k.trim()).filter(Boolean);
}
export function serializeFollowUps(ks: string[]): string {
  return ks.map((k) => k.trim()).filter(Boolean).join("|");
}

// ─── Matching contra topics aprendidos ─────────────────────────────────────
export interface LearnedTopicLike {
  id: string;
  keywords: string;
  answer: string;
  followUps: string;
  usageCount: number;
  helpfulCount: number;
  unhelpfulCount: number;
}

/**
 * Devuelve el topic aprendido con mejor afinidad o null.
 * Score = (tokens compartidos / tokens de la pregunta) + pequeño boost por feedback.
 * El boost evita que un topic poco fiable supere a uno con buen historial.
 */
export function bestLearnedTopic(
  question: string,
  topics: LearnedTopicLike[],
  minScore = 0.34,
): LearnedTopicLike | null {
  if (topics.length === 0) return null;
  const qTokens = tokenize(question);
  if (qTokens.length === 0) return null;

  let best: LearnedTopicLike | null = null;
  let bestScore = minScore;
  for (const t of topics) {
    const kws = parseKeywords(t.keywords);
    if (kws.length === 0) continue;
    const hit = kws.reduce((s, k) => (qTokens.includes(k) ? s + 1 : s), 0);
    if (hit === 0) continue;
    const base = hit / Math.max(qTokens.length, kws.length);
    // boost: helpful da +5 % por punto, unhelpful resta el 3 %
    const reputation = t.helpfulCount * 0.05 - t.unhelpfulCount * 0.03;
    const score = base + Math.max(-0.2, Math.min(0.3, reputation));
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

/** Calidad de una respuesta estática: cuántas keys golpearon. */
export function scoreStaticTopic(question: string, keys: string[]): number {
  const q = tokenize(question);
  let hits = 0;
  for (const k of keys) {
    const tk = tokenize(k);
    if (tk.length === 0) continue;
    const matched = tk.every((tok) => q.includes(tok));
    if (matched) hits++;
  }
  return hits;
}
