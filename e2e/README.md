# e2e tests (Playwright)

Tests de extremo a extremo del comparador y del repricer en modo demo.

## Activar (primera vez)

```bash
npm i -D @playwright/test
npx playwright install chromium
```

`playwright` (sin `@`, el SDK del browser) ya está instalado como dep,
pero el runner `@playwright/test` se mantiene como devDep opcional para
no inflar la instalación de la app en Vercel.

## Ejecutar

Contra dev local (arranca `npm run dev` automáticamente si no hay uno):

```bash
npx playwright test
```

Contra una preview de Vercel:

```bash
E2E_BASE_URL=https://orvexia-git-feature-xxx.vercel.app npx playwright test
```

UI interactiva:

```bash
npx playwright test --ui
```

## Estado

- `smoke.spec.ts`: rutas públicas + endpoints sin auth + 404 custom.
- Happy path del seller (login → conectar demo → editar rango) está en
  el mismo fichero pero `.skip` hasta que tengas un usuario semilla en
  la BD de dev. Quita el `.skip` cuando esté listo.

## CI

Para activar en GitHub Actions, añade un workflow:

```yaml
- run: npm ci
- run: npx playwright install --with-deps chromium
- run: npx playwright test
  env:
    E2E_BASE_URL: ${{ steps.deploy.outputs.preview_url }}
```
