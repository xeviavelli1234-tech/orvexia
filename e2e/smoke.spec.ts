import { test, expect } from "@playwright/test";

/**
 * Smoke test del comparador y del repricer en modo demo.
 *
 * No requiere Amazon real ni Stripe. Comprueba que las rutas críticas
 * cargan sin pintar el error boundary global y que tienen el contenido
 * esperado mínimamente.
 *
 * Para el flujo completo seller-side (signup → conectar demo → ver
 * listings → editar rango) hace falta un usuario semilla en la BD.
 * Ese test va abajo, marcado .skip — actívalo cuando tengas un
 * `test@orvexia.es` semilla en tu base de dev.
 */

test.describe("smoke: rutas públicas", () => {
  test("home carga sin error boundary", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/error/);
    // El home contiene un H1 con el branding.
    await expect(page.locator("h1").first()).toBeVisible();
    // Si la página explotara, error.tsx mostraría este texto.
    await expect(page.getByText("Algo no ha ido bien")).not.toBeVisible();
  });

  test("sitemap.xml devuelve XML válido", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("orvexia.es");
  });

  test("404 muestra la página custom, no la de Next", async ({ page }) => {
    const res = await page.goto("/ruta-que-no-existe-1234");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText(/no existe/i)).toBeVisible();
  });

  test("categorías carga", async ({ page }) => {
    await page.goto("/categorias");
    await expect(page.getByText("Algo no ha ido bien")).not.toBeVisible();
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("recomendados sin sesión muestra wall de login", async ({ page }) => {
    await page.goto("/recomendados");
    await expect(
      page.getByRole("heading", { name: /recomendaciones personalizadas/i }),
    ).toBeVisible();
  });
});

test.describe("smoke: API endpoints públicos", () => {
  test("plantilla CSV del repricer descargable sin auth", async ({
    request,
  }) => {
    const res = await request.get("/api/sellers/manual/import");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("sku");
    expect(body).toContain("title");
    expect(body).toContain("price");
  });

  test("endpoints autenticados devuelven 401 sin sesión", async ({
    request,
  }) => {
    const res = await request.post("/api/sellers/reprice/run-one", {
      data: { listingId: "x" },
    });
    expect(res.status()).toBe(401);
  });
});

// ── Happy path del seller (requiere usuario semilla) ───────────────────
// Para activar: crea un usuario `test@orvexia.es` con cuenta seller en
// modo demo o manual, y quita el .skip.
test.describe.skip("seller happy path (requiere user semilla)", () => {
  test("login → centro de control → editar rango de un producto", async ({
    page,
  }) => {
    // 1. Login (cambia las credenciales por las del usuario semilla).
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("test@orvexia.es");
    await page.getByLabel(/contrase/i).fill("test1234");
    await page.getByRole("button", { name: /entrar|iniciar/i }).click();

    // 2. Llega al centro de control.
    await page.waitForURL(/sellers\/productos/);
    await expect(page.getByText(/centro de control/i)).toBeVisible();

    // 3. Hace clic en un nodo del grafo.
    const firstNode = page.locator("[class*='hex-node']").first();
    await firstNode.click();

    // 4. Aparece el inspector con campos Mín/Máx.
    await expect(page.getByText(/precio actual/i)).toBeVisible();
    await expect(page.getByPlaceholder("0,00").first()).toBeVisible();

    // 5. Cambia el mínimo y guarda.
    const minInput = page.getByPlaceholder("0,00").first();
    await minInput.fill("99,99");
    await page.getByRole("button", { name: /guardar rango/i }).click();

    // Toast de éxito.
    await expect(page.getByText(/guardado|actualizado/i)).toBeVisible({
      timeout: 5000,
    });
  });
});
