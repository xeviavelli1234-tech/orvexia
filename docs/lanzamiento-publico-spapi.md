# Runbook — abrir el repricer a cualquier seller (SP-API público)

Objetivo: que **cualquier vendedor** conecte su cuenta de Amazon vía OAuth, no solo el dueño.

Estado a 14 jun 2026: ficha del Appstore **aprobada**, no publicada. Amazon la publica
en ~10-12 días naturales (**~21-23 jun 2026**). Hasta que esté *live* el OAuth público
(`version=stable`) devuelve **MD1000**. Ver memoria `project-spapi-public`.

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

## 3. EL DÍA QUE AMAZON PUBLIQUE (~21-23 jun)

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

## 5. Códigos de error del callback (`?status=...`)

| status | significado |
|---|---|
| `connected` | OK, cuenta conectada |
| `error_<x>` | Amazon devolvió `error=<x>` en la redirección (p.ej. consentimiento denegado) |
| `error_missing_params` | faltan `spapi_oauth_code` / `state` / `selling_partner_id` |
| `error_state_mismatch` | cookie de estado ausente o distinta (CSRF / cookie expirada, TTL 10 min) |
| `error_token_exchange` | falló el intercambio code→token en LWA (revisar `LWA_CLIENT_ID/SECRET`, redirect URI) |
| `error_persist` | falló el guardado en BD (revisar `ENCRYPTION_KEY`, `DATABASE_URL`) |
