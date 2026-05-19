"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { registerSchema, loginSchema } from "@/lib/validations";
import { getUserByEmail, createUser, deleteExpiredUnverified } from "@/lib/db/user";
import {
  createSession,
  deleteSession,
  createPending2fa,
  getPending2fa,
  clearPending2fa,
} from "@/lib/session";
import { decryptToken } from "@/lib/crypto";
import { verifyTotp } from "@/lib/totp";
import { randomInt } from "crypto";
import { sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export type FormErrors = Record<string, string[]>;

export type ActionResult = {
  errors?: FormErrors;
  message?: string;
  requiresVerification?: boolean;
  requires2fa?: boolean;
  email?: string;
} | null;

export async function registerAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  // limpia cuentas no verificadas vencidas (1 día)
  await deleteExpiredUnverified();

  const result = registerSchema.safeParse(raw);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const { email, password } = result.data;
  const name = (formData.get("name") as string | null)?.trim() || email.split("@")[0] || "Usuario";

  const existing = await getUserByEmail(email);
  if (existing) {
    if (existing.emailVerified) {
      return { errors: { email: ["Este email ya está registrado."] } };
    }

    // reenvía código si ya existía sin verificar
    const code = String(randomInt(100000, 999999));
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        verificationToken: code,
        verificationTokenExpires: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });
    const { emailSent: sent } = await sendVerificationEmail({ to: existing.email, code });
    redirect(
      `/verify?email=${encodeURIComponent(existing.email)}${sent ? "" : `&emailSent=false&code=${code}`}`
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const verificationCode = String(randomInt(100000, 999999));

  const user = await createUser({
    name,
    email,
    password: hashedPassword,
    verificationToken: verificationCode,
    verificationTokenExpires: new Date(Date.now() + 1000 * 60 * 60 * 24),
  });

  const { emailSent } = await sendVerificationEmail({
    to: user.email,
    code: verificationCode,
  });

  redirect(
    `/verify?email=${encodeURIComponent(user.email)}${
      emailSent ? "" : `&emailSent=false&code=${verificationCode}`
    }`
  );
}

export async function loginAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  // limpia cuentas no verificadas vencidas
  await deleteExpiredUnverified();

  const result = loginSchema.safeParse(raw);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const { email, password } = result.data;

  const user = await getUserByEmail(email);
  if (!user || !user.password) {
    // Sin contraseña = cuenta creada con Google
    return { message: "Credenciales inválidas." };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return { message: "Credenciales inválidas." };
  }

  if (!user.emailVerified) {
    return {
      message: "Debes verificar tu correo para ingresar.",
      requiresVerification: true,
      email: user.email,
    };
  }

  const rememberMe = formData.get("rememberMe") === "on";
  const nextRaw = formData.get("next");
  const next = safeNext(typeof nextRaw === "string" ? nextRaw : null);

  // 2FA activado → no creamos sesión todavía: pedimos el código.
  if (user.totpEnabled) {
    await createPending2fa({ userId: user.id, rememberMe, next });
    return { requires2fa: true, email: user.email };
  }

  await createSession({ userId: user.id, name: user.name, email: user.email }, rememberMe);
  redirect(next ?? "/dashboard");
}

/** Paso 2 del login cuando hay 2FA: verifica código TOTP o de recuperación. */
export async function verifyTwoFactorAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const pending = await getPending2fa();
  if (!pending) {
    return { message: "La verificación ha caducado. Inicia sesión de nuevo." };
  }
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { requires2fa: true, message: "Introduce el código." };

  const user = await prisma.user.findUnique({ where: { id: pending.userId } });
  if (!user || !user.totpEnabled || !user.totpSecret) {
    await clearPending2fa();
    return { message: "Cuenta no válida para 2FA." };
  }

  let ok = false;
  try {
    ok = verifyTotp(decryptToken(user.totpSecret), code);
  } catch {
    ok = false;
  }

  // Código de recuperación de un solo uso.
  if (!ok && user.totpRecovery) {
    try {
      const hashes: string[] = JSON.parse(user.totpRecovery);
      for (let i = 0; i < hashes.length; i++) {
        if (await bcrypt.compare(code.toUpperCase(), hashes[i])) {
          ok = true;
          hashes.splice(i, 1); // consumir
          await prisma.user.update({
            where: { id: user.id },
            data: { totpRecovery: JSON.stringify(hashes) },
          });
          break;
        }
      }
    } catch {
      /* recovery malformado → ignora */
    }
  }

  if (!ok) {
    return { requires2fa: true, message: "Código incorrecto." };
  }

  await clearPending2fa();
  await createSession(
    { userId: user.id, name: user.name, email: user.email },
    pending.rememberMe,
  );
  redirect(pending.next ?? "/dashboard");
}

/**
 * Only accept same-origin relative paths. Rejects protocol-relative ("//evil"),
 * absolute URLs, and anything not starting with a single "/". This avoids
 * open-redirect attacks via ?next=.
 */
function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.startsWith("/\\")) return null;
  return raw;
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
