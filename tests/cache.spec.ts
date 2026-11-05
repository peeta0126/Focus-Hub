import { expect, test } from "@playwright/test";

test("the updated worker purges only its old caches and leaves Next CSS to the network", async ({ page, request }) => {
  const markup = await (await request.get("/login")).text();
  const stylesheet = [...markup.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((match) => match[1]).find((path) => path.includes("globals"));
  expect(stylesheet).toBeTruthy();
  await page.goto("/manifest.webmanifest");
  const state = await page.evaluate(async (path) => {
    await caches.open("focus-hub-static-v3");
    await caches.open("unrelated-cache");
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
    const current = await caches.open("focus-hub-static-v4");
    await current.put(path!, new Response(":root { --bg: #08111d; }", { headers: { "Content-Type": "text/css" } }));
    const css = await (await fetch(path!)).text();
    return { keys: await caches.keys(), freshCSS: css.includes("#0c1018") };
  }, stylesheet);
  expect(state.keys).not.toContain("focus-hub-static-v3");
  expect(state.keys).toContain("unrelated-cache");
  expect(state.freshCSS).toBe(true);
});

test("an existing cache-first worker cannot mix old CSS with the redesigned app", async ({ page, context, request }, info) => {
  const fixture = "http://127.0.0.1:54329";
  await request.post(`${fixture}/__test/reset`);
  const response = await request.get("/login");
  const markup = await response.text();
  const stylesheet = [...markup.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((match) => match[1]).find((path) => path.includes("globals"));
  expect(stylesheet).toBeTruthy();
  await page.goto("/manifest.webmanifest");
  await context.route("**/sw.js", (route) => route.fulfill({
    contentType: "application/javascript",
    headers: { "Service-Worker-Allowed": "/" },
    body: `self.addEventListener('install',()=>self.skipWaiting());
      self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
      self.addEventListener('fetch',e=>{if(new URL(e.request.url).pathname.startsWith('/_next/static/'))e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});`,
  }));
  await page.evaluate(async (cssPath) => {
    const owned = await caches.open("focus-hub-static-v3");
    await owned.put(cssPath!, new Response(":root { --bg: #08111d; } body { background: #08111d; }", { headers: { "Content-Type": "text/css" } }));
    await caches.open("unrelated-cache");
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
    localStorage.setItem("focus-hub-theme", "dark");
    localStorage.setItem("cache-regression-sentinel", "keep");
  }, stylesheet);
  expect(await page.evaluate(async (path) => (await (await fetch(path!)).text()).includes("#08111d"), stylesheet)).toBe(true);
  await context.unroute("**/sw.js");
  let loginNavigations = 0;
  page.on("framenavigated", (frame) => { if (frame === page.mainFrame() && frame.url().endsWith("/login")) loginNavigations++; });
  await page.goto("/login");
  await expect.poll(() => loginNavigations).toBeGreaterThanOrEqual(2);
  await expect.poll(async () => {
    try { return await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length); }
    catch (error) {
      if (error instanceof Error && error.message.includes("Execution context was destroyed")) return -1;
      throw error;
    }
  }).toBe(0);
  await page.waitForLoadState("domcontentloaded");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg").trim())).toBe("#0c1018");
  await expect(page.locator(".login-page")).toHaveCSS("display", info.project.name === "mobile" ? "block" : "grid");
  const state = await page.evaluate(async () => ({ keys: await caches.keys(), sentinel: localStorage.getItem("cache-regression-sentinel"), theme: localStorage.getItem("focus-hub-theme") }));
  expect(state.keys.some((key) => key.startsWith("focus-hub-static-"))).toBe(false);
  expect(state.keys).toContain("unrelated-cache");
  expect(state.sentinel).toBe("keep");
  expect(state.theme).toBe("dark");
  const account = await (await request.post(`${fixture}/auth/v1/signup`, { data: { email: "cache@example.test", password: "Test-password-123!" } })).json();
  await page.goto(`/auth/confirm?type=signup&token_hash=${account.id}`);
  await expect(page.locator(".daily-stats")).toHaveCSS("display", "grid");
  await expect(page.locator(".daily-stat").first()).toHaveCSS("display", info.project.name === "mobile" ? "flex" : "grid");
  await expect(page.locator(".dashboard-intro")).toHaveCSS("display", "flex");
  if (info.project.name === "mobile") await expect(page.locator(".brand-caption")).toBeHidden();
  else await expect(page.locator(".brand-caption")).toBeVisible();
  await page.screenshot({ path: `test-results/cache-recovered-${info.project.name}.png`, fullPage: true, caret: "initial" });
});
