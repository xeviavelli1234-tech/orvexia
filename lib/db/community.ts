import { CommunityPostType, Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
// Usa el cliente singleton centralizado para evitar instancias duplicadas
const db = prisma;

function isTableMissing(error: unknown) {
  return typeof error === "object" && error !== null && (error as any).code === "P2021";
}

export type CommunityFeedFilters = {
  type?: CommunityPostType | "TODOS";
  search?: string | null;
};

export async function getCommunityFeed(
  currentUserId?: string,
  filters?: CommunityFeedFilters
) {
  const where: Prisma.CommunityPostWhereInput = {
    ...(filters?.type && filters.type !== "TODOS" ? { type: filters.type } : {}),
    ...(filters?.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { content: { contains: filters.search, mode: "insensitive" } },
            { product: { name: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  try {
    return await db.communityPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarColor: true,
            avatarEmoji: true,
            avatarUrl: true,
          },
        },
        product: { select: { id: true, name: true, slug: true, image: true } },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            user: {
              select: { name: true, avatarColor: true, avatarEmoji: true },
            },
          },
        },
        _count: { select: { comments: true, votes: true } },
        ...(currentUserId
          ? {
              votes: {
                where: { userId: currentUserId },
                select: { id: true },
              },
            }
          : {}),
      },
    });
  } catch (error) {
    if (isTableMissing(error)) {
      console.warn("community tables missing; returning feed vacío");
      return [] as Awaited<ReturnType<typeof getCommunityFeed>>;
    }
    throw error;
  }
}

export async function getCommunityFacets() {
  try {
    const grouped = await db.communityPost.groupBy({
      by: ["type"],
      _count: { _all: true },
    });

    const base = {
      TODOS: 0,
      DISCUSION: 0,
      PREGUNTA: 0,
      CHOLLO: 0,
      CONSEJO: 0,
    } as Record<CommunityPostType | "TODOS", number>;

    for (const item of grouped) {
      base[item.type] = item._count._all;
      base.TODOS += item._count._all;
    }

    return base;
  } catch (error) {
    if (isTableMissing(error)) {
      console.warn("community tables missing; returning facets vacías");
      return {
        TODOS: 0,
        DISCUSION: 0,
        PREGUNTA: 0,
        CHOLLO: 0,
        CONSEJO: 0,
      } as Record<CommunityPostType | "TODOS", number>;
    }
    throw error;
  }
}

export async function getCommunityStats() {
  try {
    const [posts, comments, members] = await Promise.all([
      db.communityPost.count(),
      db.communityComment.count(),
      db.user.count(),
    ]);
    return { posts, comments, members };
  } catch (error) {
    if (isTableMissing(error)) {
      console.warn("community tables missing; returning stats cero");
      return { posts: 0, comments: 0, members: 0 };
    }
    throw error;
  }
}

export type CommunityFeedItem = Awaited<ReturnType<typeof getCommunityFeed>>[number];
