import { chromium } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const ids = ["admin", "officer", "analyst", "ml"];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.goto("file://" + path.join(dir, "dashboards.html"));
for (const id of ids) {
  const el = await page.$("#" + id);
  await el.screenshot({ path: path.join(dir, `dashboard-${id}.png`) });
  console.log("rendered dashboard-" + id + ".png");
}
await browser.close();
