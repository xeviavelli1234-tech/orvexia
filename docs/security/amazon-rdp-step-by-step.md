# Amazon SP-API — Restricted Data Permission (RDP) paso a paso

> **A quién va dirigido:** equipo de Orvexia Repricer.
> **Cuándo aplica:** SOLO si la app empieza a tocar datos restringidos
> (dirección de envío del comprador, email real, teléfono, nombre real…).
> Hoy Orvexia **NO** consume datos PII de pedidos y por eso `lib/amazon/orders.ts`
> degrada silenciosamente a `[]` cuando SP-API devuelve 403.
> Este documento es la hoja de ruta para cuando se quiera activar el rol
> *Orders* / *Direct-to-Consumer Shipping* y pasar la auditoría RDP de Amazon.

---

## 0. Glosario rápido

| Sigla | Significado | Notas |
|---|---|---|
| **SP-API** | Selling Partner API | Sustituyó a MWS. |
| **DPP** | Data Protection Policy | Política a la que te adhieres. |
| **AUP** | Acceptable Use Policy | Qué SÍ y qué NO se puede hacer con los datos. |
| **PII** | Personally Identifiable Information | Email, nombre, dirección, teléfono… |
| **RD** | Restricted Data | Subconjunto de PII catalogado por Amazon. |
| **RDP** | Restricted Data Permission | Permiso explícito para tocar RD. |
| **TDR** | Tax / 3rd-party Data Recipient | Reenviar PII a un tercero requiere TDR aparte. |

Roles SP-API y si son RD:

- `pricing` → **no** RD. *Orvexia ya lo usa.*
- `productListing` → **no** RD.
- `inventoryAndOrderTracking` → **no** RD (solo metadatos, sin PII).
- **`Amazon Fulfilled Shipping` / `Direct-to-Consumer Shipping`** → **RD (PII)**.
- **`Customer Information`** → **RD (PII)**.
- **`Tax Invoicing` / `Tax Remittance`** → **RD (PII)**.
- **`Buyer Communication`** → **RD (PII)**.

Si solo necesitas `Orders v0` para KPIs (totales, fechas, ASIN, SKU, cantidad)
**sin** dirección/email/teléfono, puedes pedir el rol *sin* PII y evitar RDP.
RDP solo se exige cuando marcas la casilla *“Personally Identifiable Information”*
al solicitar el rol.

---

## 1. Decisión previa: ¿realmente necesitas RDP?

Antes de meterte en el laberinto, contesta por escrito (1 párrafo cada una):

1. **Caso de uso concreto.** Frase que empiece por *“Necesitamos la
   dirección de envío del comprador para…”*. Si la frase acaba en
   *“…enseñar analíticas al vendedor”*, **no la necesitas**: usa el rol
   Orders sin PII.
2. **¿Se puede resolver con datos agregados / anonimizados?**
   (códigos postales truncados a 2 dígitos, conteos por región…). Si sí,
   declina RDP. Amazon penaliza solicitudes “por si acaso”.
3. **¿La PII saldrá del backend?** Si llega al navegador del vendedor,
   ya estás distribuyendo PII y necesitarás justificarlo en la auditoría.
4. **¿Algún subencargado (proveedor) la verá?** Cada subencargado que
   procese RD entra en el dossier RDP.

Si tras esto sigues necesitando RDP, sigue al paso 2.

---

## 2. Pre-requisitos técnicos (lo que Amazon comprobará)

Estos puntos **deben estar en producción y documentados** *antes* de
mandar el formulario. Marca cada uno como hecho/no hecho:

### 2.1 Cifrado en tránsito
- [ ] TLS 1.2+ en **todo** endpoint público (Vercel lo hace por defecto, verificar
      con `curl -vI https://orvexia.com` y `testssl.sh`).
- [ ] HSTS habilitado (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`).
- [ ] Sin endpoints HTTP que sirvan datos de Amazon (redirigir 301 → HTTPS).

### 2.2 Cifrado en reposo
- [ ] DB (Postgres): cifrado de disco habilitado por el proveedor
      (Neon/Supabase/RDS lo tienen, **pedir y archivar la attestation**).
- [ ] **Campos PII en columnas cifradas a nivel aplicación** con AES-256-GCM
      *además* del cifrado de disco. Reusa `lib/crypto.ts`:
      `encryptToken()` / `decryptToken()` ya implementan AES-256-GCM.
- [ ] Backups cifrados (verificar con el proveedor; Vercel Postgres / Neon lo hacen).
- [ ] Logs de aplicación: **prohibido** escribir PII. Añadir test que falle
      si aparece `BuyerEmail|ShippingAddress` en `console.log` de producción.

### 2.3 Gestión de claves (KMS)
- [ ] `ENCRYPTION_KEY` rotable. Hoy `lib/crypto.ts` deriva la clave por SHA-256
      del valor de entorno → para RDP **sustituir por KMS gestionado**
      (AWS KMS, Vercel Encryption Keys o GCP KMS) con versionado y rotación
      anual obligatoria.
- [ ] Claves separadas para: (a) tokens LWA, (b) PII de compradores. **Nunca
      la misma clave para ambos.** Esto limita el blast radius en caso de
      filtración de una.
- [ ] Procedimiento de rotación documentado y *probado* en un staging
      (re-cifrar registros existentes sin downtime).
- [ ] Nadie del equipo tiene la clave maestra en su portátil. Solo el sistema
      en runtime via IAM role.

### 2.4 Control de acceso
- [ ] **Principio de mínimo privilegio** en la DB de producción:
      - Cuenta `app` (la que usa la web): lectura/escritura solo de las
        tablas que necesita.
      - Cuenta `admin` (humanos): MFA obligatorio, acceso solo vía bastion
        o tunneled, sesiones limitadas a 1h.
      - **Nadie usa la cuenta de superusuario** salvo migraciones.
- [ ] Lista escrita de personas con acceso a producción (hoy: tú). Revisarla
      trimestralmente y dejar acta.
- [ ] MFA obligatorio para: GitHub, Vercel, proveedor de DB, Amazon Developer Console.
- [ ] SSH/admin solo desde IPs en allowlist (ya tienes `lib/security/ip-allowlist.ts`,
      verificar que cubre el panel admin).

### 2.5 Logs de auditoría
- [ ] Tabla `AuditLog` en Postgres con: `userId`, `action`, `resource`,
      `ip`, `userAgent`, `createdAt`. Inmutable (sin UPDATE/DELETE; usa
      append-only o `PERMISSIONS` para revocarlo a la app).
- [ ] Toda lectura de PII de comprador queda registrada con el `sellerId`,
      `amazonOrderId` y el motivo (`reason: "show-shipping-label"`).
- [ ] Retención de logs de auditoría: **24 meses mínimo**. Amazon lo exige.
- [ ] Logs centralizados (Datadog/Logtail/Axiom) con acceso solo a admins.
- [ ] Detección automática: alerta si un mismo `userId` lee >N órdenes en X
      minutos (umbral configurable; señal de exfiltración).

### 2.6 Retención y borrado
- [ ] **PII de pedido cifrada borrada a los 30 días** desde el `PurchaseDate`,
      salvo retención fiscal (en cuyo caso anonimizar: borrar dirección y
      email, conservar agregados).
- [ ] Cronjob (Vercel Cron) que ejecute la limpieza diaria y registre en
      `AuditLog` cuántas filas borró.
- [ ] Endpoint `DELETE /api/account` que borra TODO en <30 días (RGPD + DPP):
      tokens LWA, PII almacenada, AuditLogs ligados al usuario (excepto los
      requeridos para conservar pruebas de seguridad — esos se anonimizan).
- [ ] Documentar el flujo: qué se borra, qué se anonimiza, en qué plazo.

### 2.7 Respuesta a incidentes
- [ ] **Plan escrito** con: detección, contención, erradicación, recuperación,
      post-mortem. Una página, fácil de seguir a las 3am.
- [ ] **Canal de notificación a Amazon en ≤24h**: `security@amazon.com`
      (sí, ese, además del formulario del Developer Console).
- [ ] Plantilla de email a vendedores afectados (RGPD: art. 34).
- [ ] Simulacro **anual** del plan (puede ser tabletop, no hace falta caos real).
      Dejar acta firmada en `docs/security/incident-drills/`.

### 2.8 Seguridad del desarrollo
- [ ] Branch protection en `main`: PR + 1 review + CI verde.
- [ ] Dependabot / Renovate al día, sin CVEs critical/high abiertas.
- [ ] Secret scanning en GitHub habilitado.
- [ ] `npm audit` en CI. Build falla en `high` o superior.
- [ ] No hay secretos en el repo (verificar con `gitleaks` una vez).

---

## 3. Documentos que tendrás que adjuntar (el “dossier”)

Amazon te pedirá literalmente PDFs o respuestas detalladas. Tener
plantillas listas evita rehacer en caliente.

Crear en `docs/security/`:

1. `data-protection-policy.md` — versión interna *larga* de la pública en
   `/politica-datos-amazon`. Incluye matriz de roles SP-API que usas y
   por qué.
2. `encryption.md` — qué algoritmo, dónde, qué clave, quién la rota,
   con qué cadencia. Incluye diagrama de flujo del refresh token y de la PII.
3. `access-control.md` — roles internos, MFA, principio de mínimo privilegio,
   IP allowlist, revisión trimestral.
4. `retention-deletion.md` — tabla con: tipo de dato → plazo → método de
   borrado → tabla afectada.
5. `audit-logging.md` — qué se loguea, dónde se almacena, quién lo lee,
   retención.
6. `incident-response.md` — los 5 pasos del NIST + plantillas de comunicación.
7. `key-management.md` — KMS, jerarquía de claves, rotación, recuperación.
8. `subprocessors.md` — Vercel, Neon, Stripe, Resend… qué dato ve cada uno
   y bajo qué DPA.
9. `sdlc.md` — Secure SDLC: revisión de código, dependencias, secret scanning.

> Las versiones públicas pueden ser más cortas (la que ya tienes en
> `app/politica-datos-amazon/page.tsx` es la cara externa). Estas son las
> internas que mandas adjuntas en el cuestionario RDP.

---

## 4. Cambios de código que vas a necesitar antes de pedir RDP

Concretos sobre el repo actual:

### 4.1 Aislar PII en su propia tabla cifrada
Hoy `NormalizedOrder.buyerEmail` está en `lib/amazon/orders.ts` como string en memoria.
Cuando actives RDP:

- Crear `prisma/schema.prisma` → modelo `OrderBuyerPII` con FK a `Order`:
  - `id`, `orderId` (unique), `emailEnc` (string, base64),
    `shippingAddressEnc` (string, base64), `createdAt`, `purgeAt`.
- `purgeAt = PurchaseDate + 30 days` (índice).
- Solo se lee con `decryptToken()` y solo desde código server-only,
  jamás se serializa al cliente sin haber sido masked (`j***@gmail.com`,
  `Calle ******, 28***`).

### 4.2 Logging de acceso a PII
- Helper `lib/security/audit.ts` con `logPiiAccess({ userId, orderId, reason })`.
- Middleware (server action wrapper) que envuelve cualquier read de
  `OrderBuyerPII` y obliga a pasar un `reason`. Si falta, lanza.

### 4.3 Cron de borrado
- `app/api/cron/purge-pii/route.ts` con `vercel.json` cron `0 3 * * *`.
- Borra `OrderBuyerPII where purgeAt < now()`. Loguea conteo.

### 4.4 Endpoint de baja de cuenta
- `app/api/account/delete/route.ts` (POST). Verifica password + (opcional)
  TOTP. Encola job que en <30d borra todo. Devuelve fecha estimada y un
  recibo descargable.

### 4.5 Sustituir `ENCRYPTION_KEY` env por KMS
- Introducir capa `lib/crypto/kms.ts` con interfaz idéntica a `lib/crypto.ts`,
  pero que llama a AWS KMS (`Encrypt`/`Decrypt`) o equivalente.
- `lib/crypto.ts` queda como fallback solo de desarrollo (`if NODE_ENV !== 'production'`).
- Las claves de aplicación se generan por *envelope encryption*: KMS cifra
  una DEK, la DEK cifra los datos.

### 4.6 Tests que protegen invariantes
- Test que recorre `console.log` mockeado y falla si encuentra patrones
  `@.*\.` o cadenas que parezcan direcciones postales.
- Test que verifica que toda lectura de `OrderBuyerPII` crea entrada en
  `AuditLog`.

---

## 5. Proceso administrativo con Amazon (paso a paso)

> Tiempos reales aproximados a fecha 2026-05 (pueden cambiar). Considera
> que cada rechazo te resetea el contador, así que **manda el formulario
> solo cuando todo lo anterior esté hecho**.

### Paso 1 — Cuenta Developer
1. Ir a Seller Central → **Apps & Services → Develop Apps**.
2. Verificar que la cuenta de Developer está en estado *Approved*.
3. Confirmar dirección, razón social y persona de contacto técnico (DPO/CTO).

### Paso 2 — App pública en draft
1. Crear (o editar) la app pública en *Develop Apps → Add new app client*.
2. En *Data access*, **marcar el rol RD** que necesitas (p.ej. *Direct-to-Consumer
   Shipping Information*). Aparecerá un banner rojo: “requires PII certification”.
3. Guardar como draft.

### Paso 3 — Self-assessment / cuestionario de seguridad
Amazon te abre un formulario (entre **40 y 60 preguntas**) cubriendo
exactamente los 9 documentos del punto 3. Reglas no escritas:

- **Responder con frases completas, sin marketing.** Cada respuesta debe
  poder mapearse a un control técnico verificable.
- Adjuntar diagramas (un PDF con: red, datos, claves) en formato A4.
- Citar literalmente el cifrado: *“AES-256-GCM with 96-bit IV and 128-bit
  authentication tag, key managed in AWS KMS, rotated annually.”*
- Cuando preguntan por “third parties” → lista exacta + DPA firmado.
- Cuando preguntan por “employee access” → número exacto, no “a few”.

### Paso 4 — Adjuntar evidencia
Suben un *ZIP* con:
- Política pública (URL a `/politica-datos-amazon`).
- Política interna larga (los `.md` del punto 3 exportados a PDF).
- Diagramas de arquitectura.
- Acta del último simulacro de incidente.
- Captura del cuadro de claves de KMS (con IDs y fecha de rotación; los
  valores NUNCA salen).
- Captura del *AuditLog* (esquema, no datos).
- Captura del cron de borrado funcionando (logs con conteo).

### Paso 5 — Revisión por Amazon
1. Cola: **4 a 12 semanas** en 2026 para apps nuevas con PII.
2. Pueden pedir aclaraciones por email del Seller Central; responde en <72h
   o pierdes el sitio en la cola.
3. Si te rechazan, te dicen qué control falla. **Arreglar y volver a aplicar**.
   Cada rechazo es un nuevo ciclo completo.

### Paso 6 — Aprobación y “go-live”
1. Te llegan los scopes activados en el cliente de la app.
2. Cambiar los `roles` que pides en LWA (`profile`, `sellingpartnerapi::notifications`,
   y ahora el RD).
3. Re-autorizar **a TODOS los vendedores existentes** (la consent screen
   les enseñará los nuevos permisos; sin re-consent no podrás leer PII de
   los que ya estaban).

### Paso 7 — Reassessment anual
1. Cada año, Amazon reabre el cuestionario. Es más corto, pero si has
   cambiado algo (proveedor de KMS, subprocesador, …) **debes declararlo
   en <30 días desde el cambio**, no esperar al aniversario.
2. Marca en calendario: alarma 60 días antes del aniversario para revisar
   los 9 documentos y los logs.

---

## 6. Errores que rechazan apps (lista negra)

Vistos en rechazos públicos / foros / propios:

1. Política pública dice “AES-256” pero no especifica el modo. → **Decir GCM**.
2. Decir “datos cifrados” pero no explicar dónde viven las claves.
3. “Borramos los datos al desconectar” sin dar plazo concreto. → **30 días máx**.
4. Pasar PII al frontend sin enmascarar.
5. Usar la misma cuenta de DB para app y administración.
6. No tener AuditLog o tenerlo en la misma DB sin restricción de DELETE.
7. Subprocesadores sin DPA listados (¡incluye proveedores de email tipo
   Resend o SendGrid si llegan a tocar emails de comprador!).
8. Email de contacto genérico (`info@`) en vez de uno monitorizado por
   alguien con poder de decisión (`security@`).
9. Logs de aplicación con tokens o emails en claro. Amazon a veces pide
   muestras.
10. “Compartimos datos con partners para mejorar el servicio” en la
    política → rechazo instantáneo. **Nunca compartas datos de Amazon
    con terceros que no sean estrictamente subprocesadores técnicos.**

---

## 7. Checklist final (imprimible)

Antes de enviar el formulario:

```
[ ] TLS 1.2+, HSTS, sin HTTP
[ ] Postgres con cifrado en reposo (attestation guardada)
[ ] Columnas PII cifradas con AES-256-GCM via KMS
[ ] DEK / KEK separadas para tokens LWA vs PII de comprador
[ ] Rotación de claves probada en staging
[ ] AuditLog inmutable, retención 24m, sin PII en claro
[ ] Cron de purga a 30 días en producción, con logs
[ ] Endpoint de baja borra todo en <30 días
[ ] Plan de incidentes escrito + simulacro hecho en último año
[ ] 9 documentos internos en docs/security/ exportables a PDF
[ ] Diagrama de arquitectura PDF
[ ] DPA firmado con Vercel, con Neon/Supabase, con Stripe, con Resend
[ ] MFA en todas las consolas (GitHub, Vercel, DB, Amazon Developer)
[ ] IP allowlist para admin verificada
[ ] Secret scanning + Dependabot al día
[ ] Política pública /politica-datos-amazon actualizada con la fecha
[ ] Email security@orvexia.com monitorizado
[ ] Re-consent flow probado en staging para vendedores existentes
```

---

## 8. Atajo: ¿se puede evitar RDP?

Sí, en casi todos los casos para un repricer:

- **Pricing + Listings + Reports agregados** cubren el 95% de un repricer.
- KPIs de ventas se pueden obtener de `Orders v0` **sin** marcar PII:
  el endpoint devolverá pedidos *con* `OrderTotal` y *sin* `BuyerInfo`
  detallada. Suficiente para tus dashboards.
- Si necesitas dirección **solo para imprimir etiquetas**, considera
  redirigir al vendedor a Seller Central (1 click) en vez de absorber
  la PII tú mismo. Es el patrón “bring your own portal” y Amazon lo
  aplaude.

> Recomendación operativa: **lanza la app sin RDP**, consigue tracción,
> y solo entonces aborda RDP cuando un caso de uso lo justifique. El
> coste de mantener RDP (auditoría anual, KMS, log retention 24m,
> DPA con cada subprocesador) no es trivial y rompe la velocidad de
> iteración del primer año.
