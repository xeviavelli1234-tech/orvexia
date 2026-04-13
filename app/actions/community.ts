"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  console.log("[createCommunityPost] session:", session ? `userId=${session.userId}` : "null");
  if (!session) {
    return { error: "Debes iniciar sesión para publicar." };
  }

  const raw = {
    title: formData.get("title"),
    content: formData.get("content"),
    type: formData.get("type") ?? "DISCUSION",
    productId: formData.get("productId"),
  };
  console.log("[createCommunityPost] raw:", raw);

  const parsed = communityPostSchema.safeParse(raw);
  if (!parsed.success) {
    console.log("[createCommunityPost] validation errors:", parsed.error.flatten());
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
  redirect("/comunidad");
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

  revalidatePath("/comunidad", "layout");
  return { success: "Comentario publicado" };
}

export async function deleteCommunityPost(
  postId: string
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "No autenticado." };

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { userId: true },
  });
  if (!post) return { error: "Post no encontrado." };
  if (post.userId !== session.userId) return { error: "No autorizado." };

  await prisma.communityPost.delete({ where: { id: postId } });
  revalidatePath("/comunidad");
  redirect("/comunidad");
}

export async function deleteCommunityComment(
  commentId: string,
  postId: string
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "No autenticado." };

  const comment = await prisma.communityComment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });
  if (!comment) return { error: "Comentario no encontrado." };
  if (comment.userId !== session.userId) return { error: "No autorizado." };

  await prisma.communityComment.delete({ where: { id: commentId } });
  revalidatePath(`/comunidad/${postId}`);
  return {};
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
    revalidatePath("/comunidad", "layout");
    return { liked: false };
  }

  await prisma.communityVote.create({
    data: { postId, userId: session.userId, value: 1 },
  });
  revalidatePath("/comunidad", "layout");
  return { liked: true };
}
