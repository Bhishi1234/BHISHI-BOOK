/**
 * Capture individual landing sections + legal pages for visual QA.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BHISHI_BASE || "http://localhost:5174";
const OUT = "scripts/ux-audit-out/landing-premium";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function run(viewport, name) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1.5 });
  await ctx.addInitScript(() => {
    localStorage.setItem("bhishi-ui-lang", "en");
    localStorage.setItem("bhishi-lang-chosen", "1");
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(`${BASE}/welcome`, { waitUntil: "networkidle" });
  await page.waitForSelector(".lp-hero");
  await page.waitForTimeout(1200);
  await page
    .waitForFunction(() => document.querySelectorAll(".lp-demo-phone-wrap.is-ready").length >= 1, null, {
      timeout: 8000,
    })
    .catch(() => {});

  const sections = ["#demos", "#types", "#lucky", "#for-whom", "#why", "#trust", ".lp-cta"];
  for (const sel of sections) {
    const el = await page.$(sel);
    if (!el) continue;
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(450);
    const safe = sel.replace(/[#.]/g, "");
    await el.screenshot({ path: path.join(OUT, `${name}-${safe}.png`) });
  }

  for (const route of ["/terms", "/privacy", "/contact"]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUT, `${name}-${route.slice(1)}.png`),
      fullPage: true,
    });
  }
  await ctx.close();
}

await run({ width: 1280, height: 800 }, "d");
await run({ width: 390, height: 844 }, "m");
console.log(
  "Wrote section shots:",
  fs.readdirSync(OUT).filter((f) => f.startsWith("d-") || f.startsWith("m-") || f.includes("terms") || f.includes("privacy") || f.includes("contact")),
);
await browser.close();
