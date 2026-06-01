import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "admin@autheo.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "Passw0rd!";

/**
 * Golden analyst-workbench triage path.
 *
 * Requires a running TMS backend that already has at least one OPEN alert.
 * To seed an alert deterministically before the run:
 *
 *   curl -X POST http://localhost:8088/api/v1/ingestion/transaction \
 *     -H "Content-Type: application/json" \
 *     -H "X-API-Key: ${TMS_API_KEY}" \
 *     -d @scripts/test-fixtures/high-risk-transaction.json
 *
 * Skips automatically if BACKEND_URL is unset.
 */
test.describe("alert triage", () => {
  test.skip(!process.env.BACKEND_URL, "BACKEND_URL not set — skipping live triage E2E");

  test("an analyst can open an alert, add a note, and resolve it", async ({ page }) => {
    // 1. Log in
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("**/dashboard");

    // 2. Open the alerts list
    await page.getByRole("link", { name: /^alerts$/i }).click();
    await page.waitForURL("**/dashboard/alerts");
    await expect(page.getByRole("heading", { name: /alerts/i })).toBeVisible();

    // 3. Click the first alert id in the table (font-mono link)
    const firstAlertLink = page.locator("table tbody tr").first().locator("a").first();
    test.skip(
      (await firstAlertLink.count()) === 0,
      "No alerts in the OPEN queue — seed one before running this test",
    );
    await firstAlertLink.click();
    await expect(page.getByRole("heading", { name: /alert/i })).toBeVisible();

    // 4. Add an investigation note
    const noteText = `playwright triage note ${Date.now()}`;
    await page.getByPlaceholder(/what did you find/i).fill(noteText);
    await page.getByRole("button", { name: /save note/i }).click();
    await expect(page.getByText(noteText)).toBeVisible({ timeout: 10_000 });

    // 5. Resolve as False positive
    await page.getByPlaceholder(/resolution narrative/i).fill("playwright e2e — false positive");
    await page.getByRole("button", { name: /close alert/i }).click();

    // 6. Verify we land back on the alerts list
    await page.waitForURL("**/dashboard/alerts", { timeout: 15_000 });
  });
});
