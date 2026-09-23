/**
 * Upgrade mock plan → create lucky-draw bhishi → capture wheel screen.
 */
import { chromium } from "playwright";
import fs from "fs";

const BASE = process.env.BHISHI_BASE || "http://127.0.0.1:5174";
const OUT = "public/landing";
fs.mkdirSync(OUT, { recursive: true });
const log = (m) => console.log(m);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
page.setDefaultTimeout(25000);
await page.addInitScript(() => {
  localStorage.setItem("bhishi-ui-lang", "en");
  localStorage.setItem("bhishi-lang-chosen", "1");
});

async function shot(name) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 92, animations: "disabled" });
  log(`SHOT ${name}`);
}

const phone = `9${String(Date.now()).slice(-9)}`;
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /^Sign up$/i }).click();
await page.fill("#firstName", "Lucky");
await page.fill("#lastName", "Demo");
await page.fill("#signupPhone", phone);
await page.fill("#signupPassword", "DemoPass1");
await page.fill("#confirmPassword", "DemoPass1");
await page.getByRole("button", { name: /Create account/i }).click();
await page.waitForSelector(".otp-boxes input");
const otp = ((await page.locator("body").innerText()).match(/Dev OTP:\s*(\d{6})/i) || [, "123456"])[1];
for (let i = 0; i < 6; i++) await page.locator(".otp-boxes input").nth(i).fill(otp[i]);
await page.getByRole("button", { name: /Verify/i }).click().catch(() => {});
await page.waitForTimeout(1600);

// Upgrade to Power (mock setPlan)
await page.goto(`${BASE}/upgrade`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
await page.getByRole("button", { name: /Monthly/i }).click().catch(() => {});
await page.waitForTimeout(200);
const powerBtn = page.getByRole("button", { name: /Power|Subscribe/i }).last();
await powerBtn.click();
await page.waitForTimeout(1200);
log(`plan page body snippet: ${(await page.locator("body").innerText()).slice(0, 400)}`);

page.on("dialog", async (d) => { log(`ALERT ${d.message()}`); await d.accept(); });

await page.goto(`${BASE}/chits/new`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("button.type-pick");
await page.locator("button.type-pick").filter({ hasText: /Fixed/i }).first().click();
await page.getByRole("button", { name: /^Next$/i }).click();
await page.waitForTimeout(300);
const lucky = page.locator("button.type-pick").filter({ hasText: /Lucky draw/i });
if (await lucky.count()) await lucky.first().click();
else await page.locator("button.type-pick").nth(1).click();
await page.getByRole("button", { name: /^Next$/i }).click();
await page.waitForTimeout(300);
if (await page.locator("button.type-pick").count()) {
  await page.locator("button.type-pick").first().click();
  await page.getByRole("button", { name: /^Next$/i }).click();
  await page.waitForTimeout(300);
}
await page.getByRole("button", { name: /₹1,00,000/ }).first().click().catch(() => {});
for (const lab of ["Number of hands", "Number of haptas"]) {
  const input = page.locator(`xpath=//label[contains(.,'${lab}')]/following::input[1]`);
  if (await input.count()) await input.first().fill("5");
}
await page.locator("xpath=//label[contains(.,'Group name')]/following::input[1]").fill("Lucky Draw Demo").catch(() => {});
await page.locator("label.check").filter({ hasText: /understand/i }).click();
await page.getByRole("button", { name: /^Next$/i }).click();
await page.waitForTimeout(500);

const names = ["Anita", "Ravi", "Sneha", "Priya", "Karan"];
for (let i = 0; i < names.length; i++) {
  const box = page.locator(".add-member-box");
  await box.locator("input.field").nth(0).fill(names[i]);
  await box.locator("input.field").nth(1).fill(`96${10000000 + i}`);
  await page.getByRole("button", { name: /Add member/i }).first().click();
  await page.waitForTimeout(250);
}
await shot("shot-type-lucky-members");
await page.getByRole("button", { name: /Create bhishi/i }).click();
await page.waitForTimeout(2000);
log(`after create ${page.url()}`);
await shot("shot-type-lucky");

if (!/\/chits\/[^/]+$/.test(page.url())) {
  throw new Error(`create failed at ${page.url()}`);
}
const id = page.url().match(/\/chits\/([^/?#]+)/)[1];

// Award tab
const awardTab = page.locator(".tabs .tab, button.tab").filter({ hasText: /^Award$/i });
if (await awardTab.count()) {
  await awardTab.first().click();
  await page.waitForTimeout(600);
  await shot("shot-award");
}

await page.goto(`${BASE}/chits/${id}/lucky-draw`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
await shot("shot-lucky-wheel");

// Try spin for a mid-animation frame if button exists
const spin = page.getByRole("button", { name: /Spin|Draw|Start|Roll/i });
if (await spin.count()) {
  await spin.first().click();
  await page.waitForTimeout(1200);
  await shot("shot-lucky-spinning");
}

log("DONE");
await browser.close();
