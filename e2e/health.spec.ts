import { test, expect } from "@playwright/test";

test.describe("App Health", () => {
  test("homepage loads without errors", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok() || response?.status() === 307).toBeTruthy();
  });

  test("login page loads without errors", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.ok()).toBeTruthy();
    // No console errors
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test("signup page loads without errors", async ({ page }) => {
    const response = await page.goto("/signup");
    expect(response?.ok()).toBeTruthy();
  });
});
