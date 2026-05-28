/**
 * Diagnóstico del estado de SellerAccount para entender por qué el cron
 * `/api/sellers/reprice/run` no genera filas de RepricingRun.
 *
 * El runner aplica varios filtros antes de procesar una cuenta:
 *   1. `active: true, mode: { not: "manual" }`
 *   2. `shouldRunAccount(...)` — chequea plan, intervalo, vacaciones, schedule.
 *   3. Lock de ciclo: si lockedAt está vivo (<5 min) → skip.
 *
 * Este script imprime los campos relevantes para detectar cuál filtro falla.
 *
 * Uso: $env:DATABASE_URL = "..."; npx tsx scripts/_check-seller-state.ts
 */
import "dotenv/config";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Sin DATABASE_URL");
    process.exit(1);
  }
  const c = new Client({ connectionString: url });
  await c.connect();

  const r = await c.query(`
    SELECT
      u.email,
      sa.id,
      sa.active,
      sa.mode,
      sa.plan,
      sa."trialEndsAt",
      sa."lastRunAt",
      sa."intervalSeconds",
      sa."lockedAt",
      sa."scheduleEnabled",
      sa."scheduleStartHour",
      sa."scheduleEndHour",
      sa."vacationFrom",
      sa."vacationTo",
      sa."stripeCustomerId",
      sa."stripeSubscriptionId"
    FROM "SellerAccount" sa
    JOIN "User" u ON u.id = sa."userId"
    ORDER BY sa."updatedAt" DESC
    LIMIT 5
  `);

  if (r.rows.length === 0) {
    console.log("No hay SellerAccount en la DB.");
    await c.end();
    return;
  }

  console.log(`\n${r.rows.length} SellerAccount encontrados:\n`);

  const now = new Date();
  for (const row of r.rows) {
    console.log("─".repeat(70));
    console.log(`Email:                ${row.email}`);
    console.log(`SellerAccount.id:     ${row.id}`);
    console.log(`active:               ${row.active}  ${row.active ? "✓" : "✗ no se procesa"}`);
    console.log(`mode:                 ${row.mode}  ${row.mode !== "manual" ? "✓ pasa filtro" : "✗ excluido por filtro"}`);
    console.log(`plan:                 ${row.plan}`);
    console.log(`trialEndsAt:          ${row.trialEndsAt ?? "null"}  ${row.trialEndsAt ? (new Date(row.trialEndsAt) > now ? "✓ vigente" : "✗ expirado") : "(no aplica)"}`);
    console.log(`intervalSeconds:      ${row.intervalSeconds}  (${Math.round(row.intervalSeconds / 60)} min entre ciclos)`);
    console.log(`lastRunAt:            ${row.lastRunAt ?? "null"}`);
    if (row.lastRunAt) {
      const secsSinceRun = Math.round((now.getTime() - new Date(row.lastRunAt).getTime()) / 1000);
      const ready = secsSinceRun >= row.intervalSeconds;
      console.log(`  → han pasado ${secsSinceRun}s desde el último run  ${ready ? "✓ listo para correr" : "✗ aún no toca"}`);
    } else {
      console.log(`  → nunca ha corrido  ✓ debería correr en el próximo ciclo`);
    }
    console.log(`lockedAt:             ${row.lockedAt ?? "null"}`);
    if (row.lockedAt) {
      const lockAge = Math.round((now.getTime() - new Date(row.lockedAt).getTime()) / 1000);
      const expired = lockAge >= 300;
      console.log(`  → lock con ${lockAge}s  ${expired ? "✓ ya caducó (5 min)" : "✗ aún activo, otra ejecución lo tiene"}`);
    }
    console.log(`scheduleEnabled:      ${row.scheduleEnabled}`);
    if (row.scheduleEnabled) {
      const hour = now.getUTCHours();
      const inWindow =
        hour >= row.scheduleStartHour && hour < row.scheduleEndHour;
      console.log(`  → ventana ${row.scheduleStartHour}-${row.scheduleEndHour}h UTC, ahora ${hour}h UTC  ${inWindow ? "✓ dentro" : "✗ fuera"}`);
    }
    console.log(`vacationFrom-To:      ${row.vacationFrom ?? "null"} - ${row.vacationTo ?? "null"}`);
    console.log(`stripeCustomerId:     ${row.stripeCustomerId ?? "null"}`);
    console.log(`stripeSubscriptionId: ${row.stripeSubscriptionId ?? "null"}`);
  }
  console.log("─".repeat(70));

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
