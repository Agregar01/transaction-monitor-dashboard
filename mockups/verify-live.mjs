import { chromium } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const BASE = "https://transaction-monitor-dashboard.netlify.app";

const ADMIN_EMAIL = process.env.TMS_EMAIL;
const ADMIN_PW = process.env.TMS_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PW) {
  console.error("Set TMS_EMAIL and TMS_PASSWORD");
  process.exit(2);
}

// New users to create (one per role the user needs). Passwords from env.
const NEW_USERS = [
  { email: "compliance.demo@agregartech.com", name: "Compliance Demo", role: "COMPLIANCE_OFFICER", pw: process.env.NEW_PW_1 },
  { email: "analyst.demo@agregartech.com", name: "Analyst Demo", role: "ANALYST", pw: process.env.NEW_PW_2 },
];

const log = (...a) => console.log("[verify]", ...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 1100 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

// ── 1. Login ────────────────────────────────────────────────────────────────
log("logging in as", ADMIN_EMAIL);
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', ADMIN_EMAIL);
await page.fill('input[type="password"]', ADMIN_PW);
await page.click('button[type="submit"]');
try {
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  log("LOGIN OK → landed on /dashboard");
} catch {
  const body = (await page.textContent("body")) ?? "";
  log("LOGIN FAILED — still at", page.url());
  log("page text head:", body.slice(0, 200).replace(/\s+/g, " "));
  await page.screenshot({ path: path.join(dir, "live-login-fail.png") });
  await browser.close();
  process.exit(1);
}

// ── 2. Deploy verification: marker text only present in commit 09ab3d3 ────────
await page.waitForTimeout(2500); // let queries settle
const hasLiveTxns = await page.getByText("Live transactions", { exact: false }).count();
const hasExecStrip = await page.getByText("Transactions · 30d", { exact: false }).count();
log("DEPLOY MARKERS — 'Live transactions':", hasLiveTxns, "| exec strip 'Transactions · 30d':", hasExecStrip);
await page.screenshot({ path: path.join(dir, "live-dashboard.png"), fullPage: true });

await page.goto(`${BASE}/dashboard/reports`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const hasRuleRecs = await page.getByText("Rule tuning recommendations", { exact: false }).count();
const hasClusters = await page.getByText("Transaction clusters", { exact: false }).count();
log("REPORTS MARKERS — 'Rule tuning recommendations':", hasRuleRecs, "| 'Transaction clusters':", hasClusters);
await page.screenshot({ path: path.join(dir, "live-reports.png"), fullPage: true });

// ── 3. Create users via the dashboard UI ──────────────────────────────────────
for (const u of NEW_USERS) {
  log(`creating user ${u.email} (${u.role})…`);
  await page.goto(`${BASE}/dashboard/users`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "+ New user" }).click();
  const form = page.locator("form");
  await form.locator('input[type="email"]').fill(u.email);
  await form.locator('input[placeholder="Full name (optional)"]').fill(u.name);
  await form.locator('input[type="password"]').fill(u.pw ?? "");
  // role toggle button inside the modal
  await form.getByRole("button", { name: u.role, exact: true }).click();
  await form.getByRole("button", { name: "Create" }).click();

  // Wait for success or error toast.
  const ok = page.getByText("User created", { exact: false });
  const fail = page.getByText("Create failed", { exact: false });
  try {
    await Promise.race([
      ok.waitFor({ timeout: 15000 }).then(() => "ok"),
      fail.waitFor({ timeout: 15000 }).then(() => "fail"),
    ]);
  } catch {
    /* neither toast — fall through to inspection */
  }
  const okN = await ok.count();
  const failN = await fail.count();
  let detail = "";
  if (failN > 0) {
    // grab the toast message text for the reason
    detail = (await page.locator("body").getByText(u.email, { exact: false }).first().textContent().catch(() => "")) ?? "";
  }
  log(`  RESULT ${u.email}: ${okN > 0 ? "CREATED ✅" : failN > 0 ? "FAILED ❌" : "UNKNOWN ⚠"} ${detail}`.trim());
  await page.screenshot({ path: path.join(dir, `live-create-${u.role}.png`), fullPage: true });
  await page.waitForTimeout(1000);
}

await browser.close();
log("done");
