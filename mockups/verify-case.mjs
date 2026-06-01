import { chromium } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3000";
const CID = "case-123";
const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

const kase = {
  id: CID, title: "Structuring pattern — Akosua Mensah", case_type: "STRUCTURING",
  status: "INVESTIGATING", priority: "HIGH", jurisdiction_id: "GHA",
  assigned_to: "u1abcdef-0000", due_date: "2026-06-10T00:00:00Z",
  created_at: "2026-05-29T09:00:00Z", narrative: "Multiple sub-threshold MoMo cash-ins across 6 agents within 48h.",
};
const notes = [
  { id: "n1", case_id: CID, author_id: "other-99", body: "Pulled 14-day transaction history — 11 cash-ins just under GHS 1,000.", created_at: "2026-05-29T10:15:00Z", updated_at: "2026-05-29T10:15:00Z" },
  { id: "n2", case_id: CID, author_id: "u1", body: "Requested KYC refresh from the agent network. Awaiting docs.", created_at: "2026-05-30T14:02:00Z", updated_at: "2026-05-30T14:02:00Z" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 1000 }, deviceScaleFactor: 2 });
await ctx.route("**/api/v1/auth/login", (r) =>
  r.fulfill({
    status: 200, contentType: "application/json",
    headers: { "set-cookie": "__refresh=mock; Path=/; HttpOnly; SameSite=Lax" },
    body: JSON.stringify({
      user_id: "u1", email: "demo@autheo.test", full_name: "Demo Analyst",
      roles: ["ANALYST"], csrf_token: "csrf-mock",
      jurisdiction_code: "GHA", jurisdiction_display_name: "Ghana FIC",
    }),
  }));
await ctx.route(`**/api/v1/cases/${CID}/notes`, (r) => json(r, notes));
await ctx.route(`**/api/v1/cases/${CID}/alerts`, (r) => json(r, [{ id: "l1", alert_id: "ALT-24052-001", added_at: "2026-05-29T09:05:00Z" }]));
await ctx.route(`**/api/v1/cases/${CID}/history`, (r) => json(r, [{ id: "h1", from_status: "OPEN", to_status: "INVESTIGATING", changed_by: "u1", changed_at: "2026-05-29T09:30:00Z", notes: "Assigned for review" }]));
await ctx.route(`**/api/v1/cases/${CID}`, (r) => json(r, kase));

const page = await ctx.newPage();
await page.goto(`${BASE}/login`);
await page.fill('input[type="email"]', "demo@autheo.test");
await page.fill('input[type="password"]', "password123");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard", { timeout: 15000 });
await page.goto(`${BASE}/dashboard/cases/${CID}`);
await page.getByText("Investigation notes").waitFor({ timeout: 10000 });
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(dir, "verify-case-notes.png"), fullPage: true });
console.log("captured verify-case-notes.png");
await browser.close();
