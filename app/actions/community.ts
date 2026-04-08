"use server";

import { revalidatePath } from "next/cache";
import { communityCommentSchema, communityPostSchema } from "@/lib/validations";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export type CommunityActionState = {
  success?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createCommunityPost(
  _prev: CommunityActionState,
  formData: FormData
): Promise<CommunityActionState> {
  const session = await getSession();
  if (!session) {
    return { error: "Debes iniciar sesión para publicar." };
  }

  const raw = {
    title: formData.get("title"),
    content: formData.get("content"),
    type: formData.get("type") ?? "DISCUSION",
    productId: formData.get("productId"),
  };

  const parsed = communityPostSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.communityPost.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      type: parsed.data.type,
      productId: parsed.data.productId,
      userId: session.userId,
    },
  });

  revalidatePath("/comunidad");
  return { success: "Publicación creada" };
}

export async function createCommunityComment(
  postId: string,
  _prev: CommunityActionState,
  formData: FormData
): Promise<CommunityActionState> {
  const session = await getSession();
  if (!session) return { error: "Inicia sesión para comentar." };

  const raw = { content: formData.get("content") };
  const parsed = communityCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const postExists = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { id: true },
  });
  if (!postExists) return { error: "El post ya no está disponible." };

  await prisma.communityComment.create({
    data: {
      content: parsed.data.content,
      postId,
      userId: session.userId,
    },
  });

  revalidatePath("/comunidad");
  return { success: "Comentario publicado" };
}

export async function toggleCommunityVote(
  postId: string
): Promise<{ error?: string; liked?: boolean }> {
  const session = await getSession();
  if (!session) return { error: "Debes iniciar sesión para votar." };

  const existing = await prisma.communityVote.findUnique({
    where: { postId_userId: { postId, userId: session.userId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.communityVote.delete({ where: { id: existing.id } });
    revalidatePath("/comunidad");
    return { liked: false };
  }

  await prisma.communityVote.create({
    data: { postId, userId: session.userId, value: 1 },
  });
  revalidatePath("/comunidad");
  return { liked: true };
}
