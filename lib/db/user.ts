import { prisma } from "@/lib/prisma";

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  verificationToken?: string | null;
  verificationTokenExpires?: Date | null;
}) {
  return prisma.user.create({ data });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      avatarColor: true,
      avatarEmoji: true,
      bio: true,
      createdAt: true,
    },
  });
}

export async function findOrCreateGoogleUser(data: {
  googleId: string;
  email: string;
  name: string;
}) {
  // 1. Buscar por googleId
  const byGoogle = await prisma.user.findUnique({
    where: { googleId: data.googleId },
  });
  if (byGoogle) return byGoogle;

  // 2. Si existe por email, vincular la cuenta de Google
  const byEmail = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { googleId: data.googleId, emailVerified: true },
    });
  }

  // 3. Crear usuario nuevo
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      googleId: data.googleId,
      emailVerified: true,
    },
  });
}

export async function deleteExpiredUnverified(now: Date = new Date()) {
  return prisma.user.deleteMany({
    where: {
      emailVerified: false,
      verificationTokenExpires: { lt: now },
    },
  });
}
