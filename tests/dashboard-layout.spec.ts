import { expect, test, type Page } from "@playwright/test";

const fixture = "http://127.0.0.1:54329";
const email = "dashboard-layout@example.test";
const password = "Test-password-123!";
const rows = [
  ["weekly-card", "tasks-card"],
  ["today-habits", "today-goals", "goals-card"],
  ["projects-card", "notes-card", "clock-card", "weather-card"],
];

test.beforeEach(async ({ page, request }) => {
  await request.post(`${fixture}/__test/reset`);
  await request.post(`${fixture}/auth/v1/signup`, { data: { email, password } });
  const mail = await (await request.get(`${fixture}/__test/mail?email=${email}`)).json();
  await page.goto(`/auth/confirm?type=signup&token_hash=${mail.token_hash}`);
  await expect(page).toHaveURL("/");
});

async function alignedRows(page: Page) {
  for (const row of rows) {
    await expect(page.locator(`.${row[0]}`)).toBeVisible();
    const reference = await page.locator(`.${row[0]}`).boundingBox();
    expect(reference).not.toBeNull();
    for (const name of row.slice(1)) {
      await expect(page.locator(`.${name}`)).toBeVisible();
      const bounds = await page.locator(`.${name}`).boundingBox();
      expect(bounds).not.toBeNull();
      expect(Math.abs(bounds!.y - reference!.y), `${name} top`).toBeLessThan(1);
      expect(Math.abs(bounds!.y + bounds!.height - reference!.y - reference!.height), `${name} bottom`).toBeLessThan(1);
    }
  }
}

async function heights(page: Page) {
  return page.locator(".dashboard-row").evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
}

test("desktop rows follow their reference cards with empty and overflowing content", async ({ page, request }, info) => {
  test.skip(info.project.name !== "desktop");
  test.setTimeout(180_000);
  for (const width of [1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await alignedRows(page);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const session = await (await request.post(`${fixture}/auth/v1/token?grant_type=password`, { data: { email, password } })).json();
  const headers = { Authorization: `Bearer ${session.access_token}` };
  const seed = async (table: string, items: Record<string, unknown>[]) => {
    const response = await request.post(`${fixture}/rest/v1/${table}`, { headers, data: items.map((item) => ({ user_id: session.user.id, ...item })) });
    expect(response.ok()).toBeTruthy();
  };
  await seed("habits", Array.from({ length: 6 }, (_, i) => ({ title: `습관 ${i}` })));
  await seed("projects", Array.from({ length: 3 }, (_, i) => ({ title: `프로젝트 ${i}` })));
  await page.reload();
  await alignedRows(page);
  const referenceHeights = await heights(page);
  await seed("tasks", Array.from({ length: 8 }, (_, i) => ({ title: `작업 ${i}`, due_date: "2099-01-01" })));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  await seed("daily_goals", Array.from({ length: 25 }, (_, i) => ({ title: `오늘 목표 ${i}`, goal_date: today, completed: false })));
  await seed("goals", Array.from({ length: 5 }, (_, i) => ({ title: `장기 목표 ${i}`, progress: 35 })));
  await seed("notes", Array.from({ length: 5 }, (_, i) => ({ title: `노트 ${i}` })));
  await page.reload();
  await alignedRows(page);
  expect(await heights(page)).toEqual(referenceHeights);
  for (const selector of [".task-list", ".check-list", ".goal-list", ".recent-list"]) {
    const scroll = await page.locator(selector).evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      return { height: element.clientHeight, total: element.scrollHeight, top: element.scrollTop };
    });
    expect(scroll.total, selector).toBeGreaterThan(scroll.height);
    expect(scroll.top, selector).toBeGreaterThan(0);
  }
  for (const width of [1280, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await alignedRows(page);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator(".tasks-card .task-check").first().click();
  await expect(page.locator(".tasks-card .task-check").first()).toHaveAttribute("aria-pressed", "true");
  await page.locator(".today-habits .habit").first().click();
  await expect(page.locator(".today-habits .habit").first()).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("textbox", { name: "오늘의 목표", exact: true }).fill("추가한 목표");
  await page.getByRole("button", { name: "오늘의 목표 추가", exact: true }).click();
  const goal = page.locator(".today-goals label").filter({ hasText: "추가한 목표" }).getByRole("checkbox");
  await goal.check();
  await expect(goal).toBeChecked();
  await alignedRows(page);
  expect(await heights(page)).toEqual(referenceHeights);
  const data = await (await request.get(`${fixture}/__test/data`)).json();
  expect(data.tasks[0].status).toBe("done");
  expect(data.habit_records[0].completed).toBe(true);
  await expect.poll(async () => {
    const saved = await (await request.get(`${fixture}/__test/data`)).json();
    return saved.daily_goals.find((item: { title: string }) => item.title === "추가한 목표")?.completed;
  }).toBe(true);
  await page.screenshot({ path: "test-results/dashboard-aligned-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "월간", exact: true }).click();
  await expect(page.locator(".month-grid")).toBeVisible();
  await alignedRows(page);
  expect((await heights(page)).slice(1)).toEqual(referenceHeights.slice(1));
  await page.getByRole("button", { name: "주간", exact: true }).click();
  await expect(page.locator(".week-grid")).toBeVisible();
  await alignedRows(page);
});

test("tablet and mobile keep their existing placement and content-sized cards", async ({ page }, info) => {
  const widths = info.project.name === "desktop" ? [768, 844, 1024, 1279] : [320, 375, 430, 767];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.locator(".tasks-card").evaluate((element) => getComputedStyle(element).contain)).toBe("none");
    if (width < 768) {
      const calendar = await page.locator(".weekly-card").boundingBox();
      const tasks = await page.locator(".tasks-card").boundingBox();
      const habits = await page.locator(".today-habits").boundingBox();
      const goals = await page.locator(".today-goals").boundingBox();
      expect(tasks!.y).toBeGreaterThanOrEqual(calendar!.y + calendar!.height);
      expect(habits!.y).toBeGreaterThanOrEqual(tasks!.y + tasks!.height);
      expect(goals!.y).toBeGreaterThanOrEqual(habits!.y + habits!.height);
      expect(tasks!.height).toBeLessThan(390);
      await expect(page.locator(".notes-card")).toBeHidden();
    } else {
      const tasks = await page.locator(".tasks-card").boundingBox();
      const daily = await page.locator(".today-goals").boundingBox();
      const calendar = await page.locator(".weekly-card").boundingBox();
      expect(tasks!.y).toBe(daily!.y);
      expect(calendar!.y).toBeGreaterThanOrEqual(tasks!.y + tasks!.height);
    }
  }
  await page.screenshot({ path: `test-results/dashboard-aligned-${info.project.name}-responsive.png`, fullPage: true });
});
