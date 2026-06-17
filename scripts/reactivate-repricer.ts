/**
 * Reactiva el repricer de una cuenta de seller poniéndola en plan PRO (que no
 * caduca). Útil para el dueño/operador cuando la prueba de 14 días expiró.
 *
 *   npx tsx scripts/reactivate-repricer.ts [email]
 *
 * Sin email usa el del operador por defecto. Solo toca la SellerAccount de ese
 * usuario; no borra ni mueve nada más.
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PRO_INTERVAL_SECONDS = 300; // 5 min (plan PRO)
const DEFAULT_EMAIL = "xeviavelli1234@gmail.com";

async function main() {
  const email = (process.argv[2] || DEFAULT_EMAIL).trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) {
    console.error(`❌ No existe usuario con email ${email}`);
    process.exit(1);
  }

  const before = await prisma.sellerAccount.findUnique({ where: { userId: user.id } });
  if (!before) {
    console.error(`❌ ${email} no tiene SellerAccount (conéctate primero al repricer).`);
    process.exit(1);
  }
  console.log(
    `Antes  → plan=${before.plan} trialEndsAt=${before.trialEndsAt?.toISOString() ?? "null"} active=${before.active}`,
  );

  const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const after = await prisma.sellerAccount.update({
    where: { userId: user.id },
    data: {
      plan: "PRO",
      intervalSeconds: PRO_INTERVAL_SECONDS,
      active: true,
      trialEndsAt: future, // irrelevante con PRO, pero deja el panel sin "expirada"
    },
    select: { plan: true, intervalSeconds: true, active: true },
  });
  console.log(
    `Después → plan=${after.plan} intervalSeconds=${after.intervalSeconds} active=${after.active}`,
  );
  console.log(`✅ Repricer reactivado para ${email} (plan PRO, ciclo 5 min).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
