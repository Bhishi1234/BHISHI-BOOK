/**
 * Re-publish landing demos from journey raw Playwright webms
 * (restores clips overwritten by later processing).
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(".");
const FF =
  process.env.FFMPEG ||
  path.join(ROOT, "tools/ffmpeg/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe");
const TMP = path.join(ROOT, "scripts/ux-audit-out/landing-journey/_tmp-video");
const SHOTS = path.join(ROOT, "scripts/ux-audit-out/landing-journey");
const OUT = path.join(ROOT, "public/landing/demos");
const EXPORTS = path.join(ROOT, "exports");
const W = 390;
const H = 844;
const BG = "0xf4f7fb";

function newestWebm(dir) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".webm"))
    .map((f) => {
      const p = path.join(dir, f);
      return { p, m: fs.statSync(p).mtimeMs, size: fs.statSync(p).size };
    })
    .sort((a, b) => b.m - a.m);
  // Prefer ~right duration sizes: skip outliers by taking newest under 2.5MB unless only option
  return (files.find((f) => f.size < 2_500_000) || files[0]).p;
}

const clips = [
  {
    id: "create",
    file: "01-how-to-create-bhishi",
    poster: "15-members-filled.png",
    // Prefer ~21s takes: pick by scanning durations below
  },
  { id: "award", file: "02-how-to-award-bhishi", poster: "22-lucky-landed.png" },
  { id: "payments", file: "03-how-to-record-payments", poster: "31-after-collect.png" },
  { id: "reports", file: "04-how-to-share-reports", poster: "40-reports.png" },
  { id: "members", file: "05-how-to-see-members", poster: "50-members.png" },
  { id: "collections", file: "06-how-to-see-collections", poster: "61-global-collections.png" },
];

function probeDuration(file) {
  const r = spawnSync(
    FF.replace(/ffmpeg\.exe$/i, "ffprobe.exe"),
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", file],
    { encoding: "utf8" },
  );
  return parseFloat(r.stdout.trim()) || 0;
}

function pickRaw(id) {
  const dir = path.join(TMP, id);
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".webm"))
    .map((f) => {
      const p = path.join(dir, f);
      return { p, d: probeDuration(p), m: fs.statSync(p).mtimeMs };
    });
  // Prefer durations in sensible demo range
  const ranges = {
    create: [18, 28],
    award: [14, 20],
    payments: [8, 14],
    reports: [8, 14],
    members: [8, 14],
    collections: [8, 14],
  };
  const [lo, hi] = ranges[id] || [5, 40];
  const inRange = files.filter((f) => f.d >= lo && f.d <= hi).sort((a, b) => b.m - a.m);
  if (inRange.length) return inRange[0].p;
  return files.sort((a, b) => b.m - a.m)[0].p;
}

function run(args) {
  const r = spawnSync(FF, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error((r.stderr || "").slice(-500));
}

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(EXPORTS, { recursive: true });

const vf = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:${BG},fps=20,format=yuv420p`;

for (const clip of clips) {
  const raw = pickRaw(clip.id);
  const dur = probeDuration(raw);
  console.log(clip.id, "←", path.basename(raw), `${dur.toFixed(1)}s`);
  const webm = path.join(OUT, `${clip.file}.webm`);
  const mp4 = path.join(OUT, `${clip.file}.mp4`);
  const png = path.join(OUT, `${clip.file}.png`);
  const posterSrc = path.join(SHOTS, clip.poster);

  run(["-y", "-i", raw, "-vf", vf, "-c:v", "libvpx", "-b:v", "1.4M", "-auto-alt-ref", "0", "-an", webm]);
  run([
    "-y",
    "-i",
    raw,
    "-vf",
    vf,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "22",
    "-movflags",
    "+faststart",
    "-an",
    mp4,
  ]);
  if (fs.existsSync(posterSrc)) {
    run([
      "-y",
      "-i",
      posterSrc,
      "-vf",
      `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:${BG}`,
      png,
    ]);
  } else {
    run(["-y", "-ss", "1", "-i", webm, "-frames:v", "1", png]);
  }

  for (const ext of ["webm", "mp4", "png"]) {
    fs.copyFileSync(path.join(OUT, `${clip.file}.${ext}`), path.join(EXPORTS, `${clip.file}.${ext}`));
  }
}

const manifest = clips.map((c) => ({
  id: c.id === "create" ? "create" : c.id,
  title: c.file.replace(/^\d+-/, "").replace(/-/g, " "),
  webm: `${c.file}.webm`,
  mp4: `${c.file}.mp4`,
  poster: `${c.file}.png`,
}));
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(EXPORTS, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("Republished", clips.length, "clips at", `${W}x${H}`);
