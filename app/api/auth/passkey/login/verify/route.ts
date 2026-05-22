import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { rpConfig, consumeChallenge } from "@/lib/security/webauthn";
import { createSession } from "@/lib/session";
import { readRequestMeta } from "@/lib/security/request";
import {
  recordLoginAttempt,
  checkAndMarkLocation,
} from "@/lib/security/login-monitoring";

interface VerifyBody {
  response?: AuthenticationResponseJSON;
  expectedChallenge?: string;
  rememberMe?: boolean;
}

export async function POST(req: Request) {
  const meta = readRequestMeta(req);
  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body.response || !body.expectedChallenge) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const challenge = await consumeChallenge(body.expectedChallenge, "authentication");
  if (!challenge) {
    await recordLoginAttempt({
      ...meta,
      userId: null,
      email: null,
      success: false,
      method: "passkey",
      reason: "expired_challenge",
    });
    return NextResponse.json({ error: "invalid_challenge" }, { status: 400 });
  }

  const credId = body.response.id; // base64url
  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: credId },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  if (!passkey) {
    return NextResponse.json({ error: "credential_not_found" }, { status: 400 });
  }
  // Si el challenge se generó con userId fijo (allowCredentials), debe coincidir.
  if (challenge.userId && challenge.userId !== passkey.userId) {
    return NextResponse.json({ error: "user_mismatch" }, { status: 400 });
  }

  const { rpID, origin } = rpConfig();
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: body.expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64url")),
        counter: passkey.counter,
        transports: passkey.transports
          ? (passkey.transports.split(",").filter(Boolean) as AuthenticatorTransport[])
          : undefined,
      },
    });
  } catch (e) {
    await recordLoginAttempt({
      ...meta,
      userId: passkey.userId,
      email: passkey.user.email,
      success: false,
      method: "passkey",
      reason: e instanceof Error ? e.message.slice(0, 100) : "verify_error",
    });
    return NextResponse.json({ error: "verification_failed" }, { status: 400 });
  }

  if (!verification.verified) {
    await recordLoginAttempt({
      ...meta,
      userId: passkey.userId,
      email: passkey.user.email,
      success: false,
      method: "passkey",
      reason: "not_verified",
    });
    return NextResponse.json({ error: "not_verified" }, { status: 400 });
  }

  // Actualiza contador y fecha de uso (anti-replay).
  await prisma.passkey.update({
    where: { id: passkey.id },
    data: {
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    },
  });

  // Las passkeys ya prueban posesión + (opc.) verificación de usuario,
  // así que NO se exige TOTP detrás (es equivalente a 2FA).
  await createSession(
    { userId: passkey.userId, email: passkey.user.email, name: passkey.user.name },
    body.rememberMe === true,
  );

  await recordLoginAttempt({
    ...meta,
    userId: passkey.userId,
    email: passkey.user.email,
    success: true,
    method: "passkey",
    reason: "ok",
  });
  // Marca ubicación + envía aviso si es nueva
  await checkAndMarkLocation({
    userId: passkey.userId,
    email: passkey.user.email,
    name: passkey.user.name,
    ip: meta.ip,
    country: meta.country,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}

type AuthenticatorTransport = "ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb";
