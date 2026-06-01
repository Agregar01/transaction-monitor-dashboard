import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "admin@autheo.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "Passw0rd!";

/**
 * Golden-path login flow.
 *
 * Prerequisites:
 *   - TMS backend running on BACKEND_URL (the dev-server proxies to it).
 *   - A user seeded with the credentials above:
 *       docker exec tm-app python scripts/seed_auth.py \
 *         --email admin@autheo.test --password 'Passw0rd!'
 *
 * Skips automatically if BACKEND_URL isn't set, so unit/CI pipelines without
 * the TMS stack don't fail on the dashboard E2E run.
 */
test.describe("authentication", () => {
  test.skip(
    !process.env.BACKEND_URL,
    "BACKEND_URL not set — TMS backend isn't available, skipping live-auth E2E",
  );

  test("renders the login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /transaction monitor/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("nobody@example.com");
    await page.getByLabel(/password/i).fill("wrong");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("alert")).toContainText(/invalid email or password/i);
  });

  test("logs in and lands on the dashboard with the sidebar visible", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("**/dashboard");
    await expect(page.getByText(/welcome/i)).toBeVisible();

    // Sidebar should expose at least the Monitor section
    await expect(page.getByRole("link", { name: /^alerts$/i })).toBeVisible();
  });
});
