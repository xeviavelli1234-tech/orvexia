import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "./ProfileClient";
import TwoFactorPanel from "./TwoFactorPanel";
import PasskeyPanel from "./PasskeyPanel";
import SecurityHistoryPanel from "./SecurityHistoryPanel";
import IpAllowlistPanel from "./IpAllowlistPanel";
import { headers } from "next/headers";
import { readRequestMeta } from "@/lib/security/request";
import {
  listLoginAttempts,
  listTrustedLocations,
} from "@/lib/security/login-monitoring";
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

  const sellerAcc = await prisma.sellerAccount.findUnique({
    where: { userId: session.userId },
    select: { ipAllowlist: true },
  });
  const h = await headers();
  const meta = readRequestMeta(new Request("http://x", { headers: h }));

  const [passkeys, attempts, locations] = await Promise.all([
    prisma.passkey.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        deviceType: true,
        backedUp: true,
        createdAt: true,
        lastUsedAt: true,
      },
    }),
    listLoginAttempts(session.userId, 20),
    listTrustedLocations(session.userId),
  ]);

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
        <PasskeyPanel
          initial={passkeys.map((p) => ({
            id: p.id,
            name: p.name,
            deviceType: p.deviceType,
            backedUp: p.backedUp,
            createdAt: p.createdAt.toISOString(),
            lastUsedAt: p.lastUsedAt ? p.lastUsedAt.toISOString() : null,
          }))}
        />
        <IpAllowlistPanel
          initial={sellerAcc?.ipAllowlist ?? ""}
          hasAccount={!!sellerAcc}
          currentIp={meta.ip}
        />
        <SecurityHistoryPanel
          attempts={attempts.map((a) => ({
            id: a.id,
            ip: a.ip,
            country: a.country,
            userAgent: a.userAgent,
            method: a.method,
            success: a.success,
            reason: a.reason,
            createdAt: a.createdAt.toISOString(),
          }))}
          locations={locations.map((l) => ({
            id: l.id,
            ip: l.ip,
            country: l.country,
            label: l.label,
            lastSeenAt: l.lastSeenAt.toISOString(),
          }))}
        />
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <MiActividad posts={posts} comments={comments} />
      </div>
    </>
  );
}
