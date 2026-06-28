import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for the toolkits app E2E suite.
 *
 * The target app is set via the `BASE_URL` env var so the same tests run
 * against a local dev server, a Docker-networked app container, or a deployed
 * preview. Defaults to the Next.js dev port.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  /** Fail the CI build if a `test.only` was left in the source. */
  forbidOnly: !!process.env.CI,
  /** Retry only on CI to absorb flakiness; fail fast locally. */
  retries: process.env.CI ? 2 : 0,
  /** Single worker on CI for deterministic ordering; parallel locally. */
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
