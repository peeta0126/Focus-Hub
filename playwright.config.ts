import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: [
    { command: "node tests/fixtures/supabase.mjs", url: "http://127.0.0.1:54329/health", reuseExistingServer: false },
    {
      command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100/login", reuseExistingServer: false, timeout: 120_000,
      env: { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329", NEXT_PUBLIC_SUPABASE_ANON_KEY: "isolated-test-anon-key" },
    },
  ],
});
