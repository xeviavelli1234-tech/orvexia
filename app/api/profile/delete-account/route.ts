import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { deleteSellerAccount } from "@/lib/db/sellerAccount";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { password, confirmation } = body;

  if (confirmation !== "ELIMINAR") {
    return NextResponse.json({ error: "Debes escribir ELIMINAR para confirmar" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { password: true, googleId: true },
  });

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // If user has a password, require it
  if (user.password) {
    if (!password) {
      return NextResponse.json({ error: "Debes introducir tu contraseña para confirmar" }, { status: 400 });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 400 });
    }
  }

  // Cancela la suscripción ANY_OFFER_CHANGED en Amazon ANTES de destruir la
  // cuenta (y con ella el token). Best-effort: no debe abortar el borrado RGPD.
  const account = await prisma.sellerAccount.findUnique({
    where: { userId: session.userId },
    select: { refreshToken: true, spApiEnv: true, notifSubscriptionId: true },
  });
  if (account) {
    const { cancelSellerAnyOfferChangedSubscription } = await import(
      "@/lib/amazon/notifications"
    );
    await cancelSellerAnyOfferChangedSubscription(account);
  }

  // Borra primero TODOS los datos del repricer. El borrado del usuario solo
  // cascada a SellerAccount y sus hijos con FK; las tablas que enlazan por
  // sellerAccountId suelto (canales con secretos de webhook, pedidos con PII
  // del comprador, dumpers, cuota, explicaciones) quedarían huérfanas. Esta
  // llamada las purga en transacción y elimina la cuenta de repricer.
  await deleteSellerAccount(session.userId);

  // Delete all user data (cascade handles saved products / alerts)
  await prisma.user.delete({ where: { id: session.userId } });

  // Clear session
  await deleteSession();

  return NextResponse.json({ ok: true });
}
