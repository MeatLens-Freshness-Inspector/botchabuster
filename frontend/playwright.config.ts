import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const configuredCiWorkers = Number.parseInt(process.env.PLAYWRIGHT_WORKERS ?? "", 10);
const ciWorkers = Number.isInteger(configuredCiWorkers) && configuredCiWorkers > 0
  ? configuredCiWorkers
  : 4;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.spec.ts",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? ciWorkers : 1,
  globalTimeout: isCI ? 110_000 : undefined,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
    serviceWorkers: "block",
    timezoneId: "UTC",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !isCI,
  },
});
