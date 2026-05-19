import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "./ProfileClient";
import TwoFactorPanel from "./TwoFactorPanel";
import { MiActividad } from "@/components/community/MiActividad";
import type { MyPost, MyComment } from "@/components/community/MiActividad";

export const runtime = "nodejs";
export const metadata = { title: "Mi perfil · Orvexia" };

export default async function PerfilPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { totpEnabled: true, password: true },
  });

  const [rawPosts, rawComments] = await Promise.all([
    prisma.communityPost.findMany({
      where: { userId: session.userId },
      include: {
        product: { select: { name: true, image: true } },
        _count: { select: { comments: true, votes: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.communityComment.findMany({
      where: { userId: session.userId },
      include: {
        post: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const posts: MyPost[] = rawPosts.map((p) => ({
    id: p.id,
    title: p.title,
    type: p.type,
    createdAt: p.createdAt.toISOString(),
    product: p.product ? { name: p.product.name, image: p.product.image ?? null } : null,
    _count: p._count,
  }));

  const comments: MyComment[] = rawComments.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    post: { id: c.post.id, title: c.post.title, type: c.post.type },
  }));

  return (
    <>
      <ProfileClient />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-4">
        <TwoFactorPanel
          enabled={!!me?.totpEnabled}
          hasPassword={!!me?.password}
        />
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <MiActividad posts={posts} comments={comments} />
      </div>
    </>
  );
}
