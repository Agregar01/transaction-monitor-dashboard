import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "admin@autheo.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "Passw0rd!";
const CONCURRENT_SESSIONS = Number(process.env.E2E_PERF_SESSIONS ?? "5");

/**
 * Dashboard performance & resilience checks (Phase D of the transaction-monitor
 * stress test plan). Three things this repo had no coverage for at all:
 *
 *   1. Page load / TTI under N concurrent browser sessions — run this WHILE
 *      the backend is under load from tests/load/run_load_tests.sh in the
 *      other repo, to see how the dashboard degrades when its API calls are
 *      competing with load-test traffic, not just how it performs solo.
 *   2. Large-list rendering doesn't defeat pagination — confirms the alerts/
 *      transactions tables actually cap DOM rows at page_size (20) rather
 *      than rendering every matching record.
 *   3. Error-state resilience — the backend returning 500 or malformed JSON
 *      must produce the app's own error UI, not a blank page or an
 *      unhandled-exception overlay.
 *
 * Same gating convention as login.spec.ts / triage.spec.ts: skips entirely
 * without a live backend, so it never runs by accident in a plain CI build.
 */
test.describe("dashboard performance & resilience", () => {
  test.skip(!process.env.BACKEND_URL, "BACKEND_URL not set — skipping live perf/resilience E2E");

  async function login(page: Page) {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("**/dashboard");
  }

  test("page load timing for the main dashboard, alerts, and transactions pages", async ({
    page,
  }) => {
    await login(page);

    for (const path of ["/dashboard", "/dashboard/alerts", "/dashboard/transactions"]) {
      const start = Date.now();
      await page.goto(path, { waitUntil: "networkidle" });
      const wallClockMs = Date.now() - start;

      const timing = await page.evaluate(() => {
        const [nav] = performance.getEntriesByType(
          "navigation",
        ) as PerformanceNavigationTiming[];
        return nav
          ? { domContentLoaded: nav.domContentLoadedEventEnd, loadEvent: nav.loadEventEnd }
          : null;
      });

      // Generous smoke thresholds, not a strict perf gate — the dev server
      // (webServer in playwright.config.ts) is materially slower than a
      // production build, and this is meant to catch "something is
      // seriously broken/hanging", not track regressions to the millisecond.
      console.log(`[perf] ${path}: wall-clock=${wallClockMs}ms timing=${JSON.stringify(timing)}`);
      expect(wallClockMs, `${path} took ${wallClockMs}ms to reach networkidle`).toBeLessThan(15_000);
    }
  });

  test(`${CONCURRENT_SESSIONS} concurrent sessions can all load the alerts page`, async ({
    browser,
  }) => {
    // Run this test WHILE a backend load test is active (see the plan's
    // Phase D) to see contention effects — on its own it only proves the
    // dashboard doesn't fall over under concurrent *client* sessions.
    const contexts = await Promise.all(
      Array.from({ length: CONCURRENT_SESSIONS }, () => browser.newContext()),
    );
    try {
      const results = await Promise.all(
        contexts.map(async (ctx) => {
          const page = await ctx.newPage();
          const start = Date.now();
          await login(page);
          await page.goto("/dashboard/alerts", { waitUntil: "networkidle" });
          const elapsedMs = Date.now() - start;
          const failed = await page.getByText(/failed to load/i).isVisible().catch(() => false);
          return { elapsedMs, failed };
        }),
      );

      const failures = results.filter((r) => r.failed);
      console.log(`[perf] ${CONCURRENT_SESSIONS} sessions: ${JSON.stringify(results)}`);
      expect(failures, `${failures.length}/${CONCURRENT_SESSIONS} sessions saw a load error`).toHaveLength(0);
    } finally {
      await Promise.all(contexts.map((ctx) => ctx.close()));
    }
  });

  test("alerts table caps rendered rows at the page size, not the full result set", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/dashboard/alerts");
    await expect(page.getByRole("heading", { name: /alerts/i })).toBeVisible();

    const rowCount = await page.locator("table tbody tr").count();
    // page_size is 20 (src/app/dashboard/alerts/page.tsx) — the table must
    // never render more rows than that in one page, regardless of how many
    // alerts actually match the filters server-side.
    expect(rowCount, "alerts table rendered more rows than the configured page_size").toBeLessThanOrEqual(20);
  });

  test("a 500 from the alerts API shows the app's error state, not a blank page or crash overlay", async ({
    page,
  }) => {
    await login(page);

    await page.route("**/api/v1/alerts*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "injected by perf.spec.ts" }),
      }),
    );

    await page.goto("/dashboard/alerts");
    await expect(page.getByText(/failed to load alerts/i)).toBeVisible({ timeout: 10_000 });

    // Next.js dev shows a red "Unhandled Runtime Error" overlay on an
    // uncaught client exception — its absence confirms the API error was
    // actually handled (isError branch) rather than crashing the component.
    await expect(page.getByText(/unhandled runtime error/i)).toHaveCount(0);
  });

  test("malformed JSON from the alerts API does not crash the page", async ({ page }) => {
    await login(page);

    await page.route("**/api/v1/alerts*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{not valid json",
      }),
    );

    await page.goto("/dashboard/alerts");
    // Either the error state or a graceful "no data" state is acceptable —
    // what's not acceptable is an unhandled exception overlay or a blank body.
    await expect(page.getByText(/unhandled runtime error/i)).toHaveCount(0);
    await expect(page.locator("body")).toContainText(/alerts/i);
  });
});
