/**
 * Record landing-page demo clips from a real playthrough of production.
 *
 * Usage (PowerShell):
 *   node scripts/record-landing-demos.mjs
 *
 * Env:
 *   BHISHI_BASE (default https://www.bhishicircle.in)
 *   BHISHI_PHONE / BHISHI_PASSWORD
 *   DEMO_HEADLESS=0 to watch
 *   DEMO_HANDS (default 5), DEMO_POT (default 100000)
 *
 * Writes webm/mp4/png into public/landing/demos/ (overwrites 01–06).
 * Journey stills → scripts/ux-audit-out/landing-journey/
 * Does not push to git.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DEMOS = path.join(ROOT, "public", "landing", "demos");
const OUT_EXPORTS = path.join(ROOT, "exports");
const OUT_SHOTS = path.join(ROOT, "scripts", "ux-audit-out", "landing-journey");
const TMP = path.join(ROOT, "scripts", "ux-audit-out", "landing-journey", "_tmp-video");
const STATE = path.join(TMP, "auth.json");

fs.mkdirSync(OUT_DEMOS, { recursive: true });
fs.mkdirSync(OUT_EXPORTS, { recursive: true });
fs.mkdirSync(OUT_SHOTS, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const BASE = (process.env.BHISHI_BASE || "https://www.bhishicircle.in").replace(/\/$/, "");
const PHONE = process.env.BHISHI_PHONE || "9967966631";
const PASSWORD = process.env.BHISHI_PASSWORD || "Siddhesh@123";
const HANDS = Number(process.env.DEMO_HANDS || 5);
const POT = Number(process.env.DEMO_POT || 100000);
const HEADLESS = process.env.DEMO_HEADLESS !== "0";
const TIMEOUT = 60_000;
const VIEWPORT = { width: 390, height: 844 };
const OUT_W = 640;
const OUT_H = 1280;

const RUN = Date.now().toString(36).slice(-5);
const TITLE = `Landing Demo ${RUN}`;
const MEMBER_NAMES = ["Anita", "Ravi", "Sneha", "Priya", "Karan"];

const CLIPS = [
  { id: "create", file: "01-how-to-create-bhishi", title: "How to create a bhishi" },
  { id: "award", file: "02-how-to-award-bhishi", title: "How to award bhishi" },
  { id: "payments", file: "03-how-to-record-payments", title: "How to record payments" },
  { id: "reports", file: "04-how-to-share-reports", title: "How to share reports" },
  { id: "members", file: "05-how-to-see-members", title: "How to see members" },
  { id: "collections", file: "06-how-to-see-collections", title: "How to see collections" },
];

const report = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE,
  title: TITLE,
  chitId: null,
  clips: [],
  failures: [],
  landingPageEdited: false,
  ffmpeg: null,
};

function log(msg) {
  console.log(msg);
}

function findFfmpeg() {
  const candidates = [
    process.env.FFMPEG_PATH,
    path.join(ROOT, "tools", "ffmpeg", "ffmpeg-9.0.2-full_build", "bin", "ffmpeg.exe"),
    path.join(ROOT, "tools", "ffmpeg", "bin", "ffmpeg.exe"),
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  const which = spawnSync(process.platform === "win32" ? "where" : "which", ["ffmpeg"], {
    encoding: "utf8",
  });
  if (which.status === 0) {
    const line = which.stdout.split(/\r?\n/).find(Boolean);
    if (line) return line.trim();
  }
  // Search tools/ffmpeg recursively
  const walk = (dir, depth = 0) => {
    if (depth > 4 || !fs.existsSync(dir)) return null;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isFile() && /^ffmpeg(\.exe)?$/i.test(ent.name)) return p;
      if (ent.isDirectory()) {
        const hit = walk(p, depth + 1);
        if (hit) return hit;
      }
    }
    return null;
  };
  return walk(path.join(ROOT, "tools", "ffmpeg"));
}

function convertWebmToMp4(ffmpeg, webm, mp4) {
  const r = spawnSync(
    ffmpeg,
    [
      "-y",
      "-i",
      webm,
      "-vf",
      `scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=decrease,pad=${OUT_W}:${OUT_H}:(ow-iw)/2:(oh-ih)/2:black`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      mp4,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    throw new Error(`ffmpeg mp4 failed: ${(r.stderr || r.stdout || "").slice(-400)}`);
  }
}

function scalePoster(ffmpeg, srcPng, destPng) {
  const r = spawnSync(
    ffmpeg,
    [
      "-y",
      "-i",
      srcPng,
      "-vf",
      `scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=decrease,pad=${OUT_W}:${OUT_H}:(ow-iw)/2:(oh-ih)/2:black`,
      destPng,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    fs.copyFileSync(srcPng, destPng);
  }
}

async function shot(page, name) {
  const file = path.join(OUT_SHOTS, `${name}.png`);
  await page.screenshot({ path: file }).catch(() => {});
  return file;
}

async function bodyText(page) {
  return page.locator("body").innerText().catch(() => "");
}

async function ensureEnglish(page) {
  const en = page.locator("button, .chip, a").filter({ hasText: /^EN$|^English$/i }).first();
  if (await en.count()) await en.click().catch(() => {});
  await page.waitForTimeout(300);
}

async function hardHome(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.locator(".modal-back").click({ timeout: 800 }).catch(() => {});
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
  await page.waitForTimeout(900);
  if (page.url().includes("/login")) {
    await page.fill("#phone", PHONE);
    await page.fill("#password", PASSWORD);
    await page.locator("button.btn.wide").filter({ hasText: /Log in|Sign in/i }).first().click();
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: TIMEOUT }).catch(() => {});
    await page.waitForTimeout(900);
  }
  await ensureEnglish(page);
}

async function softNav(page, pathname) {
  await page.evaluate((p) => {
    window.history.pushState({}, "", p);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, pathname);
  await page.waitForTimeout(1200);
}

async function openNewChit(page) {
  // Mobile: sidebar ".new-chit" is hidden — use More sheet, Bhishi list CTA, or soft nav.
  await page.keyboard.press("Escape").catch(() => {});
  const more = page.locator("button.bottom-tab").filter({ hasText: /^More$/i }).first();
  if (await more.count()) {
    await more.click();
    await page.waitForTimeout(400);
    const sheetNew = page.locator(".sheet a, .sheet-item").filter({ hasText: /New bhishi|Create/i }).first();
    if (await sheetNew.count()) {
      await sheetNew.click();
      await page.waitForTimeout(1200);
      if ((await page.locator("button.type-pick").count()) > 0) return;
    }
  }
  const bhishiTab = page.locator("a.bottom-tab, .bottom-tab").filter({ hasText: /^Bhishi$/i }).first();
  if (await bhishiTab.count()) {
    await bhishiTab.click();
    await page.waitForTimeout(700);
    const create = page.locator("a.btn, button.btn, a").filter({ hasText: /New bhishi|Create/i }).first();
    if (await create.count() && (await create.isVisible().catch(() => false))) {
      await create.click();
      await page.waitForTimeout(1200);
      if ((await page.locator("button.type-pick").count()) > 0) return;
    }
  }
  await softNav(page, "/chits/new");
  await page.waitForTimeout(1000);
  if ((await page.locator("button.type-pick").count()) === 0) {
    throw new Error(`openNewChit failed. body=${(await bodyText(page)).slice(0, 200)}`);
  }
}

async function openChit(page, chitId) {
  await hardHome(page);
  await softNav(page, `/chits/${chitId}`);
  await page.waitForTimeout(1000);
  const text = await bodyText(page);
  if (/Failed to load module/i.test(text) || text.trim().length < 30) {
    await hardHome(page);
    // Prefer Bhishi list → card matching demo title or any Landing Demo
    const bhishiTab = page.locator("a.bottom-tab, .bottom-tab").filter({ hasText: /^Bhishi$/i }).first();
    if (await bhishiTab.count()) {
      await bhishiTab.click();
      await page.waitForTimeout(700);
    }
    const card = page
      .locator("a, .card, .chit-card, .chit-mini")
      .filter({ hasText: new RegExp(TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "|Landing Demo", "i") })
      .first();
    if (await card.count()) await card.click({ timeout: 8000 });
    else await softNav(page, `/chits/${chitId}`);
    await page.waitForTimeout(1200);
  }
}

async function clickTab(page, name) {
  const aliases = {
    Hapta: "Hapta|Monthly",
    Collections: "Collections",
    Members: "Members",
    Settings: "Settings|Reports",
    Reports: "Settings|Reports",
    Overview: "Overview",
  };
  const re = new RegExp(`^(${aliases[name] || name})$`, "i");
  const tab = page
    .locator("button.wizard-tab, .tabs .tab, button.tab")
    .filter({ hasText: re })
    .first();
  if (await tab.count()) {
    await tab.click({ timeout: 8000 });
    await page.waitForTimeout(700);
    return true;
  }
  return false;
}

async function fillNearLabel(page, labelRe, value) {
  const label = page.locator("label, .label").filter({ hasText: labelRe }).first();
  if (!(await label.count())) return false;
  const box = label.locator("xpath=following::input[1]");
  if (await box.count()) {
    await box.fill(String(value));
    return true;
  }
  return false;
}

async function dismissModals(page) {
  for (let i = 0; i < 4; i++) {
    const has = await page.locator(".modal-back, .modal, [role=dialog]").count();
    if (!has) break;
    await page
      .getByRole("button", { name: /PDF only|Done|Skip|बाद में|Close|OK|Not now/i })
      .last()
      .click({ timeout: 1200 })
      .catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(250);
  }
}

async function launchBrowser() {
  return chromium.launch({
    headless: HEADLESS,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
}

async function newRecordingContext(browser, videoDir) {
  fs.mkdirSync(videoDir, { recursive: true });
  const opts = {
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    recordVideo: { dir: videoDir, size: VIEWPORT },
    locale: "en-IN",
  };
  if (fs.existsSync(STATE)) opts.storageState = STATE;
  return browser.newContext(opts);
}

async function finalizeClip(page, context, clipMeta, posterName) {
  const video = page.video();
  await shot(page, posterName);
  await page.close();
  await context.close();
  if (!video) throw new Error("No video object");
  const rawPath = await video.path();
  return rawPath;
}

async function publishClip(clip, rawWebm, posterSrc, ffmpeg) {
  const webmOut = path.join(OUT_DEMOS, `${clip.file}.webm`);
  const mp4Out = path.join(OUT_DEMOS, `${clip.file}.mp4`);
  const pngOut = path.join(OUT_DEMOS, `${clip.file}.png`);
  const exportWebm = path.join(OUT_EXPORTS, `${clip.file}.webm`);
  const exportMp4 = path.join(OUT_EXPORTS, `${clip.file}.mp4`);
  const exportPng = path.join(OUT_EXPORTS, `${clip.file}.png`);

  // Re-encode webm to target size when ffmpeg available; else copy
  if (ffmpeg) {
    const r = spawnSync(
      ffmpeg,
      [
        "-y",
        "-i",
        rawWebm,
        "-vf",
        `scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=decrease,pad=${OUT_W}:${OUT_H}:(ow-iw)/2:(oh-ih)/2:black`,
        "-c:v",
        "libvpx-vp9",
        "-b:v",
        "1.2M",
        "-an",
        webmOut,
      ],
      { encoding: "utf8" },
    );
    if (r.status !== 0) {
      fs.copyFileSync(rawWebm, webmOut);
      report.failures.push({ clip: clip.id, step: "webm-encode", error: (r.stderr || "").slice(-300) });
    }
    try {
      convertWebmToMp4(ffmpeg, rawWebm, mp4Out);
    } catch (e) {
      report.failures.push({ clip: clip.id, step: "mp4", error: e.message });
    }
    scalePoster(ffmpeg, posterSrc, pngOut);
  } else {
    fs.copyFileSync(rawWebm, webmOut);
    // Without ffmpeg we cannot produce H.264; leave existing mp4 if present, else copy webm as placeholder note
    report.failures.push({ clip: clip.id, step: "mp4", error: "ffmpeg unavailable — mp4 not refreshed" });
    fs.copyFileSync(posterSrc, pngOut);
  }

  for (const [src, dest] of [
    [webmOut, exportWebm],
    [mp4Out, exportMp4],
    [pngOut, exportPng],
  ]) {
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }

  report.clips.push({
    id: clip.id,
    webm: webmOut,
    mp4: fs.existsSync(mp4Out) ? mp4Out : null,
    poster: pngOut,
    raw: rawWebm,
  });
  log(`✓ published ${clip.file}`);
}

async function loginOnce(browser) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
  await page.waitForTimeout(800);
  await ensureEnglish(page);
  const signIn = page.locator(".chip").filter({ hasText: /Sign in|Log in/i }).first();
  if (await signIn.count()) await signIn.click().catch(() => {});
  await page.fill("#phone", PHONE);
  await page.fill("#password", PASSWORD);
  await shot(page, "00-login");
  await page.locator("button.btn.wide").filter({ hasText: /Log in|Sign in|Continue/i }).first().click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: TIMEOUT }).catch(() => {});
  await page.waitForTimeout(1200);
  if (page.url().includes("/login")) {
    const err = await page.locator(".due, .error, [role=alert]").first().innerText().catch(() => "login failed");
    throw new Error(err);
  }
  await shot(page, "01-after-login");
  await context.storageState({ path: STATE });
  await context.close();
  log("Login OK — storage saved");
}

async function recordCreate(browser, ffmpeg) {
  const clip = CLIPS[0];
  const videoDir = path.join(TMP, clip.id);
  const context = await newRecordingContext(browser, videoDir);
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);

  await hardHome(page);
  await page.waitForTimeout(600);
  await shot(page, "10-home");

  await openNewChit(page);
  await shot(page, "11-new-wizard");

  // Type: Fixed / committee → Lucky draw (or direct lucky if listed)
  const luckyType = page.locator("button.type-pick").filter({ hasText: /Lucky draw|चिट्ठी|लकी/i }).first();
  const fixedType = page.locator("button.type-pick").filter({ hasText: /Fixed\s*\/\s*committee|Fixed|समिति/i }).first();
  if (await luckyType.count()) {
    await luckyType.click();
  } else if (await fixedType.count()) {
    await fixedType.click();
  } else {
    throw new Error("No Fixed/Lucky type pick");
  }
  await page.locator(".wizard-actions button.btn").filter({ hasText: /^Next$/i }).click();
  await page.waitForTimeout(700);
  await shot(page, "12-after-type");

  // Variant lucky draw if present
  const variant = page.locator("button.type-pick").filter({ hasText: /Lucky draw|चिट्ठी|लकी/i }).first();
  if (await variant.count()) {
    await variant.click();
    await page.locator(".wizard-actions button.btn").filter({ hasText: /^Next$/i }).click();
    await page.waitForTimeout(700);
  }

  // Style: Award first
  const stylePick = page.locator("button.type-pick").filter({ hasText: /Award first|Auction first|पहले अवार्ड/i }).first();
  if (await stylePick.count()) {
    await stylePick.click();
    await page.locator(".wizard-actions button.btn").filter({ hasText: /^Next$/i }).click();
    await page.waitForTimeout(700);
    await shot(page, "13-style");
  }

  // Terms
  const potInput = page
    .locator('input.field[placeholder*="100000" i], input.field[placeholder*="e.g. 100000" i]')
    .first();
  if (await potInput.count()) await potInput.fill(String(POT));
  else await fillNearLabel(page, /Bhishi amount|Pot|राशि/i, POT);
  await page.getByRole("button", { name: /^₹1,00,000$/ }).click().catch(() => {});

  const eg10 = page.locator('input[placeholder="e.g. 10"]');
  for (let i = 0; i < (await eg10.count()); i++) await eg10.nth(i).fill(String(HANDS));
  await fillNearLabel(page, /Number of hands|Number of haptas|हाथ/i, HANDS);
  await page.locator('input[placeholder*="optional" i], input[placeholder*="Shown as-is" i]').first().fill(TITLE).catch(() => {});
  await fillNearLabel(page, /Group name|Title|नाम/i, TITLE);

  const confirm = page.locator("label.check").filter({ hasText: /I understand|I confirm|मैं समझ/i }).first();
  if (await confirm.count()) await confirm.click();
  await shot(page, "14-terms");
  await page.locator(".wizard-actions button.btn").filter({ hasText: /Next|Continue to members/i }).last().click();
  await page.waitForTimeout(900);
  await page.waitForSelector("text=/Add member/i", { timeout: 15000 });

  for (let i = 0; i < HANDS; i++) {
    const name = MEMBER_NAMES[i] || `Member ${i + 1}`;
    const phone = `9${String((Date.now() + i * 137) % 1e9).padStart(9, "0")}`;
    const card = page.locator(".member-source-card.tone-new, .member-source-card").first();
    await card.locator("input.field").nth(0).fill(name);
    await card.locator("input.field").nth(1).fill(phone);
    await card.locator("button.btn").filter({ hasText: /Add member/i }).first().click();
    await page.waitForTimeout(900);
  }
  await shot(page, "15-members-filled");
  await page.getByRole("button", { name: /Create bhishi|Create chit/i }).first().click();
  await page.waitForTimeout(3500);
  await page
    .waitForURL((u) => /\/chits\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/new"), { timeout: TIMEOUT })
    .catch(() => {});

  const url = page.url();
  const ok = /\/chits\/[^/]+$/.test(url) && !url.endsWith("/new");
  if (!ok) {
    const err = await page.locator(".due").allTextContents().then((a) => a.join(" | ")).catch(() => "");
    throw new Error(`Create failed url=${url} err=${err}`);
  }
  const chitId = url.split("/").pop();
  report.chitId = chitId;
  await shot(page, "16-created");
  await page.waitForTimeout(1500);

  await context.storageState({ path: STATE });
  const poster = path.join(OUT_SHOTS, "16-created.png");
  const raw = await finalizeClip(page, context, clip, "clip-create-end");
  await publishClip(clip, raw, poster, ffmpeg);
  return chitId;
}

async function recordAward(browser, chitId, ffmpeg) {
  const clip = CLIPS[1];
  const videoDir = path.join(TMP, clip.id);
  const context = await newRecordingContext(browser, videoDir);
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);

  await openChit(page, chitId);
  await clickTab(page, "Hapta");
  await shot(page, "20-hapta");

  // Prefer dedicated lucky-draw page (cinematic spin)
  const roll = page.getByRole("button", { name: /Roll lucky draw|Lucky draw|Open wheel|Spin|चिट्ठी/i });
  const openLd = page.locator("a, button").filter({ hasText: /Roll lucky draw|Open lucky|lucky draw/i }).first();
  if (await openLd.count()) {
    await openLd.click();
  } else if (await roll.count()) {
    await roll.first().click();
  } else {
    await softNav(page, `/chits/${chitId}/lucky-draw`);
  }
  await page.waitForTimeout(1200);
  await shot(page, "21-lucky-ready");

  const spinBtn = page.locator("button.ld-spin-btn, button.btn").filter({ hasText: /Spin|चाक फिरवा|फिरवा/i }).first();
  if (await spinBtn.count()) {
    await spinBtn.click();
    await page.waitForTimeout(5500); // SPIN_MS ~4800
    await shot(page, "22-lucky-landed");
  } else {
    report.failures.push({ clip: "award", step: "spin", error: "Spin button not found — trying allot" });
  }

  const confirm = page.locator("button.btn").filter({ hasText: /Allot|Confirm|Award|Save|अवार्ड/i }).first();
  if (await confirm.count() && (await confirm.isEnabled().catch(() => false))) {
    await confirm.click();
    await page.waitForTimeout(2000);
  }
  await dismissModals(page);
  await shot(page, "23-after-award");
  await page.waitForTimeout(800);

  const poster = path.join(OUT_SHOTS, "22-lucky-landed.png");
  const raw = await finalizeClip(page, context, clip, "clip-award-end");
  await publishClip(clip, raw, fs.existsSync(poster) ? poster : path.join(OUT_SHOTS, "23-after-award.png"), ffmpeg);
}

async function recordPayments(browser, chitId, ffmpeg) {
  const clip = CLIPS[2];
  const videoDir = path.join(TMP, clip.id);
  const context = await newRecordingContext(browser, videoDir);
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);

  await openChit(page, chitId);
  await clickTab(page, "Hapta");
  const collectStep = page.locator("button.month-step").filter({ hasText: /Collect/i }).first();
  if (await collectStep.count()) await collectStep.click();
  await page.waitForTimeout(600);
  await shot(page, "30-collect-start");

  const recordAll = page.getByRole("button", { name: /Record all payments/i });
  if (await recordAll.count() && (await recordAll.first().isEnabled().catch(() => false))) {
    await recordAll.first().click();
    await page.waitForTimeout(2800);
  } else {
    await clickTab(page, "Collections");
    const ra = page.getByRole("button", { name: /Record all payments/i });
    if (await ra.count()) {
      await ra.first().click();
      await page.waitForTimeout(2800);
    } else {
      for (let k = 0; k < HANDS + 1; k++) {
        const b = page.getByRole("button", { name: /^Record$/i });
        if (!(await b.count()) || (await b.first().isDisabled().catch(() => true))) break;
        await b.first().click();
        await page.waitForTimeout(400);
        const mb = page.locator(".modal button.btn, [role=dialog] button.btn").filter({
          hasText: /Save|Confirm|Record|Pay/i,
        });
        if (await mb.count()) await mb.last().click();
        await page.waitForTimeout(700);
      }
    }
  }
  await dismissModals(page);
  await shot(page, "31-after-collect");
  await page.waitForTimeout(1000);

  const poster = path.join(OUT_SHOTS, "31-after-collect.png");
  const raw = await finalizeClip(page, context, clip, "clip-payments-end");
  await publishClip(clip, raw, poster, ffmpeg);
}

async function recordReports(browser, chitId, ffmpeg) {
  const clip = CLIPS[3];
  const videoDir = path.join(TMP, clip.id);
  const context = await newRecordingContext(browser, videoDir);
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);

  await openChit(page, chitId);
  const ok = (await clickTab(page, "Settings")) || (await clickTab(page, "Reports"));
  if (!ok) report.failures.push({ clip: "reports", step: "tab", error: "Settings/Reports tab missing" });
  await page.waitForTimeout(800);
  await shot(page, "40-reports");

  const pdf = page.getByRole("button", { name: /PDF|ledger|Day book|Report|Share/i });
  if (await pdf.count()) {
    await pdf.first().click();
    await page.waitForTimeout(1500);
    await dismissModals(page);
  }
  await shot(page, "41-after-share");
  await page.waitForTimeout(800);

  const poster = path.join(OUT_SHOTS, "40-reports.png");
  const raw = await finalizeClip(page, context, clip, "clip-reports-end");
  await publishClip(clip, raw, poster, ffmpeg);
}

async function recordMembers(browser, chitId, ffmpeg) {
  const clip = CLIPS[4];
  const videoDir = path.join(TMP, clip.id);
  fs.rmSync(videoDir, { recursive: true, force: true });
  const context = await newRecordingContext(browser, videoDir);
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);

  await openChit(page, chitId);
  await clickTab(page, "Members");
  await page.waitForTimeout(1200);
  await shot(page, "50-members");
  // Scroll member list a bit for motion
  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(900);

  const poster = path.join(OUT_SHOTS, "50-members.png");
  const raw = await finalizeClip(page, context, clip, "clip-members-end");
  await publishClip(clip, raw, poster, ffmpeg);
}

async function recordCollections(browser, chitId, ffmpeg) {
  const clip = CLIPS[5];
  const videoDir = path.join(TMP, clip.id);
  fs.rmSync(videoDir, { recursive: true, force: true });
  const context = await newRecordingContext(browser, videoDir);
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);

  await openChit(page, chitId);
  await clickTab(page, "Collections");
  await page.waitForTimeout(900);
  await shot(page, "60-chit-collections");

  // Also show global Collect tab
  await hardHome(page);
  const collectNav = page.locator("a.bottom-tab, .bottom-tab").filter({ hasText: /^Collect$/i }).first();
  if (await collectNav.count()) {
    await collectNav.click();
    await page.waitForTimeout(1200);
    await shot(page, "61-global-collections");
  }
  await page.waitForTimeout(900);

  const poster = fs.existsSync(path.join(OUT_SHOTS, "61-global-collections.png"))
    ? path.join(OUT_SHOTS, "61-global-collections.png")
    : path.join(OUT_SHOTS, "60-chit-collections.png");
  const raw = await finalizeClip(page, context, clip, "clip-collections-end");
  await publishClip(clip, raw, poster, ffmpeg);
}

function writeManifest() {
  const manifest = CLIPS.map((c) => ({
    id: c.id,
    title: c.title,
    webm: `${c.file}.webm`,
    mp4: `${c.file}.mp4`,
    poster: `${c.file}.png`,
  }));
  fs.writeFileSync(path.join(OUT_DEMOS, "manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(OUT_EXPORTS, "manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(OUT_SHOTS, "report.json"), JSON.stringify(report, null, 2));
}

async function main() {
  let ffmpeg = findFfmpeg();
  // Wait briefly if download still extracting
  if (!ffmpeg) {
    for (let i = 0; i < 30 && !ffmpeg; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      ffmpeg = findFfmpeg();
    }
  }
  report.ffmpeg = ffmpeg || null;
  log(`ffmpeg: ${ffmpeg || "NOT FOUND"}`);

  const only = (process.env.DEMO_ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
  const existingChit = process.env.DEMO_CHIT_ID || null;

  const browser = await launchBrowser();
  try {
    await loginOnce(browser);
    let chitId = existingChit;
    const want = (id) => !only.length || only.includes(id);

    if (want("create") && !existingChit) {
      chitId = await recordCreate(browser, ffmpeg);
      log(`Created chit ${chitId}`);
    } else if (!chitId) {
      throw new Error("DEMO_CHIT_ID required when skipping create");
    } else {
      report.chitId = chitId;
      log(`Reusing chit ${chitId}`);
    }

    if (want("award")) await recordAward(browser, chitId, ffmpeg);
    if (want("payments")) await recordPayments(browser, chitId, ffmpeg);
    if (want("reports")) await recordReports(browser, chitId, ffmpeg);
    if (want("members")) await recordMembers(browser, chitId, ffmpeg);
    if (want("collections")) await recordCollections(browser, chitId, ffmpeg);
  } catch (e) {
    report.failures.push({ clip: "fatal", error: e.message || String(e) });
    console.error(e);
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
    writeManifest();
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT_SHOTS, "report.json"), JSON.stringify(report, null, 2));
    log("\n=== DONE ===");
    log(JSON.stringify({ chitId: report.chitId, clips: report.clips.map((c) => c.id), failures: report.failures }, null, 2));
  }
}

await main();
