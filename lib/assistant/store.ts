import "server-only";
import { prisma } from "@/lib/prisma";
import {
  bestLearnedTopic,
  clusterQuestions,
  serializeKeywords,
  type LearnedTopicLike,
} from "./learning";

// ─── Cache en memoria de topics aprobados (5 min) ──────────────────────────
let cache: { topics: LearnedTopicLike[]; ts: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getApprovedLearnedTopics(): Promise<LearnedTopicLike[]> {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL_MS) return cache.topics;
  try {
    const rows = await prisma.assistantLearnedTopic.findMany({
      where: { approved: true },
      orderBy: { helpfulCount: "desc" },
      take: 200,
    });
    cache = { topics: rows, ts: now };
    return rows;
  } catch (e) {
    console.warn("[assistant.store] no se pudieron leer topics aprendidos:", e);
    return cache?.topics ?? [];
  }
}

export function invalidateLearnedCache() {
  cache = null;
}

/** Match contra topics aprendidos + actualiza usageCount best-effort. */
export async function lookupLearned(question: string) {
  const topics = await getApprovedLearnedTopics();
  const match = bestLearnedTopic(question, topics);
  if (!match) return null;
  prisma.assistantLearnedTopic
    .update({ where: { id: match.id }, data: { usageCount: { increment: 1 } } })
    .catch(() => {});
  return match;
}

// ─── Registro de interacciones ─────────────────────────────────────────────
export interface RecordInput {
  userId?: string | null;
  question: string;
  answer: string;
  matchedKind: "static" | "learned" | "model" | "none";
  matchedKey?: string | null;
  matchedScore?: number;
  clusterId?: string | null;
}

export async function recordInteraction(input: RecordInput): Promise<string | null> {
  try {
    const row = await prisma.assistantInteraction.create({
      data: {
        userId: input.userId ?? null,
        question: input.question.slice(0, 4000),
        answer: input.answer.slice(0, 8000),
        matchedKind: input.matchedKind,
        matchedKey: input.matchedKey ?? null,
        matchedScore: input.matchedScore ?? 0,
        clusterId: input.clusterId ?? null,
      },
      select: { id: true },
    });
    return row.id;
  } catch (e) {
    console.warn("[assistant.store] no se pudo registrar interacción:", e);
    return null;
  }
}

export async function recordFeedback(
  interactionId: string,
  helpful: boolean,
): Promise<boolean> {
  try {
    const prev = await prisma.assistantInteraction.findUnique({
      where: { id: interactionId },
      select: { helpful: true, clusterId: true },
    });
    if (!prev) return false;
    if (prev.helpful === helpful) return true; // idempotente
    await prisma.assistantInteraction.update({
      where: { id: interactionId },
      data: { helpful },
    });
    // Si la interacción vino de un topic aprendido, ajusta su reputación.
    if (prev.clusterId) {
      const delta: { helpfulCount?: { increment: number }; unhelpfulCount?: { increment: number } } = {};
      if (helpful) {
        delta.helpfulCount = { increment: 1 };
        if (prev.helpful === false) delta.unhelpfulCount = { increment: -1 };
      } else {
        delta.unhelpfulCount = { increment: 1 };
        if (prev.helpful === true) delta.helpfulCount = { increment: -1 };
      }
      await prisma.assistantLearnedTopic
        .update({ where: { id: prev.clusterId }, data: delta })
        .catch(() => {});
      invalidateLearnedCache();
    }
    return true;
  } catch (e) {
    console.warn("[assistant.store] no se pudo registrar feedback:", e);
    return false;
  }
}

// ─── Motor de aprendizaje ──────────────────────────────────────────────────
/**
 * Detecta interacciones recientes con baja confianza o feedback negativo,
 * las agrupa por similitud y crea candidatos AssistantLearnedTopic
 * (approved=false). El admin los revisará después.
 *
 * Devuelve un resumen del trabajo realizado.
 */
export async function runLearningCycle(opts?: {
  sinceDays?: number;
  minOccurrences?: number;
}): Promise<{ scanned: number; clustered: number; created: number }> {
  const sinceDays = opts?.sinceDays ?? 7;
  const minOccurrences = opts?.minOccurrences ?? 2;
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  // Interacciones candidatas: sin match O explícitamente marcadas como no útiles,
  // y aún sin asignar a un cluster.
  const rows = await prisma.assistantInteraction.findMany({
    where: {
      createdAt: { gte: since },
      clusterId: null,
      OR: [{ matchedKind: "none" }, { helpful: false }],
    },
    select: { id: true, question: true },
    take: 1000,
  });

  if (rows.length === 0) {
    return { scanned: 0, clustered: 0, created: 0 };
  }

  const clusters = clusterQuestions(
    rows.map((r) => ({ id: r.id, question: r.question })),
    0.34,
  );

  let created = 0;
  let clustered = 0;
  for (const c of clusters) {
    if (c.questions.length < minOccurrences) continue;
    if (c.keywords.length === 0) continue;

    // Comprueba si ya existe un topic con el mismo conjunto de keywords (evita duplicados).
    const keywordsStr = serializeKeywords(c.keywords);
    const dup = await prisma.assistantLearnedTopic.findFirst({
      where: { keywords: keywordsStr },
      select: { id: true, approved: true },
    });
    let topicId: string;
    if (dup) {
      topicId = dup.id;
      await prisma.assistantLearnedTopic.update({
        where: { id: dup.id },
        data: {
          occurrences: { increment: c.questions.length },
        },
      });
    } else {
      const t = await prisma.assistantLearnedTopic.create({
        data: {
          keywords: keywordsStr,
          sampleQuestion: c.representative.question.slice(0, 500),
          answer: "", // pendiente de redactar/aprobar
          source: "auto",
          approved: false,
          occurrences: c.questions.length,
        },
        select: { id: true },
      });
      topicId = t.id;
      created++;
    }

    // Marca las interacciones para no volver a procesarlas.
    await prisma.assistantInteraction.updateMany({
      where: { id: { in: c.questions.map((q) => q.id) } },
      data: { clusterId: topicId },
    });
    clustered += c.questions.length;
  }

  return { scanned: rows.length, clustered, created };
}

// ─── Admin: aprobación / edición / borrado ─────────────────────────────────
export interface CandidateRow {
  id: string;
  keywords: string;
  sampleQuestion: string;
  answer: string;
  followUps: string;
  source: string;
  approved: boolean;
  approvedAt: Date | null;
  usageCount: number;
  helpfulCount: number;
  unhelpfulCount: number;
  occurrences: number;
  createdAt: Date;
}

export async function listCandidates(approved = false, take = 100): Promise<CandidateRow[]> {
  return prisma.assistantLearnedTopic.findMany({
    where: { approved },
    orderBy: [{ occurrences: "desc" }, { createdAt: "desc" }],
    take,
  });
}

export async function listInteractionsForCluster(clusterId: string, take = 20) {
  return prisma.assistantInteraction.findMany({
    where: { clusterId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, question: true, answer: true, helpful: true, createdAt: true },
  });
}

export async function approveCandidate(
  id: string,
  patch: { keywords: string; answer: string; followUps: string },
) {
  await prisma.assistantLearnedTopic.update({
    where: { id },
    data: {
      keywords: patch.keywords,
      answer: patch.answer,
      followUps: patch.followUps,
      approved: true,
      approvedAt: new Date(),
      source: "manual",
    },
  });
  invalidateLearnedCache();
}

export async function rejectCandidate(id: string) {
  await prisma.assistantLearnedTopic.delete({ where: { id } });
  invalidateLearnedCache();
}

// ─── Estadísticas ──────────────────────────────────────────────────────────
export async function learningStats() {
  const [total, helpful, unhelpful, noMatch, approved, pending] = await Promise.all([
    prisma.assistantInteraction.count(),
    prisma.assistantInteraction.count({ where: { helpful: true } }),
    prisma.assistantInteraction.count({ where: { helpful: false } }),
    prisma.assistantInteraction.count({ where: { matchedKind: "none" } }),
    prisma.assistantLearnedTopic.count({ where: { approved: true } }),
    prisma.assistantLearnedTopic.count({ where: { approved: false } }),
  ]);
  return { total, helpful, unhelpful, noMatch, approved, pending };
}
