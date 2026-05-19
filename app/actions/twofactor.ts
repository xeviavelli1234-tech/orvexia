"use server";

import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/crypto";
import {
  generateSecret,
  otpauthUrl,
  verifyTotp,
  generateRecoveryCodes,
} from "@/lib/totp";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Genera un secreto y lo deja PREPARADO (sin activar) hasta confirmar. */
export async function startTwoFactorSetup(): Promise<
  R<{ secret: string; otpauth: string }>
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { ok: false, error: "no_user" };
  if (user.totpEnabled)
    return { ok: false, error: "El 2FA ya está activado." };

  const secret = generateSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: encryptToken(secret), totpEnabled: false },
  });
  return {
    ok: true,
    secret,
    otpauth: otpauthUrl({
      secret,
      label: user.email,
      issuer: "Orvexia",
    }),
  };
}

/** Confirma con un código; activa el 2FA y devuelve códigos de recuperación. */
export async function confirmTwoFactor(
  code: string,
): Promise<R<{ recoveryCodes: string[] }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.totpSecret)
    return { ok: false, error: "Inicia la configuración primero." };

  let valid = false;
  try {
    valid = verifyTotp(decryptToken(user.totpSecret), String(code).trim());
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, error: "Código incorrecto. Reintenta." };

  const recoveryCodes = generateRecoveryCodes(8);
  const hashes = await Promise.all(
    recoveryCodes.map((c) => bcrypt.hash(c.toUpperCase(), 10)),
  );
  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true, totpRecovery: JSON.stringify(hashes) },
  });
  return { ok: true, recoveryCodes };
}

/** Desactiva el 2FA (requiere la contraseña actual). */
export async function disableTwoFactor(password: string): Promise<R> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { ok: false, error: "no_user" };
  if (!user.password)
    return { ok: false, error: "Cuenta sin contraseña (Google)." };
  const valid = await bcrypt.compare(String(password), user.password);
  if (!valid) return { ok: false, error: "Contraseña incorrecta." };

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null, totpRecovery: null },
  });
  return { ok: true };
}
