import { chromium } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3000";

// ---- canned data ------------------------------------------------------------
const now = Date.now();
const PRIORITIES = ["IMMEDIATE", "BATCH", "REVIEW"];
// 24 alerts across the last 14 days, varied risk score (covers all 4 bands) + priority.
const alertItems = Array.from({ length: 24 }).map((_, i) => ({
  alert_id: `ALT-240${52 - (i % 9)}-${String(100 + i)}`,
  customer_id: `CUST-${1000 + i}`,
  transaction_id: `TXN-${9000 + i}`,
  alert_timestamp: new Date(now - i * 13 * 3600 * 1000).toISOString(),
  priority: PRIORITIES[i % 3],
  status: "OPEN",
  risk_score: [40, 110, 170, 240][i % 4] + (i % 10), // spreads ALLOW/FLAG/HOLD/BLOCK
  triggered_rules_count: (i % 4) + 1,
  assigned_to: null,
}));

const champions = [
  { id: "m1", model_type: "catboost_momtsim", version: 7, status: "CHAMPION", trained_at: "2026-05-28T00:00:00Z" },
  { id: "m2", model_type: "ieee_isolation_forest", version: 3, status: "CHAMPION", trained_at: "2026-05-21T00:00:00Z" },
  { id: "m3", model_type: "n2v_gcn_momtsim", version: 2, status: "CHAMPION", trained_at: "2026-05-19T00:00:00Z" },
  { id: "m4", model_type: "river_arf", version: 1, status: "CHAMPION", trained_at: "2026-05-30T00:00:00Z" },
];
const latestDrift = {
  id: "d1", report_date: "2026-05-31", reference_window_days: 30, current_window_days: 7,
  features_tested: 42, features_drifted: 3, critical_features_drifted: 1,
  feature_drift_detected: true, prediction_drift_detected: false, drift_detected: true,
  skipped_insufficient_data: false, skip_reason: null, created_at: "2026-05-31T00:00:00Z",
};

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

async function installMocks(ctx, roles) {
  // Mirror the real BFF: the login response sets the __refresh session cookie
  // that the edge middleware checks before allowing /dashboard.
  await ctx.route("**/api/v1/auth/login", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "set-cookie": "__refresh=mock; Path=/; HttpOnly; SameSite=Lax" },
      body: JSON.stringify({
        user_id: "u1", email: "demo@autheo.test", full_name: "Demo User",
        roles, csrf_token: "csrf-mock",
        jurisdiction_code: "GHA", jurisdiction_display_name: "Ghana FIC",
      }),
    }),
  );
  await ctx.route("**/api/v1/alerts**", (r) => {
    const u = new URL(r.request().url());
    const total = u.searchParams.get("priority") === "IMMEDIATE" ? 3 : 42;
    return json(r, { items: alertItems, total, page: 1, page_size: 500 });
  });
  await ctx.route("**/api/v1/cases**", (r) => json(r, { items: [], total: 128, page: 1, page_size: 1 }));
  await ctx.route("**/api/v1/str**", (r) => json(r, { items: [], total: 12, page: 1, page_size: 1 }));
  await ctx.route("**/api/v1/approvals**", (r) => json(r, Array(8).fill({ id: "a", approval_status: "PENDING" })));
  await ctx.route("**/api/v1/models/champions**", (r) => json(r, champions));
  await ctx.route("**/api/v1/drift/latest**", (r) => json(r, latestDrift));
}

const personas = [
  { name: "admin", roles: ["SYSTEM_ADMIN"] },
  { name: "compliance", roles: ["COMPLIANCE_OFFICER"] },
  { name: "ml", roles: ["ML_ENGINEER"] },
  { name: "analyst", roles: ["ANALYST"] },
];

const browser = await chromium.launch();
for (const p of personas) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 1000 }, deviceScaleFactor: 2 });
  await installMocks(ctx, p.roles);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', "demo@autheo.test");
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await page.waitForTimeout(1800); // let ApexCharts render
  await page.screenshot({ path: path.join(dir, `verify-${p.name}.png`), fullPage: true });
  console.log(`captured verify-${p.name}.png (${p.roles.join(",")})`);
  await ctx.close();
}
await browser.close();
