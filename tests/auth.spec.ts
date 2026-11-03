import { expect, test, type Page } from "@playwright/test";

const email = "signup@example.test";
const password = "Test-password-123!";
const fixture = "http://127.0.0.1:54329";

async function signup(page: Page, address = email) {
  await page.goto("/signup");
  await page.getByLabel("이메일", { exact: true }).fill(address);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByLabel("비밀번호 확인").fill(password);
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await page.locator("form").evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
  await expect(page.getByRole("status")).toContainText("가입 요청을 접수했습니다");
}

async function login(page: Page, address = email, secret = password) {
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill(address);
  await page.getByLabel("비밀번호", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL("/");
}

async function logout(page: Page) {
  await page.getByRole("button", { name: /^(로그아웃|나가기)$/ }).filter({ visible: true }).click();
  await expect(page).toHaveURL("/login");
}

test.beforeEach(async ({ request }) => { await request.post(`${fixture}/__test/reset`); });

test("public routes, protected routes, invalid links, field validation and responsive layout", async ({ page }) => {
  for (const path of ["/", "/notes", "/tasks", "/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL("/login");
  }
  await page.goto("/reset-password");
  await expect(page).toHaveURL("/forgot-password?error=session");
  await expect(page.locator("form").getByRole("alert")).toContainText("세션");
  for (const path of ["/login", "/signup", "/forgot-password", "/auth/resend"]) {
    await page.goto(path);
    await expect(page).toHaveURL(path);
    await expect(page.locator(".app-shell")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
  await page.goto("/auth/confirm?token_hash=bad&type=signup&next=https://example.com");
  await expect(page).toHaveURL("/login?error=confirmation");
  await expect(page.locator("form").getByRole("alert")).toContainText("인증 링크");
  await page.goto("/auth/confirm?type=recovery&token_hash=expired");
  await expect(page).toHaveURL("/forgot-password?error=session");
  await page.goto("/signup");
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(page.getByText("올바른 이메일을 입력해주세요.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("이메일", { exact: true })).toBeFocused();
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByLabel("비밀번호 확인").fill("mismatch");
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(page.getByText("비밀번호가 일치하지 않습니다.", { exact: true })).toBeVisible();
});

test("signup → email confirmation → login → save → logout → login; separate accounts and password recovery", async ({ page, request }) => {
  let signupRequests = 0;
  page.on("request", (req) => { if (req.url().includes("/auth/v1/signup")) signupRequests++; });
  await signup(page);
  expect(signupRequests).toBe(1);
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("이메일 인증이 필요");
  const { token_hash } = await (await request.get(`${fixture}/__test/mail?email=${email}`)).json();
  await page.goto(`/auth/confirm?token_hash=${token_hash}&type=signup`);
  await expect(page).toHaveURL("/");
  await page.goto("/signup");
  await expect(page).toHaveURL("/");
  await page.goto("/login");
  await expect(page).toHaveURL("/");
  await logout(page);
  await login(page);
  await page.goto("/notes");
  await expect(page.getByText("새 노트를 작성해보세요.")).toBeVisible();
  await page.getByRole("main").getByRole("button", { name: "＋ 새 노트", exact: true }).click();
  await page.getByLabel("제목", { exact: true }).fill("내 계정의 테스트 노트");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("노트를 저장했습니다.")).toBeVisible();
  await logout(page);
  await login(page);
  await page.goto("/notes");
  await expect(page.getByLabel("제목", { exact: true })).toHaveValue("내 계정의 테스트 노트");
  await logout(page);
  await signup(page, "second@example.test");
  const second = await (await request.get(`${fixture}/__test/mail?email=second@example.test`)).json();
  await page.goto(`/auth/confirm?type=signup&token_hash=${second.token_hash}`);
  await page.goto("/notes");
  await expect(page.getByText("새 노트를 작성해보세요.")).toBeVisible();
  await expect(page.getByText("내 계정의 테스트 노트")).toHaveCount(0);
  await logout(page);
  await page.goto("/auth/resend");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByRole("button", { name: "인증 메일 재전송", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("새 인증 메일");
  await expect(page.getByRole("button", { name: /초 후 다시 전송/ })).toBeDisabled();
  await page.goto("/forgot-password");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByRole("button", { name: "재설정 메일 보내기", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("재설정 메일");
  await page.goto(`/auth/confirm?token_hash=${token_hash}&type=recovery`);
  await expect(page).toHaveURL("/reset-password");
  await page.getByLabel("새 비밀번호", { exact: true }).fill("Changed-password-456!");
  await page.getByLabel("비밀번호 확인").fill("Changed-password-456!");
  await page.getByRole("button", { name: "비밀번호 변경", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("비밀번호를 변경했습니다");
  await page.getByRole("link", { name: "대시보드로 이동" }).click();
  await logout(page);
  await login(page, email, "Changed-password-456!");
  await page.goto("/notes");
  await expect(page.getByLabel("제목", { exact: true })).toHaveValue("내 계정의 테스트 노트");
});

test("provider rate limits and network failures leave the form usable", async ({ page }) => {
  await page.route(`${fixture}/auth/v1/signup**`, (route) => route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ code: "over_email_send_rate_limit", msg: "Rate limited" }) }));
  await page.goto("/signup");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByLabel("비밀번호 확인").fill(password);
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("요청이 너무 많습니다");
  await expect(page.getByRole("button", { name: "회원가입", exact: true })).toBeEnabled();
  await page.unroute(`${fixture}/auth/v1/signup**`);
  await page.route(`${fixture}/auth/v1/signup**`, (route) => route.abort());
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(/연결|네트워크/);
  await expect(page.getByRole("button", { name: "회원가입", exact: true })).toBeEnabled();
});
