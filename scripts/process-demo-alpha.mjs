/**
 * Remove outer slate backdrop via corner flood-fill.
 * Writes alpha WebM + opaque MP4 on page bg.
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const FF =
  process.env.FFMPEG ||
  "C:\\Users\\admin\\Bhishi Book\\tools\\ffmpeg\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe";
const DIR = path.resolve("public/landing/demos");
const WORK = path.resolve("scripts/ux-audit-out/landing-premium/alpha-work");
const PAGE = { r: 244, g: 247, b: 251 };

const files = fs
  .readdirSync(DIR)
  .filter((f) => /^0.*\.webm$/i.test(f))
  .sort();

function run(cmd, args, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    const t = setTimeout(() => {
      p.kill("SIGKILL");
      reject(new Error(`timeout: ${args.join(" ").slice(0, 120)}\n${err.slice(-400)}`));
    }, timeoutMs);
    p.stderr.on("data", (d) => {
      err += d.toString();
    });
    p.on("close", (code) => {
      clearTimeout(t);
      if (code === 0) resolve();
      else reject(new Error(err.slice(-600) || `exit ${code}`));
    });
  });
}

function floodClear(data, w, h, tol = 20) {
  const br = data[0];
  const bg = data[1];
  const bb = data[2];
  const near = (i) =>
    Math.abs(data[i] - br) <= tol &&
    Math.abs(data[i + 1] - bg) <= tol &&
    Math.abs(data[i + 2] - bb) <= tol;
  const visited = new Uint8Array(w * h);
  const q = new Int32Array(w * h);
  let qh = 0;
  let qt = 0;
  for (const [x, y] of [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ]) {
    const p = y * w + x;
    visited[p] = 1;
    q[qt++] = p;
  }
  while (qh < qt) {
    const p = q[qh++];
    const i = p * 4;
    if (!near(i)) continue;
    data[i + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    if (x + 1 < w) {
      const np = p + 1;
      if (!visited[np]) {
        visited[np] = 1;
        q[qt++] = np;
      }
    }
    if (x > 0) {
      const np = p - 1;
      if (!visited[np]) {
        visited[np] = 1;
        q[qt++] = np;
      }
    }
    if (y + 1 < h) {
      const np = p + w;
      if (!visited[np]) {
        visited[np] = 1;
        q[qt++] = np;
      }
    }
    if (y > 0) {
      const np = p - w;
      if (!visited[np]) {
        visited[np] = 1;
        q[qt++] = np;
      }
    }
  }
  return data;
}

async function processOne(name) {
  const base = name.replace(/\.webm$/i, "");
  const src = path.join(DIR, name);
  const alphaDir = path.join(WORK, base, "a");
  const opaqueDir = path.join(WORK, base, "o");
  fs.rmSync(path.join(WORK, base), { recursive: true, force: true });
  fs.mkdirSync(alphaDir, { recursive: true });
  fs.mkdirSync(opaqueDir, { recursive: true });

  console.log("Extract", base);
  await run(FF, ["-y", "-i", src, "-vf", "fps=12", path.join(alphaDir, "f-%04d.png")], 120000);

  const frames = fs.readdirSync(alphaDir).filter((f) => f.endsWith(".png")).sort();
  console.log("Flood", base, frames.length);

  let w = 0;
  let h = 0;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const fp = path.join(alphaDir, f);
    const { data, info } = await sharp(fp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    w = info.width;
    h = info.height;
    const cleared = floodClear(data, w, h, 20);
    const alphaPng = await sharp(cleared, { raw: { width: w, height: h, channels: 4 } })
      .png()
      .toBuffer();
    await fs.promises.writeFile(fp, alphaPng);
    const opaque = await sharp({
      create: { width: w, height: h, channels: 3, background: PAGE },
    })
      .composite([{ input: alphaPng, gravity: "centre" }])
      .png()
      .toBuffer();
    await fs.promises.writeFile(path.join(opaqueDir, f), opaque);
    if ((i + 1) % 40 === 0) console.log(" ", base, i + 1, "/", frames.length);
  }

  const mid = frames[Math.min(frames.length - 1, Math.floor(frames.length * 0.35))];
  await fs.promises.copyFile(path.join(opaqueDir, mid), path.join(DIR, `${base}.png`));

  console.log("Encode webm", base);
  await run(
    FF,
    [
      "-y",
      "-framerate",
      "12",
      "-i",
      path.join(alphaDir, "f-%04d.png"),
      "-c:v",
      "libvpx-vp9",
      "-pix_fmt",
      "yuva420p",
      "-b:v",
      "0",
      "-crf",
      "32",
      "-auto-alt-ref",
      "0",
      "-an",
      path.join(DIR, `${base}.webm`),
    ],
    180000,
  );

  console.log("Encode mp4", base);
  await run(
    FF,
    [
      "-y",
      "-framerate",
      "12",
      "-i",
      path.join(opaqueDir, "f-%04d.png"),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-movflags",
      "+faststart",
      "-an",
      path.join(DIR, `${base}.mp4`),
    ],
    120000,
  );

  console.log("OK", base, `${w}x${h}`, frames.length, "frames");
}

fs.mkdirSync(WORK, { recursive: true });
for (const f of files) {
  await processOne(f);
}
console.log("Done", files.length);
