import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e — happy path del repricer en modo demo.
 *
 * Para activarlo (no se hace por defecto para no inflar el lockfile):
 *
 *   npm i -D @playwright/test
 *   npx playwright install chromium
 *   npm run e2e
 *
 * El runner arranca el dev server local en :3000 si no hay uno corriendo y
 * monta Chromium headless. No toca Amazon real (modo demo / fixtures).
 *
 * En CI: pon E2E_BASE_URL apuntando a la preview de Vercel para usar el
 * deployment desplegado en lugar de un dev server local.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Si E2E_BASE_URL apunta a una URL externa (preview, prod) NO arrancamos
  // server local. Solo arrancamos `npm run dev` cuando es localhost.
  webServer: BASE_URL.startsWith("http://localhost")
    ? {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
