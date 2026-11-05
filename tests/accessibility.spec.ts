import { expect, test } from "@playwright/test";

const fixture = "http://127.0.0.1:54329";

test("quick add retains failed input, supports a short viewport, and token text contrast", async ({ page, request }, info) => {
  await request.post(`${fixture}/__test/reset`);
  const account = await (await request.post(`${fixture}/auth/v1/signup`, { data: { email: "accessibility@example.test", password: "Test-password-123!" } })).json();
  await page.goto(`/auth/confirm?type=signup&token_hash=${account.id}`);
  const trigger = page.getByRole("button", { name: "빠른 추가", exact: true }).filter({ visible: true }).first();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("기록 종류").selectOption({ label: "새 할 일" });
  await dialog.getByLabel("제목", { exact: true }).fill("실패해도 유지할 입력");
  await page.route(`${fixture}/rest/v1/tasks**`, (route) => route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "Fixture write rejected" }) }));
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("저장하지 못했습니다");
  await expect(dialog.getByLabel("제목", { exact: true })).toHaveValue("실패해도 유지할 입력");
  await page.unroute(`${fixture}/rest/v1/tasks**`);
  if (info.project.name === "mobile") await page.setViewportSize({ width: 375, height: 420 });
  await dialog.getByRole("button", { name: "저장", exact: true }).scrollIntoViewIfNeeded();
  const bounds = await dialog.getByRole("button", { name: "저장", exact: true }).boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto("/settings");
  for (const theme of ["다크", "라이트"]) {
    await page.getByRole("button", { name: theme, exact: true }).click();
    const ratios = await page.evaluate(() => {
      const css = getComputedStyle(document.documentElement);
      const luminance = (hex: string) => {
        let value = hex.trim().replace("#", "");
        if (value.length === 3) value = value.split("").map((character) => character + character).join("");
        const rgb = value.match(/.{2}/g)!.map((part) => parseInt(part, 16) / 255).map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
      };
      const contrast = (a: string, b: string) => { const x = luminance(css.getPropertyValue(a)); const y = luminance(css.getPropertyValue(b)); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      return [contrast("--text-primary", "--surface"), contrast("--text-secondary", "--surface"), contrast("--muted", "--surface"), contrast("--accent", "--on-accent")];
    });
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
  }
  await page.goto("/login"); // An authenticated account stays inside its workspace.
  await expect(page).toHaveURL("/");
});
