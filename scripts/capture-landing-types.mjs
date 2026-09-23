/**
 * Capture matched product frames for Flexfye-style landing:
 * home, create types, collect, detail, lucky-draw wheel.
 */
import { chromium } from "playwright";
import fs from "fs";

const BASE = process.env.BHISHI_BASE || "http://127.0.0.1:5174";
const OUT = "public/landing";
fs.mkdirSync(OUT, { recursive: true });
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
page.setDefaultTimeout(22000);

async function shot(name) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 92, animations: "disabled" });
  log(`SHOT ${name}`);
}

async function auth() {
  const phone = `9${String(Date.now()).slice(-9)}`;
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^Sign up$/i }).click();
  await page.fill("#firstName", "Demo");
  await page.fill("#lastName", "Organiser");
  await page.fill("#signupPhone", phone);
  await page.fill("#signupPassword", "DemoPass1");
  await page.fill("#confirmPassword", "DemoPass1");
  await page.getByRole("button", { name: /Create account/i }).click();
  await page.waitForSelector(".otp-boxes input");
  const otp = ((await page.locator("body").innerText()).match(/Dev OTP:\s*(\d{6})/i) || [, "123456"])[1];
  const boxes = page.locator(".otp-boxes input");
  for (let i = 0; i < 6; i++) await boxes.nth(i).fill(otp[i]);
  await page.getByRole("button", { name: /Verify/i }).click().catch(() => {});
  await page.waitForTimeout(1600);
  if (page.url().includes("login")) throw new Error("auth fail");
  log(`authed ${page.url()}`);
}

async function goCreate() {
  await page.goto(`${BASE}/chits/new`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("button.type-pick");
  await page.waitForTimeout(350);
}

async function next() {
  await page.getByRole("button", { name: /^Next$/i }).click();
  await page.waitForTimeout(350);
}

/** Create a lucky-draw group and open the wheel */
async function createLuckyDraw() {
  await goCreate();
  await page.locator("button.type-pick").filter({ hasText: /Fixed/i }).first().click();
  await next();
  // Pick lucky draw style
  const lucky = page.locator("button.type-pick").filter({ hasText: /Lucky|draw|चिट्ठी|लकी/i });
  if (await lucky.count()) await lucky.first().click();
  else await page.locator("button.type-pick").nth(1).click();
  await next();
  // settlement / collect if present
  if (await page.locator("button.type-pick").count()) {
    await page.locator("button.type-pick").first().click();
    await next();
  }
  await page.getByRole("button", { name: /₹1,00,000/ }).first().click().catch(() => {});
  for (const lab of ["Number of hands", "Number of haptas"]) {
    const input = page.locator(`xpath=//label[contains(.,'${lab}')]/following::input[1]`);
    if (await input.count()) await input.first().fill("5");
  }
  await page.locator("xpath=//label[contains(.,'Group name')]/following::input[1]").fill("Lucky Circle Demo").catch(() => {});
  await page.locator("label.check").filter({ hasText: /understand/i }).click();
  await next();

  const names = ["Anita", "Ravi", "Sneha", "Priya", "Karan"];
  for (let i = 0; i < names.length; i++) {
    const box = page.locator(".add-member-box");
    await box.locator("input.field").nth(0).fill(names[i]);
    await box.locator("input.field").nth(1).fill(`97${10000000 + i}`);
    await page.getByRole("button", { name: /Add member/i }).first().click();
    await page.waitForTimeout(280);
  }
  await shot("shot-type-lucky-members");
  await page.getByRole("button", { name: /Create bhishi/i }).click();
  await page.waitForTimeout(1600);
  log(`lucky created ${page.url()}`);
  await shot("shot-type-lucky");

  // Open Award tab → lucky draw
  const award = page.locator(".tabs .tab, button.tab").filter({ hasText: /^Award$/i });
  if (await award.count()) {
    await award.first().click();
    await page.waitForTimeout(500);
    await shot("shot-award");
  }
  const roll = page.getByRole("button", { name: /lucky draw|Roll|Spin|draw/i });
  if (await roll.count()) {
    await roll.first().click();
    await page.waitForTimeout(900);
  } else if (/\/chits\/[^/]+/.test(page.url())) {
    const id = page.url().match(/\/chits\/([^/?#]+)/)?.[1];
    if (id) await page.goto(`${BASE}/chits/${id}/lucky-draw`, { waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(800);
  await shot("shot-lucky-wheel");
}

await auth();

await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".shell");
await page.waitForTimeout(600);
await shot("shot-home");

await page.locator("article.dash-chit").first().click().catch(() => {});
await page.waitForTimeout(900);
if (/\/chits\//.test(page.url())) await shot("shot-bhishi-detail");

await page.goto(`${BASE}/collections`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(700);
await shot("shot-collect");

await page.goto(`${BASE}/customers`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(700);
await shot("shot-people");

// Create wizard — Auction selected
await goCreate();
await page.locator("button.type-pick").filter({ hasText: /Auction/i }).first().click();
await shot("shot-create");
await shot("shot-type-auction");

// Fixed
await goCreate();
await page.locator("button.type-pick").filter({ hasText: /Fixed/i }).first().click();
await next();
await shot("shot-type-fixed");

// Loan
await goCreate();
await page.locator("button.type-pick").filter({ hasText: /Loan/i }).first().click();
await shot("shot-type-loan");

// Fixed → sacrifice if available
await goCreate();
await page.locator("button.type-pick").filter({ hasText: /Fixed/i }).first().click();
await next();
const sac = page.locator("button.type-pick").filter({ hasText: /Sacrifice|बलिदान/i });
if (await sac.count()) {
  await sac.first().click();
  await shot("shot-type-sacrifice");
} else {
  await page.locator("button.type-pick").last().click();
  await shot("shot-type-sacrifice");
}

// Terms screen for create animation
await goCreate();
await page.locator("button.type-pick").filter({ hasText: /Auction/i }).first().click();
await next();
if (await page.locator("button.type-pick").count()) {
  await page.locator("button.type-pick").first().click();
  await next();
}
await page.getByRole("button", { name: /₹1,00,000/ }).first().click().catch(() => {});
await shot("shot-create-terms");

try {
  await createLuckyDraw();
} catch (e) {
  log(`lucky draw capture warn: ${e.message || e}`);
  await shot("shot-lucky-wheel-fallback");
}

log("DONE");
await browser.close();
