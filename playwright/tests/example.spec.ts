import { expect, test } from "@playwright/test";

/**
 * Smoke test: the app boots and the home route responds.
 * Replace/extend with real Tool Builder flows.
 */
test("home page loads", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/.+/);
});

/**
 * The login route renders for unauthenticated users.
 */
test("login route renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("body")).toBeVisible();
});
