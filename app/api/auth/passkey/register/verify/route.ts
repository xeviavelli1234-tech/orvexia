import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rpConfig, consumeChallenge } from "@/lib/security/webauthn";

interface VerifyBody {
  response?: RegistrationResponseJSON;
  expectedChallenge?: string;
  name?: string;
}

/**
 * POST /api/auth/passkey/register/verify
 * Verifica la respuesta del navegador y persiste la passkey.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body.response || !body.expectedChallenge) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const challenge = await consumeChallenge(body.expectedChallenge, "registration");
  if (!challenge || challenge.userId !== session.userId) {
    return NextResponse.json({ error: "invalid_challenge" }, { status: 400 });
  }

  const { rpID, origin } = rpConfig();
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: body.expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "verification_failed", detail: e instanceof Error ? e.message : "" },
      { status: 400 },
    );
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "not_verified" }, { status: 400 });
  }

  const info = verification.registrationInfo;
  const cred = info.credential;

  const transportsArr = cred.transports ?? [];
  await prisma.passkey.create({
    data: {
      userId: session.userId,
      credentialId: cred.id,
      publicKey: Buffer.from(cred.publicKey).toString("base64url"),
      counter: cred.counter ?? 0,
      transports: transportsArr.join(","),
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
      name: (body.name && body.name.trim()) || defaultName(body.response),
    },
  });

  return NextResponse.json({ ok: true });
}

function defaultName(response: RegistrationResponseJSON): string {
  // Heurística amistosa: distingue "Llave del dispositivo" vs "Passkey sincronizada".
  const at = response.authenticatorAttachment;
  if (at === "platform") return "Llave de este dispositivo";
  if (at === "cross-platform") return "Llave de seguridad externa";
  return "Mi passkey";
}
