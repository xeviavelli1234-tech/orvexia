// Lista la gente registrada y la que ha iniciado sesión en la web.
// Uso:  DATABASE_URL=... npx tsx scripts/_list-web-users.ts
// (o pon DATABASE_URL en .env — se carga con dotenv)
import "dotenv/config";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Sin DATABASE_URL — añade a .env o expórtala antes de ejecutar");
    process.exit(1);
  }
  const c = new Client({ connectionString: url });
  await c.connect();

  // 1) Usuarios registrados
  const users = await c.query<{
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: Date;
  }>(`
    SELECT "name", "email", "emailVerified", "createdAt"
    FROM "User"
    ORDER BY "createdAt" ASC
  `);

  console.log(`\n=== Usuarios registrados: ${users.rowCount} ===`);
  console.table(
    users.rows.map((u) => ({
      nombre: u.name,
      email: u.email,
      verificado: u.emailVerified ? "sí" : "no",
      alta: u.createdAt.toISOString().slice(0, 10),
    })),
  );

  // 2) Gente que ha iniciado sesión con éxito (distintos), con su último login
  const logins = await c.query<{
    email: string | null;
    method: string;
    country: string | null;
    veces: string;
    ultimo: Date;
  }>(`
    SELECT
      "email",
      MAX("method")    AS method,
      MAX("country")   AS country,
      COUNT(*)         AS veces,
      MAX("createdAt") AS ultimo
    FROM "LoginAttempt"
    WHERE "success" = true
    GROUP BY "email"
    ORDER BY MAX("createdAt") DESC
  `);

  console.log(`\n=== Personas que se han logueado (con éxito): ${logins.rowCount} ===`);
  console.table(
    logins.rows.map((l) => ({
      email: l.email ?? "(sin email)",
      pais: l.country ?? "—",
      logins: Number(l.veces),
      ultimo_login: l.ultimo.toISOString().slice(0, 16).replace("T", " "),
    })),
  );

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
