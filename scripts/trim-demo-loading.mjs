/**
 * Trim leading SPA Loading... frames. Content = brand-blue header bar present.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const FF =
  process.env.FFMPEG ||
  "C:\\Users\\admin\\Bhishi Book\\tools\\ffmpeg\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe";
const DIR = path.resolve("public/landing/demos");
const WORK = path.resolve("scripts/ux-audit-out/landing-premium/trim-work");
const FPS = 5;

function run(args) {
  const r = spawnSync(FF, args, { encoding: "utf8", timeout: 120000, maxBuffer: 20 << 20 });
  if (r.status !== 0) throw new Error((r.stderr || "").slice(-500));
}

function probeDuration(file) {
  const r = spawnSync(
    FF.replace(/ffmpeg\.exe$/i, "ffprobe.exe"),
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", file],
    { encoding: "utf8" },
  );
  return parseFloat(r.stdout.trim()) || 0;
}

function isBrandBlue(r, g, b) {
  // Bhishi header ~ #2f6fed
  return r > 30 && r < 90 && g > 80 && g < 150 && b > 180 && b < 255 && b > r + 40 && b > g;
}

async function firstContentTime(webm) {
  const dir = path.join(WORK, path.basename(webm, ".webm"));
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  run(["-y", "-i", webm, "-vf", `fps=${FPS}`, path.join(dir, "f-%04d.png")]);
  const frames = fs.readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
  for (let i = 0; i < frames.length; i++) {
    const { data, info } = await sharp(path.join(dir, frames[i]))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    const ch = info.channels;
    // Sample a horizontal strip near top (app header)
    let blue = 0;
    let n = 0;
    const y0 = Math.floor(h * 0.02);
    const y1 = Math.floor(h * 0.08);
    for (let y = y0; y < y1; y += 2) {
      for (let x = Math.floor(w * 0.05); x < Math.floor(w * 0.95); x += 3) {
        const i0 = (y * w + x) * ch;
        if (isBrandBlue(data[i0], data[i0 + 1], data[i0 + 2])) blue += 1;
        n += 1;
      }
    }
    const ratio = blue / Math.max(n, 1);
    if (ratio > 0.25) {
      return Math.max(0, i / FPS - 0.05);
    }
  }
  return 0;
}

const files = fs.readdirSync(DIR).filter((f) => /^0.*\.webm$/i.test(f)).sort();
fs.mkdirSync(WORK, { recursive: true });

for (const name of files) {
  const webm = path.join(DIR, name);
  const base = name.replace(/\.webm$/i, "");
  const mp4 = path.join(DIR, `${base}.mp4`);
  const start = await firstContentTime(webm);
  const dur = probeDuration(webm);
  console.log(base, `start=${start.toFixed(2)}s / ${dur.toFixed(1)}s`);
  if (start < 0.4) {
    console.log("  keep as-is");
    continue;
  }
  const tmpWebm = path.join(WORK, `${base}-out.webm`);
  const tmpMp4 = path.join(WORK, `${base}-out.mp4`);
  run(["-y", "-ss", String(start), "-i", webm, "-c:v", "libvpx", "-b:v", "1.4M", "-auto-alt-ref", "0", "-an", tmpWebm]);
  run([
    "-y",
    "-ss",
    String(start),
    "-i",
    mp4,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "22",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    tmpMp4,
  ]);
  fs.copyFileSync(tmpWebm, webm);
  fs.copyFileSync(tmpMp4, mp4);
  fs.copyFileSync(tmpWebm, path.join("exports", `${base}.webm`));
  fs.copyFileSync(tmpMp4, path.join("exports", `${base}.mp4`));
  console.log("  trimmed →", (dur - start).toFixed(1), "s");
}
console.log("Done");
