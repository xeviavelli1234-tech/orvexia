/**
 * E2E local del Plan Monitor — no toca Neon, ni Stripe real, ni Amazon.
 *
 * Flujo: seed usuario+cuenta+listing (fixtures) → webhook checkout.completed
 * (plan MONITOR, firmado HMAC como Stripe) → verificar plan en BD → páginas
 * (facturación/factura/productos) con sesión JWT → ciclo de reprecio →
 * verificar eventos SIMULADOS y precio intacto → webhook subscription.deleted
 * → verificar degradación a TRIAL expirado → cleanup.
 *
 * Uso: node e2e-monitor.mjs <DATABASE_URL> <BASE_URL>
 *   env: AUTH_SECRET, STRIPE_WEBHOOK_SECRET (los mismos del server de prueba)
 */
import crypto from "node:crypto";
import pg from "pg";
import { SignJWT } from "jose";

const [, , DB_URL, BASE = "http://localhost:3210"] = process.argv;
const AUTH_SECRET = process.env.AUTH_SECRET ?? "e2e-local-secret";
const WHSEC = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_e2e_local";

const EMAIL = "e2e-monitor@test.local";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
};

const db = new pg.Client({ connectionString: DB_URL });
await db.connect();
const q = (sql, params) => db.query(sql, params);
const cuid = (p) => p + crypto.randomBytes(10).toString("hex");

// ─── 0. Cleanup previo + seed ───────────────────────────────────────────────
console.log("\n[1] Seed: usuario + SellerAccount (fixtures) + listing");
await q(`DELETE FROM "User" WHERE email = $1`, [EMAIL]);

const userId = cuid("e2eu");
const accId = cuid("e2ea");
const lstId = cuid("e2el");
await q(
  `INSERT INTO "User" (id, email, name, "emailVerified", "createdAt", "updatedAt")
   VALUES ($1, $2, 'E2E Monitor', true, now(), now())`,
  [userId, EMAIL],
);
await q(
  `INSERT INTO "SellerAccount"
     (id, "userId", "amazonSellerId", "marketplaceId", "refreshToken", "spApiEnv",
      mode, plan, "trialEndsAt", "intervalSeconds", active, "createdAt", "updatedAt")
   VALUES ($1, $2, $3, 'A1RKKUPIHCS9HS', 'FIXTURE_NO_TOKEN', 'sandbox',
           'amazon', 'TRIAL', now() + interval '10 days', 900, true, now(), now())`,
  [accId, userId, "E2ESELLER" + crypto.randomBytes(3).toString("hex").toUpperCase()],
);
await q(
  `INSERT INTO "SellerListing"
     (id, "sellerAccountId", asin, sku, title, "priceCurrent", "priceMin", "priceMax",
      currency, "repricingEnabled", "createdAt", "updatedAt")
   VALUES ($1, $2, 'B0FIXTURE01', 'E2E-SKU-1', 'Producto E2E Monitor',
           100, 90, 120, 'EUR', true, now(), now())`,
  [lstId, accId],
);
ok("seed insertado", true);

// ─── util: webhook firmado exactamente como Stripe ──────────────────────────
async function sendWebhook(event) {
  const payload = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac("sha256", WHSEC).update(`${t}.${payload}`).digest("hex");
  const res = await fetch(`${BASE}/api/sellers/billing/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${v1}` },
    body: payload,
  });
  return res;
}

// firma inválida debe rechazarse
const bad = await fetch(`${BASE}/api/sellers/billing/webhook`, {
  method: "POST",
  headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=deadbeef" },
  body: "{}",
});
ok("webhook con firma inválida → 400", bad.status === 400, `(got ${bad.status})`);

// ─── 2. checkout.session.completed (plan MONITOR) ───────────────────────────
console.log("\n[2] Webhook checkout.session.completed → MONITOR");
const res1 = await sendWebhook({
  id: "evt_e2e_1",
  object: "event",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_e2e_1",
      object: "checkout.session",
      mode: "subscription",
      payment_status: "paid",
      client_reference_id: accId,
      customer: "cus_e2e_1",
      subscription: "sub_e2e_1",
      metadata: { sellerAccountId: accId, userId, plan: "MONITOR" },
    },
  },
});
ok("webhook aceptado (200)", res1.status === 200, `(got ${res1.status})`);

let acc = (await q(`SELECT plan, "intervalSeconds", "stripeCustomerId", "stripeSubscriptionId" FROM "SellerAccount" WHERE id=$1`, [accId])).rows[0];
ok("plan = MONITOR en BD", acc.plan === "MONITOR", `(got ${acc.plan})`);
ok("intervalSeconds = 900", acc.intervalSeconds === 900, `(got ${acc.intervalSeconds})`);
ok("stripeSubscriptionId guardado", acc.stripeSubscriptionId === "sub_e2e_1");

// ─── 3. páginas con sesión ──────────────────────────────────────────────────
console.log("\n[3] Páginas del panel con sesión JWT");
const jwt = await new SignJWT({ userId, name: "E2E Monitor", email: EMAIL })
  .setProtectedHeader({ alg: "HS256" })
  .setAudience("session")
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(new TextEncoder().encode(AUTH_SECRET));
const cookie = { headers: { cookie: `auth-session=${jwt}` } };

const fact = await (await fetch(`${BASE}/sellers/facturacion`, cookie)).text();
ok("facturación: 'Plan Monitor activo'", fact.includes("Plan Monitor activo"));
ok("facturación: no ofrece checkout de nuevo", !fact.includes("Contratar Monitor"));
ok("facturación: upsell a Pro visible", fact.includes("aplique los precios por ti"));

const inv = await (await fetch(`${BASE}/sellers/facturacion/factura`, cookie)).text();
ok("factura: concepto Plan Monitor", inv.includes("Plan Monitor") && inv.includes("(mensual)"));
ok("factura: total 9 €", /9,00\s*€/.test(inv));
ok("factura: NO es vista previa", !inv.includes("Vista previa"));

const panel = await (await fetch(`${BASE}/sellers/productos`, cookie)).text();
ok("panel: banner modo Monitor", panel.includes("Plan Monitor:") && panel.includes("no se modifican"));

// ─── 4. ciclo de reprecio (fixtures) ────────────────────────────────────────
console.log("\n[4] Ciclo de reprecio manual — debe SIMULAR, no aplicar");
const run = await fetch(`${BASE}/api/sellers/reprice/run`, { method: "POST", ...cookie });
const runJson = await run.json().catch(() => ({}));
ok("run endpoint 200", run.status === 200, `(got ${run.status}: ${JSON.stringify(runJson)})`);

const events = (await q(
  `SELECT e.reason, e.simulated, e."priceBefore", e."priceAfter", e.success
     FROM "RepricingEvent" e JOIN "SellerListing" l ON l.id = e."listingId"
    WHERE l."sellerAccountId" = $1 ORDER BY e."createdAt" DESC`,
  [accId],
)).rows;
ok("hay eventos de reprecio", events.length > 0, `(got ${events.length})`);
const changed = events.filter((e) => Number(e.priceBefore) !== Number(e.priceAfter));
ok("los cambios calculados están marcados simulated", changed.length > 0 && changed.every((e) => e.simulated === true),
   JSON.stringify(events));

const lst = (await q(`SELECT "priceCurrent" FROM "SellerListing" WHERE id=$1`, [lstId])).rows[0];
ok("priceCurrent INTACTO (100 €)", Number(lst.priceCurrent) === 100, `(got ${lst.priceCurrent})`);

// ─── 5. cancelación → TRIAL expirado ────────────────────────────────────────
console.log("\n[5] Webhook customer.subscription.deleted → degradación");
const res2 = await sendWebhook({
  id: "evt_e2e_2",
  object: "event",
  type: "customer.subscription.deleted",
  data: { object: { id: "sub_e2e_1", object: "subscription", status: "canceled" } },
});
ok("webhook aceptado (200)", res2.status === 200, `(got ${res2.status})`);
acc = (await q(`SELECT plan, "trialEndsAt", "stripeSubscriptionId" FROM "SellerAccount" WHERE id=$1`, [accId])).rows[0];
ok("plan degradado a TRIAL", acc.plan === "TRIAL", `(got ${acc.plan})`);
ok("trialEndsAt en el pasado (expirado)", new Date(acc.trialEndsAt).getTime() < Date.now());
ok("stripeSubscriptionId desvinculado", acc.stripeSubscriptionId === null);

// ─── 6. cleanup ─────────────────────────────────────────────────────────────
await q(`DELETE FROM "User" WHERE email = $1`, [EMAIL]);
console.log("\n[6] Cleanup hecho (cascade User → SellerAccount → listings/eventos)");

await db.end();
console.log(`\nRESULTADO: ${pass} OK · ${fail} FALLOS`);
process.exit(fail === 0 ? 0 : 1);
