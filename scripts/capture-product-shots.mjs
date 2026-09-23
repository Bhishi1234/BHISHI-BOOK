/**
 * Re-capture viewport-only product frames (no OS/Safari chrome, no tall scroll dumps).
 */
import { chromium } from "playwright";
import fs from "fs";

const BASE = process.env.BHISHI_BASE || "http://127.0.0.1:5174";
const OUT = "public/landing";
fs.mkdirSync(OUT, { recursive: true });

const phone = `9${String(Date.now()).slice(-9)}`;
const password = "DemoPass1";
const log = (m) => console.log(m);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
await context.addInitScript(() => {
  localStorage.setItem("bhishi-ui-lang", "en");
  localStorage.setItem("bhishi-lang-chosen", "1");
});
const page = await context.newPage();
page.setDefaultTimeout(20000);

async function shot(name) {
  await page.waitForTimeout(500);
  // Viewport only — fits phone mockups; never includes device chrome
  await page.screenshot({
    path: `${OUT}/${name}.jpg`,
    type: "jpeg",
    quality: 92,
    animations: "disabled",
  });
  log(`SHOT ${name}`);
}

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /^Sign up$/i }).click();
await page.fill("#firstName", "Demo");
await page.fill("#lastName", "Organiser");
await page.fill("#signupPhone", phone);
await page.fill("#signupPassword", password);
await page.fill("#confirmPassword", password);
await page.getByRole("button", { name: /Create account/i }).click();
await page.waitForSelector(".otp-boxes input");
const otp = ((await page.locator("body").innerText()).match(/Dev OTP:\s*(\d{6})/i) || [, "123456"])[1];
const boxes = page.locator(".otp-boxes input");
for (let i = 0; i < 6; i++) await boxes.nth(i).fill(otp[i]);
await page.getByRole("button", { name: /Verify/i }).click().catch(() => {});
await page.waitForTimeout(1600);
if (page.url().includes("login")) throw new Error("auth fail");

await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".shell");
await page.waitForTimeout(600);
await shot("shot-home");

await page.locator("article.dash-chit").first().click();
await page.waitForTimeout(900);
await shot("shot-bhishi-detail");

const hapta = page.locator(".tabs .tab, button.tab").filter({ hasText: /^Hapta$/i });
if (await hapta.count()) {
  await hapta.first().click();
  await page.waitForTimeout(500);
  await shot("shot-hapta");
}
const award = page.locator(".tabs .tab, button.tab").filter({ hasText: /^Award$/i });
if (await award.count()) {
  await award.first().click();
  await page.waitForTimeout(500);
  await shot("shot-award");
}

await page.goto(`${BASE}/chits/new`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("button.type-pick");
await page.waitForTimeout(400);
await shot("shot-create");

await page.locator("button.type-pick").filter({ hasText: /Fixed/i }).first().click();
await page.getByRole("button", { name: /^Next$/i }).click();
await page.waitForTimeout(250);
if (await page.locator("button.type-pick").count()) {
  await page.locator("button.type-pick").first().click();
  await page.getByRole("button", { name: /^Next$/i }).click();
  await page.waitForTimeout(250);
}
if (await page.locator("button.type-pick").count()) {
  await page.locator("button.type-pick").first().click();
  await page.getByRole("button", { name: /^Next$/i }).click();
  await page.waitForTimeout(350);
}
await page.getByRole("button", { name: /₹1,00,000/ }).first().click().catch(() => {});
for (const lab of ["Number of hands", "Number of haptas"]) {
  const input = page.locator(`xpath=//label[contains(.,'${lab}')]/following::input[1]`);
  if (await input.count()) await input.first().fill("5");
}
await page.locator("xpath=//label[contains(.,'Group name')]/following::input[1]").fill("Demo Fixed Circle").catch(() => {});
await page.waitForTimeout(300);
await shot("shot-create-terms");

await page.goto(`${BASE}/collections`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(700);
await shot("shot-collect");

await page.goto(`${BASE}/customers`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(700);
await shot("shot-people");

log("DONE");
await browser.close();
