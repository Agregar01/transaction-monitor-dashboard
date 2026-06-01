import { chromium } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3000";
const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

const CHANNELS = ["MOBILE", "USSD", "AGENT", "WEB", "API"];
const TYPES = ["TRANSFER", "CASH_OUT", "CASH_IN", "PAYMENT"];
const txns = Array.from({ length: 80 }).map((_, i) => ({
  transaction_id: `TXN-${9000 + i}`, customer_id: `CUST-${1000 + (i % 20)}`,
  timestamp: new Date(Date.now() - i * 3600 * 1000).toISOString(),
  amount: 200 + (i * 137) % 9000, transaction_type: TYPES[i % 4],
  channel: CHANNELS[i % 5], flow_type: null, receiver_id: null, receiver_country: null,
  combined_risk_score: [40, 110, 170, 240, 80][i % 5] + (i % 10), flagged: i % 4 === 0,
}));

const LEVELS = ["LOW", "MEDIUM", "HIGH", "VERY_HIGH", "CRITICAL"];
const CTYPES = ["INDIVIDUAL", "MERCHANT", "COMPANY"];
const customers = Array.from({ length: 60 }).map((_, i) => ({
  customer_id: `CUST-${1000 + i}`, customer_type: CTYPES[i % 3],
  risk_level: LEVELS[i % 5], risk_score: [40, 110, 170, 240, 280][i % 5],
  country_code: "GH", is_pep: i % 9 === 0, kyc_quality_score: 80, occupation: "Trader",
  created_at: "2026-01-01T00:00:00Z",
}));

const page1 = { items: txns.slice(0, 20), total: 1712044, page: 1, page_size: 20 };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 1100 }, deviceScaleFactor: 2 });
await ctx.route("**/api/v1/auth/login", (r) =>
  r.fulfill({
    status: 200, contentType: "application/json",
    headers: { "set-cookie": "__refresh=mock; Path=/; HttpOnly; SameSite=Lax" },
    body: JSON.stringify({
      user_id: "u1", email: "demo@autheo.test", full_name: "Demo User",
      roles: ["COMPLIANCE_OFFICER"], csrf_token: "csrf-mock",
      jurisdiction_code: "GHA", jurisdiction_display_name: "Ghana FIC",
    }),
  }));
// Larger sample vs page-1 table, keyed off page_size in the query string.
await ctx.route("**/api/v1/transactions**", (r) => {
  const u = new URL(r.request().url());
  const ps = u.searchParams.get("page_size");
  return json(r, ps === "200" ? { items: txns, total: 1712044, page: 1, page_size: 200 } : page1);
});
await ctx.route("**/api/v1/customers**", (r) => {
  const u = new URL(r.request().url());
  const ps = u.searchParams.get("page_size");
  return json(r, ps === "200"
    ? { items: customers, total: 13465, page: 1, page_size: 200 }
    : { items: customers.slice(0, 20), total: 13465, page: 1, page_size: 20 });
});

const page = await ctx.newPage();
await page.goto(`${BASE}/login`);
await page.fill('input[type="email"]', "demo@autheo.test");
await page.fill('input[type="password"]', "password123");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard", { timeout: 15000 });

for (const [route, name, marker] of [
  ["/dashboard/transactions", "transactions", "By channel"],
  ["/dashboard/customers", "customers", "By risk level"],
]) {
  await page.goto(`${BASE}${route}`);
  await page.getByText(marker, { exact: false }).first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(dir, `verify-${name}-charts.png`), fullPage: true });
  console.log(`captured verify-${name}-charts.png`);
}
await browser.close();
