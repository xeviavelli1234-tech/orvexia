"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { registerSchema, loginSchema } from "@/lib/validations";
import { getUserByEmail, createUser, deleteExpiredUnverified } from "@/lib/db/user";
import { createSession, deleteSession } from "@/lib/session";
import { randomInt } from "crypto";
import { sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export type FormErrors = Record<string, string[]>;

export type ActionResult = {
  errors?: FormErrors;
  message?: string;
  requiresVerification?: boolean;
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
  await createSession({ userId: user.id, name: user.name, email: user.email }, rememberMe);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
