import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESET_EXPIRATION_MS = 1000 * 60 * 30; // 30 minutos

// Respuesta IDÉNTICA exista o no el usuario (anti-enumeración): nunca revelamos
// si un email está registrado ni si el envío del correo falló.
const GENERIC_MESSAGE =
  "Si el correo está registrado, te enviaremos instrucciones para restablecer tu contraseña.";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = body?.email as string | undefined;

  if (!email) {
    return NextResponse.json(
      { message: "El email es obligatorio" },
      { status: 400 }
    );
  }

  // Anti fuerza bruta / enumeración / bombardeo de correos de reseteo.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  if (
    rateLimit("forgot-email", email.toLowerCase(), 5, 10 * 60_000) ||
    rateLimit("forgot-ip", ip, 20, 10 * 60_000)
  ) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  let token: string | null = null;
  let hashedToken: string | null = null;
  const expiresAt = new Date(Date.now() + RESET_EXPIRATION_MS);
  let attempts = 0;

  while (attempts < 5 && !hashedToken) {
    token = crypto.randomBytes(32).toString("hex");
    hashedToken = hashToken(token);
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: expiresAt,
        },
      });
      break;
    } catch (error) {
      attempts += 1;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        hashedToken = null;
        continue;
      }
      console.error("Error generando token de reseteo:", error);
      // No filtramos el fallo (ni siquiera con otro status): respuesta genérica.
      return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    }
  }

  if (!hashedToken || !token) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  const { emailSent } = await sendPasswordResetEmail({ to: user.email, token });
  if (!emailSent) {
    console.warn(`[forgot-password] email no enviado a ${user.email}`);
  }

  // El token SOLO se expone en la respuesta en DESARROLLO si el email falló
  // (conveniencia local). En PRODUCCIÓN nunca: devolverlo permite tomar la
  // cuenta sin acceso al correo (toma de cuenta).
  const devToken =
    !emailSent && process.env.NODE_ENV !== "production" ? token : undefined;

  return NextResponse.json({
    ok: true,
    message: GENERIC_MESSAGE,
    ...(devToken ? { token: devToken } : {}),
  });
}
