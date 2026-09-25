/**
 * Capture premium landing screenshots at mobile 390 and desktop 1280.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BHISHI_BASE || "http://localhost:5174";
const OUT = "scripts/ux-audit-out/landing-premium";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function shot(viewport, name) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1.5,
  });
  await context.addInitScript(() => {
    localStorage.setItem("bhishi-ui-lang", "en");
    localStorage.setItem("bhishi-lang-chosen", "1");
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);

  await page.goto(`${BASE}/welcome`, { waitUntil: "networkidle" });
  await page.waitForSelector(".lp-hero", { timeout: 15000 });
  await page.waitForTimeout(800);

  const heroPath = path.join(OUT, `${name}-hero.png`);
  await page.screenshot({ path: heroPath, fullPage: false });

  const fullPath = path.join(OUT, `${name}-full.png`);
  await page.screenshot({ path: fullPath, fullPage: true });

  // Layout checks
  const issues = await page.evaluate(() => {
    const problems = [];
    const phones = [...document.querySelectorAll(".lp-demo-phone-wrap")];
    for (const el of phones) {
      const w = el.getBoundingClientRect().width;
      const max = window.innerWidth <= 560 ? 210 : 260;
      if (w > max + 2) problems.push(`Phone too wide: ${Math.round(w)}px (max ${max})`);
    }
    const cardsAroundVideo = [...document.querySelectorAll(".lp-demo-stage, .lp-walk-media, .lp-demo-stage-phone")].filter(
      (el) => {
        const s = getComputedStyle(el);
        return (
          (s.boxShadow && s.boxShadow !== "none" && !s.boxShadow.includes("0px 0px 0px")) ||
          (s.backdropFilter && s.backdropFilter !== "none")
        );
      },
    );
    if (cardsAroundVideo.length) problems.push(`Demo containers with shadow/blur: ${cardsAroundVideo.length}`);

    const h1 = document.querySelector(".lp-hero h1");
    if (h1) {
      const fs = parseFloat(getComputedStyle(h1).fontSize);
      if (fs > 40) problems.push(`Hero h1 oversized: ${fs}px`);
    }
    const brand = document.querySelector(".lp-brand-hero");
    if (!brand) problems.push("Missing brand-hero mark");

    const overflow = document.documentElement.scrollWidth > window.innerWidth + 2;
    if (overflow) problems.push(`Horizontal overflow: scrollWidth=${document.documentElement.scrollWidth}`);

    return problems;
  });

  console.log(`[${name}]`, issues.length ? issues.join("; ") : "OK");
  await context.close();
  return issues;
}

const desktop = await shot({ width: 1280, height: 800 }, "desktop-1280");
const mobile = await shot({ width: 390, height: 844 }, "mobile-390");

const report = {
  base: BASE,
  desktopIssues: desktop,
  mobileIssues: mobile,
  files: fs.readdirSync(OUT),
};
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log("Wrote", OUT, report);
await browser.close();

if (desktop.length || mobile.length) process.exitCode = 1;
