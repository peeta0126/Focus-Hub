import { expect, test, type Page } from "@playwright/test";

const fixture = "http://127.0.0.1:54329";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

test.beforeEach(async ({ page, request }) => {
  await request.post(`${fixture}/__test/reset`);
  await request.post(`${fixture}/auth/v1/signup`, { data: { email: "design@example.test", password: "Test-password-123!" } });
  const mail = await (await request.get(`${fixture}/__test/mail?email=design@example.test`)).json();
  await page.goto(`/auth/confirm?type=signup&token_hash=${mail.token_hash}`);
  await expect(page).toHaveURL("/");
});

async function openTask(page: Page) {
  await page.goto("/tasks");
  await page.getByRole("main").getByRole("button", { name: /새 할 일/ }).filter({ visible: true }).click();
}

test("all pages adapt at 320, 375, 768, 1024, 1440 and 1920; navigation and themes", async ({ page }, info) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const routes = ["/", "/planner", "/tasks", "/projects", "/goals", "/habits", "/notes", "/journal", "/cs", "/resources", "/settings", "/more"];
  const widths = info.project.name === "desktop" ? [768, 1024, 1440, 1920] : [320, 375, 430];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.locator(".loading-skeleton")).toHaveCount(0);
      const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
      expect(overflow.scroll, `${route} at ${width}px overflows`).toBeLessThanOrEqual(overflow.viewport);
      if (width < 768 && ["/planner", "/habits"].includes(route)) {
        const control = page.locator(route === "/planner" ? ".picker-day" : ".habit-day:not(.outside)").first();
        const bounds = await control.boundingBox();
        expect(bounds?.width, `${route} date touch width at ${width}px`).toBeGreaterThanOrEqual(44);
        expect(bounds?.height, `${route} date touch height at ${width}px`).toBeGreaterThanOrEqual(44);
      }
    }
  }
  if (info.project.name === "desktop") {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page.getByRole("button", { name: "사이드바 접기", exact: true }).click();
    await expect(page.locator(".app-shell")).toHaveClass(/sidebar-is-collapsed/);
    await page.getByRole("button", { name: "사이드바 펼치기" }).click();
    await expect(page.locator(".app-shell")).not.toHaveClass(/sidebar-is-collapsed/);
  } else {
    await page.setViewportSize({ width: 844, height: 390 });
    for (const route of ["/", "/planner", "/tasks", "/notes"]) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
    await page.setViewportSize({ width: 375, height: 900 });
    await page.getByRole("navigation", { name: "모바일 메뉴" }).getByRole("link", { name: "더보기" }).click();
    await page.getByRole("main").getByRole("link", { name: "프로젝트 워크스페이스" }).click();
    await expect(page).toHaveURL("/projects");
  }
  for (const theme of ["dark", "light"]) {
    await page.goto("/settings");
    await page.getByRole("button", { name: theme === "dark" ? "다크" : "라이트", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.goto("/");
    await page.getByRole("button", { name: "월간", exact: true }).click();
    await page.screenshot({ path: `test-results/redesign-${info.project.name}-${theme}.png`, fullPage: true, caret: "initial" });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator(".button").first().evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  expect(errors).toEqual([]);
});

test("task CRUD, calendar sync, keyboard dialog, reload persistence and deletion", async ({ page, request }) => {
  await openTask(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("제목", { exact: true })).toBeFocused();
  await dialog.getByLabel("제목", { exact: true }).fill("중요한 작업");
  await dialog.getByLabel("우선순위").selectOption("high");
  await dialog.getByLabel("마감일").fill(today());
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("중요한 작업", { exact: true })).toBeVisible();
  let data = await (await request.get(`${fixture}/__test/data`)).json();
  expect(data.events[0].source_task_id).toBe(data.tasks[0].id);
  await page.reload();
  await expect(page.getByText("중요한 작업", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "중요한 작업 수정" }).click();
  await dialog.getByLabel("제목", { exact: true }).fill("수정한 작업");
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await page.getByRole("button", { name: "수정한 작업 완료 상태 변경" }).click();
  if (await page.locator(".mobile-task-filters").isVisible()) await page.getByRole("tab", { name: "완료", exact: true }).click();
  else await page.getByLabel("상태 필터").selectOption("done");
  await expect(page.getByText("수정한 작업", { exact: true })).toBeVisible();
  page.once("dialog", (prompt) => prompt.accept());
  await page.getByRole("button", { name: "수정한 작업 삭제" }).click();
  await expect(page.getByText("수정한 작업", { exact: true })).toHaveCount(0);
  data = await (await request.get(`${fixture}/__test/data`)).json();
  expect(data.tasks).toHaveLength(0);
  expect(data.events).toHaveLength(0);
  await openTask(page);
  await dialog.getByRole("button", { name: "닫기" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "저장", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => document.querySelector<HTMLElement>(".main-area")?.inert)).toBe(false);
});

test("schedule CRUD in month/week and locked linked tasks", async ({ page, request }) => {
  await page.goto("/planner");
  await page.getByRole("button", { name: "새 일정 추가" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("일정 이름").fill("디자인 검토");
  await dialog.getByLabel("시작 시간").fill("10:00");
  await dialog.getByLabel("종료 시간").fill("11:00");
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.locator(".timeline-card").getByText("디자인 검토", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "주간", exact: true }).click();
  await expect(page.locator(".picker-grid > button")).toHaveCount(7);
  await page.getByRole("button", { name: "월간", exact: true }).click();
  await page.locator(".timeline-card").getByRole("button", { name: "수정", exact: true }).click();
  await dialog.getByLabel("일정 이름").fill("수정한 일정");
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await page.reload();
  await expect(page.locator(".timeline-card").getByText("수정한 일정")).toBeVisible();
  page.once("dialog", (prompt) => prompt.accept());
  await page.locator(".timeline-card").getByRole("button", { name: "삭제", exact: true }).click();
  await expect(page.locator(".timeline-card")).toHaveCount(0);
  await openTask(page);
  await dialog.getByLabel("제목", { exact: true }).fill("연결된 작업");
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await page.goto("/planner");
  await expect(page.locator(".timeline-card").getByRole("link", { name: "할 일에서 수정" })).toBeVisible();
  await expect(page.locator(".timeline-card").getByRole("button", { name: /수정 불가/ })).toBeDisabled();
  const data = await (await request.get(`${fixture}/__test/data`)).json();
  expect(data.events).toHaveLength(1);
});

test("project CRUD with linked task, progress and detail navigation", async ({ page, request }) => {
  await page.goto("/projects");
  await page.getByRole("main").getByRole("button", { name: "새 프로젝트", exact: false }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("프로젝트 이름").fill("집중 프로젝트");
  await dialog.getByLabel("상태", { exact: true }).selectOption("active");
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("link", { name: "집중 프로젝트 상세 보기" })).toBeVisible();
  await page.getByRole("link", { name: "집중 프로젝트 상세 보기" }).click();
  await expect(page.getByRole("heading", { name: "집중 프로젝트", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "할 일 추가", exact: true }).click();
  await dialog.getByLabel("제목", { exact: false }).fill("프로젝트 작업");
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("프로젝트 작업", { exact: true })).toBeVisible();
  const data = await (await request.get(`${fixture}/__test/data`)).json();
  expect(data.tasks[0].project_id).toBe(data.projects[0].id);
  await page.goto("/projects");
  await page.getByRole("button", { name: "집중 프로젝트 메뉴" }).click();
  await page.getByRole("button", { name: "수정", exact: true }).click();
  await dialog.getByLabel("프로젝트 이름").fill("수정한 프로젝트");
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await page.getByRole("button", { name: "수정한 프로젝트 메뉴" }).click();
  page.once("dialog", (prompt) => prompt.accept());
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await expect(page.getByRole("link", { name: "수정한 프로젝트 상세 보기" })).toHaveCount(0);
});

test("goals, habits, notes, journal, learning, resources and settings retain storage contracts", async ({ page, request }) => {
  test.setTimeout(120_000);
  const dialog = page.getByRole("dialog");
  for (const [route, field, title] of [["/goals", "목표", "집중 목표"], ["/habits", "습관 이름", "물 마시기"], ["/cs", "제목", "학습 기록"], ["/resources", "자료 이름", "참고 문서"]]) {
    await page.goto(route);
    await page.locator(".toolbar").getByRole("button").filter({ visible: true }).click();
    await dialog.getByLabel(field, { exact: true }).fill(title);
    if (route === "/goals") await dialog.getByLabel("진행률").fill("35");
    if (route === "/habits") await dialog.getByLabel("목표 횟수").fill("1");
    if (route === "/cs") await dialog.getByLabel("공부 날짜").fill(today());
    if (route === "/resources") await dialog.getByLabel("URL", { exact: true }).fill("https://example.com/docs");
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(title, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  }
  await page.goto("/");
  await page.getByRole("button", { name: /물 마시기/ }).click();
  await expect(page.getByRole("button", { name: /물 마시기/ })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/notes");
  await page.getByRole("main").getByRole("button", { name: "＋ 새 노트" }).click();
  await page.getByLabel("제목", { exact: true }).fill("집중 노트");
  await page.getByLabel("본문 (Markdown 입력 가능)").fill("오늘의 기록");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("노트를 저장했습니다");
  if (await page.getByRole("button", { name: "노트 목록" }).isVisible()) await page.getByRole("button", { name: "노트 목록" }).click();
  await page.getByRole("button", { name: /집중 노트/ }).click();
  await expect(page.getByLabel("제목", { exact: true })).toHaveValue("집중 노트");
  await page.goto("/journal");
  await page.getByLabel("오늘 있었던 일").fill("리디자인 검증");
  await page.getByRole("button", { name: "저널 저장" }).click();
  await expect(page.getByRole("status")).toContainText("저널을 저장");
  await page.goto("/settings");
  await expect(page.getByLabel("오늘의 문구")).toBeEnabled();
  await page.getByLabel("오늘의 문구").fill("작은 진전");
  await page.getByRole("button", { name: "설정 저장" }).click();
  await page.reload();
  await expect(page.getByLabel("오늘의 문구")).toHaveValue("작은 진전");
  const data = await (await request.get(`${fixture}/__test/data`)).json();
  expect(data.goals[0].progress).toBe(35);
  expect(data.habit_records[0].completed).toBe(true);
  expect(data.notes[0].content).toBe("오늘의 기록");
  expect(data.journal_entries[0].events).toBe("리디자인 검증");
  expect(data.cs_study_logs[0].title).toBe("학습 기록");
  expect(data.resources[0].url).toBe("https://example.com/docs");
});
