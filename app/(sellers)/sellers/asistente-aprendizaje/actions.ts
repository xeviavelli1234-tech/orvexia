"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/admin";
import {
  approveCandidate,
  rejectCandidate,
  runLearningCycle,
} from "@/lib/assistant/store";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("unauthorized");
  const admin = await isAdminUser(session.userId);
  if (!admin) throw new Error("forbidden");
}

export async function approveCandidateAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const keywords = String(formData.get("keywords") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  const followUps = String(formData.get("followUps") ?? "").trim();
  if (!id || !keywords || !answer) return;
  await approveCandidate(id, { keywords, answer, followUps });
  revalidatePath("/sellers/asistente-aprendizaje");
}

export async function rejectCandidateAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await rejectCandidate(id);
  revalidatePath("/sellers/asistente-aprendizaje");
}

export async function unapproveCandidateAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.assistantLearnedTopic.update({
    where: { id },
    data: { approved: false, approvedAt: null },
  });
  revalidatePath("/sellers/asistente-aprendizaje");
}

export async function runCycleAction(): Promise<void> {
  await requireAdmin();
  await runLearningCycle();
  revalidatePath("/sellers/asistente-aprendizaje");
}

export async function createManualTopicAction(formData: FormData) {
  await requireAdmin();
  const keywords = String(formData.get("keywords") ?? "").trim();
  const sample = String(formData.get("sampleQuestion") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  const followUps = String(formData.get("followUps") ?? "").trim();
  if (!keywords || !answer) return;
  await prisma.assistantLearnedTopic.create({
    data: {
      keywords,
      sampleQuestion: sample || keywords,
      answer,
      followUps,
      source: "manual",
      approved: true,
      approvedAt: new Date(),
    },
  });
  revalidatePath("/sellers/asistente-aprendizaje");
}
