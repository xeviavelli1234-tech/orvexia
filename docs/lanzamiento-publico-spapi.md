# Runbook — abrir el repricer a cualquier seller (SP-API público)

Objetivo: que **cualquier vendedor** conecte su cuenta de Amazon vía OAuth, no solo el dueño.

Estado a 3 jul 2026: Amazon confirmó por correo (30 jun) que la **actualización de la
ficha** del Appstore fue **revisada y aprobada**; la publica en **10-12 días naturales
(~10-12 jul 2026)**. Durante ese procesamiento la ficha NO se puede editar. Hasta que
esté *live* el OAuth público (`version=stable`) devuelve **MD1000**.
Ver memoria `project-spapi-public`.

> Nota: cualquier edición de la **ficha** reabre el ciclo de revisión + 10-12 días.
> Editar solo la **config OAuth de la app** (redirect/login URI) NO dispara revisión.

---

## 1. Código — LISTO (no tocar)

Flujo "website" auditado y completo:

- `app/api/sellers/amazon/oauth/start/route.ts` — construye la URL de consentimiento.
  Usa `version=beta` salvo que `SP_API_APP_PUBLISHED=true` (entonces `stable` = público).
- `app/api/sellers/amazon/oauth/callback/route.ts` — valida CSRF (cookie de estado),
  exige sesión, intercambia el `spapi_oauth_code` por refresh token, lo cifra
  (`ENCRYPTION_KEY`), crea el `SellerAccount` y se suscribe a ANY_OFFER_CHANGED.
- `app/dashboard/repricer/page.tsx:116` — el botón "Conectar mi cuenta de Amazon"
  solo se renderiza si `SP_API_APP_PUBLISHED === "true"`.

No requiere cambios. El `redirect_uri` se deriva de `NEXT_PUBLIC_BASE_URL`
(`lib/url.ts`), así que es determinista entre `start` y `callback`.

Limitación conocida (aceptable para el lanzamiento): solo está implementado el
**website workflow** (el seller arranca desde nuestra web). El **Appstore-initiated**
(`amazon_callback_uri`, click "Authorize" en la propia ficha del Appstore) NO está
implementado: ese tráfico cae en nuestra web, pasa por login y luego pulsa "Conectar".
Funciona, pero no es one-click desde Amazon. Implementarlo es trabajo futuro opcional.

---

## 2. AHORA (antes del día de publicación) — Solution Provider Portal

Verificar en **Aplicaciones → Orvexia Repricer Prod → Editar/Ver → OAuth**, que coincidan
con el dominio actual (`NEXT_PUBLIC_BASE_URL`, cambiado el 1 jun):

- **OAuth Redirect URI:** `https://TU-DOMINIO/api/sellers/amazon/oauth/callback`
  (CRÍTICO — si no coincide exacto, el callback falla aunque la app esté publicada).
- **OAuth Login URI:** `https://TU-DOMINIO/dashboard/repricer`
  (donde Amazon manda al seller desde la ficha del Appstore).

Esto es config de **app**, no de la **ficha** → no dispara nueva revisión.
NO editar la **ficha** del Appstore durante la ventana de publicación (sí re-revisa).

App ID (referencia): `amzn1.sp.solution.f98636d5-2bbf-48cb-8224-dff0a46cefe6`
→ debe ser el valor de `SP_API_APP_ID` en Vercel.

---

## 3. EL DÍA QUE AMAZON PUBLIQUE (~10-12 jul)

1. Confirmar que la app aparece **publicada/live** en el Selling Partner Appstore
   (no solo "aprobada"). Si sigue "in translation/processing", esperar.
2. Vercel → Environment Variables:
   - `SP_API_APP_PUBLISHED=true`
   - (opcional, lanzamiento público en la web) `REPRICER_PUBLIC=true` → quita el
     `noindex` y promociona el repricer en home/dashboard.
3. **Redeploy** (los cambios de env NO aplican hasta un nuevo deploy).
4. Smoke test:
   - Abrir `/dashboard/repricer` → debe aparecer el botón **"Conectar mi cuenta de Amazon"**.
   - Hacer el OAuth con una cuenta de prueba (o revocar la propia en el SPP y reconectar).
   - Confirmar redirección a `…/dashboard/repricer?status=connected`.
   - Ir a `/sellers/productos` → cargan los listings reales de esa cuenta.

## 4. Rollback

Si algo falla: `SP_API_APP_PUBLISHED` → quitar/`false` + redeploy. El botón público
desaparece; el self-connect del dueño y el modo demo/CSV siguen funcionando.

## 5b. Variables de entorno en Vercel (estado objetivo para producción)

El día de la publicación el único cambio funcional es `SP_API_APP_PUBLISHED=true`
(+ `SP_API_ENV=production` si aún estuviera en sandbox). El resto ya debería estar puesto.

| Variable | Valor objetivo | Rol |
|---|---|---|
| `SP_API_APP_PUBLISHED` | `true` | **Flip del día.** Abre el OAuth público (`version=stable`) y muestra el botón "Conectar mi cuenta de Amazon". |
| `SP_API_ENV` | `production` | Las cuentas nuevas se guardan como producción → derivan marketplace real + sync inicial. En `sandbox` no hay datos reales. |
| `SP_API_APP_ID` | `amzn1.sp.solution.f98636d5-…cefe6` | ID de la app SP-API (LWA). |
| `LWA_CLIENT_ID` | (del SP Portal) | Canje `code → refresh_token`. |
| `LWA_CLIENT_SECRET` | (del SP Portal) | Idem. |
| `NEXT_PUBLIC_BASE_URL` | dominio canónico live | Deriva `redirect_uri` y `login_uri`; DEBE coincidir con el SP Portal. |
| `ENCRYPTION_KEY` | (32 bytes) | Cifra el refresh token en BD. Ausente → `error_encryption`. |
| `DATABASE_URL` | (Postgres) | Persistencia del `SellerAccount`/listings. |
| `CRON_SECRET` | (secreto) | Auth de los crons de repricing. |
| `ADMIN_EMAILS` | email(s) dueño | Gate del self-connect del operador. |
| `SP_API_NOTIF_DESTINATION_ID` | (opcional) | Si está, suscribe `ANY_OFFER_CHANGED` al conectar. Sin él, el sync es por cron/manual. |
| `SP_API_REFRESH_TOKEN` | (opcional, dueño) | Self-connect de la cuenta propia (no OAuth). |
| `SP_API_SELLER_ID` | (opcional, dueño) | Idem, merchant token del dueño. |

Tras cualquier cambio de env → **Redeploy** (Vercel no lo aplica hasta un nuevo deploy).

## 5. Códigos de error del callback (`?status=...`)

| status | significado |
|---|---|
| `connected` | OK, cuenta conectada |
| `error_<x>` | Amazon devolvió `error=<x>` en la redirección (p.ej. consentimiento denegado) |
| `error_missing_params` | faltan `spapi_oauth_code` / `state` / `selling_partner_id` |
| `error_state_mismatch` | cookie de estado ausente o distinta (CSRF / cookie expirada, TTL 10 min) |
| `error_token_exchange` | falló el intercambio code→token en LWA (revisar `LWA_CLIENT_ID/SECRET`, redirect URI) |
| `error_encryption` | `ENCRYPTION_KEY` ausente o inválida en Vercel (ponerla + redeploy) |
| `error_persist` | falló el guardado en BD (revisar `ENCRYPTION_KEY`, `DATABASE_URL`) |
