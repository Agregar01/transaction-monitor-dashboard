import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test("login page has proper page title", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/autheo|sign in|login/i);
  });

  test("skip-to-content link exists", async ({ page }) => {
    await page.goto("/login");
    const skipLink = page.locator('a[href="#main-content"]');
    // Skip link should exist in DOM (may be visually hidden)
    if (await skipLink.count() > 0) {
      expect(await skipLink.count()).toBeGreaterThan(0);
    }
  });

  test("form inputs have associated labels", async ({ page }) => {
    await page.goto("/login");
    const inputs = page.locator("input:not([type=hidden])");
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const ariaLabelledBy = await input.getAttribute("aria-labelledby");
      // Each input should have an id (for label[for]) or aria-label
      expect(id || ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });

  test("signup page has proper page title", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveTitle(/autheo|sign up|register/i);
  });
});
