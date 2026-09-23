/**
 * Capture landing page + key product frames for marketing assets.
 * Uses local Vite. Language popup dismissed to EN for clean shots.
 */
import { chromium } from "playwright";
import fs from "fs";

const BASE = process.env.BHISHI_BASE || "http://localhost:5174";
const OUT = "public/landing";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 1.5,
});
await context.addInitScript(() => {
  localStorage.setItem("bhishi-ui-lang", "en");
  localStorage.setItem("bhishi-lang-chosen", "1");
});
const page = await context.newPage();
page.setDefaultTimeout(20000);

await page.goto(`${BASE}/welcome`, { waitUntil: "networkidle" });
await page.waitForSelector(".lp-hero", { timeout: 15000 });
await page.screenshot({ path: `${OUT}/landing-desktop.jpg`, type: "jpeg", quality: 88, fullPage: false });
await page.screenshot({ path: `${OUT}/landing-full.jpg`, type: "jpeg", quality: 82, fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/welcome`, { waitUntil: "networkidle" });
await page.waitForSelector(".lp-hero");
await page.screenshot({ path: `${OUT}/landing-mobile.jpg`, type: "jpeg", quality: 88 });

// Hero phone area close-up
const phone = page.locator(".lp-phone-hero");
if (await phone.count()) {
  await phone.screenshot({ path: `${OUT}/landing-hero-phone.jpg`, type: "jpeg", quality: 90 });
}

console.log("Landing screenshots written to", OUT);
await browser.close();
