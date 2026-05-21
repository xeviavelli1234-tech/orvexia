/**
 * Matcher puro del asistente local (sin `server-only`): coincidencia por
 * frases exactas + keys ponderadas por longitud. Testeable con node:test.
 *
 * Reglas:
 *   1) Si una `phrase` (normalizada sin acentos, case-insensible) aparece
 *      contenida en la pregunta, gana el topic con score alto. Frases
 *      largas pesan más, así una pregunta como "como reprecio los
 *      productos" prioriza la intención ("como reprecio") sobre keywords
 *      sueltas ambiguas ("productos").
 *   2) Si no, suma score por cada `key` (longitud / 4) que aparezca
 *      como palabra/frase completa (con bordes de no-letra).
 *   3) Se aplica `priority` del topic como multiplicador final.
 */

export interface MatcherTopic {
  keys: string[];
  phrases?: string[];
  priority?: number;
}

export interface MatchResult<T extends MatcherTopic> {
  topic: T;
  score: number;
  matchedKey: string;
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function scoreTopic(question: string, topic: MatcherTopic): {
  score: number;
  matchedKey: string;
} {
  const q = normalize(question);
  if (!q.trim()) return { score: 0, matchedKey: "" };
  const priority = topic.priority ?? 1;
  let topicScore = 0;
  let topicKey = topic.keys[0] ?? "";

  if (topic.phrases) {
    for (const ph of topic.phrases) {
      const nph = normalize(ph);
      if (nph.length >= 3 && q.includes(nph)) {
        const wordCount = nph.split(/\s+/).filter(Boolean).length;
        const phraseScore = 10 + wordCount * 4;
        if (phraseScore > topicScore) {
          topicScore = phraseScore;
          topicKey = ph;
        }
      }
    }
  }

  for (const k of topic.keys) {
    const nk = normalize(k);
    if (nk.length < 3) continue;
    if (!q.includes(nk)) continue;
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(nk)}([^a-z0-9]|$)`, "i");
    if (!re.test(q)) continue;
    topicScore += nk.length / 4;
    if (topicKey === topic.keys[0]) topicKey = k;
  }

  return { score: topicScore * priority, matchedKey: topicKey };
}

export function findBestTopic<T extends MatcherTopic>(
  question: string,
  topics: T[],
): MatchResult<T> | null {
  let best: MatchResult<T> | null = null;
  for (const t of topics) {
    const { score, matchedKey } = scoreTopic(question, t);
    if (score > 0 && (best == null || score > best.score)) {
      best = { topic: t, score, matchedKey };
    }
  }
  return best;
}
