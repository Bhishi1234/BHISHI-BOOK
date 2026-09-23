import sharp from "sharp";
import fs from "fs";

const srcPath = "Logo - Without Background.png";
const outDir = "public/brand";
fs.mkdirSync(outDir, { recursive: true });

const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

// --- Strip near-black background, but KEEP dark-grey circular plate inside bowl ---
// Background is pure black (~0). Bowl plate is dark charcoal (~20-50) OR also black.
// Strategy: only clear pixels that are near-black AND outside the main content after a
// first-pass content mask, OR: clear pure black (<12) everywhere, then for charcoal
// only clear if connected to image border (exterior flood).

const out = Buffer.from(data);
const exterior = new Uint8Array(width * height);
const q = [];
function isNearBlack(o) {
  const r = data[o],
    g = data[o + 1],
    b = data[o + 2],
    a = data[o + 3];
  if (a < 8) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max < 48 && max - min < 16;
}
function push(x, y) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const i = y * width + x;
  if (exterior[i]) return;
  if (!isNearBlack(i * channels)) return;
  exterior[i] = 1;
  q.push(i);
}
for (let x = 0; x < width; x++) {
  push(x, 0);
  push(x, height - 1);
}
for (let y = 0; y < height; y++) {
  push(0, y);
  push(width - 1, y);
}
while (q.length) {
  const i = q.shift();
  const x = i % width;
  const y = (i / width) | 0;
  push(x + 1, y);
  push(x - 1, y);
  push(x, y + 1);
  push(x, y - 1);
}

let cleared = 0,
  keptDark = 0;
for (let i = 0; i < width * height; i++) {
  const o = i * channels;
  if (exterior[i]) {
    out[o + 3] = 0;
    cleared++;
  } else if (isNearBlack(o)) {
    // interior dark plate — keep slightly visible dark so hole exists, or make transparent
    // We'll make it transparent for clean logo, but mark as "hole" separately
    out[o + 3] = 0;
    keptDark++;
  }
}
console.log({ cleared, keptDark });

// Soft fringe cleanup on remaining near-black
for (let i = 0; i < width * height; i++) {
  const o = i * channels;
  if (out[o + 3] < 8) continue;
  const max = Math.max(out[o], out[o + 1], out[o + 2]);
  const min = Math.min(out[o], out[o + 1], out[o + 2]);
  if (max < 55 && max - min < 14) {
    out[o + 3] = Math.max(0, Math.min(out[o + 3], Math.round(max * 4)));
  }
}

let minX = width,
  minY = height,
  maxX = 0,
  maxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (out[(y * width + x) * channels + 3] > 20) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
}

const pad = 6;
const fx = Math.max(0, minX - pad);
const fy = Math.max(0, minY - pad);
const fw = Math.min(width - 1, maxX + pad) - fx + 1;
const fh = Math.min(height - 1, maxY + pad) - fy + 1;
await sharp(out, { raw: { width, height, channels } })
  .extract({ left: fx, top: fy, width: fw, height: fh })
  .png()
  .toFile(`${outDir}/bhishi-circle-logo.png`);

const contentH = maxY - minY + 1;
let gapY = -1;
for (let y = minY + Math.floor(contentH * 0.32); y < minY + Math.floor(contentH * 0.72); y++) {
  let opaque = 0;
  for (let x = minX; x <= maxX; x++) {
    if (out[(y * width + x) * channels + 3] > 35) opaque++;
  }
  if (opaque < (maxX - minX + 1) * 0.015) {
    let ok = true;
    for (let yy = y; yy < y + 8 && yy <= maxY; yy++) {
      let o2 = 0;
      for (let x = minX; x <= maxX; x++) {
        if (out[(yy * width + x) * channels + 3] > 35) o2++;
      }
      if (o2 >= (maxX - minX + 1) * 0.015) {
        ok = false;
        break;
      }
    }
    if (ok) {
      gapY = y;
      break;
    }
  }
}
if (gapY < 0) gapY = minY + Math.floor(contentH * 0.52);

let mMinX = width,
  mMinY = height,
  mMaxX = 0,
  mMaxY = 0;
for (let y = minY; y < gapY; y++) {
  for (let x = minX; x <= maxX; x++) {
    if (out[(y * width + x) * channels + 3] > 20) {
      if (x < mMinX) mMinX = x;
      if (y < mMinY) mMinY = y;
      if (x > mMaxX) mMaxX = x;
      if (y > mMaxY) mMaxY = y;
    }
  }
}
const mw = mMaxX - mMinX + 1;
const mh = mMaxY - mMinY + 1;
const side = Math.max(mw, mh);
const mpad = Math.ceil(side * 0.08);
const canvas = side + mpad * 2;
const mark = Buffer.alloc(canvas * canvas * 4, 0);
for (let y = 0; y < mh; y++) {
  for (let x = 0; x < mw; x++) {
    const srcO = ((mMinY + y) * width + (mMinX + x)) * channels;
    const dx = mpad + Math.floor((side - mw) / 2) + x;
    const dy = mpad + Math.floor((side - mh) / 2) + y;
    const dstO = (dy * canvas + dx) * 4;
    mark[dstO] = out[srcO];
    mark[dstO + 1] = out[srcO + 1];
    mark[dstO + 2] = out[srcO + 2];
    mark[dstO + 3] = out[srcO + 3];
  }
}
await sharp(mark, { raw: { width: canvas, height: canvas, channels: 4 } })
  .png()
  .toFile(`${outDir}/bhishi-mark.png`);

// --- Separate people: flood from transparent, then flood B from opaque touching exterior transparent.
// People = remaining opaque islands (not reachable as B).
const isB = new Uint8Array(canvas * canvas);
const bq = [];
function touchTransparent(x, y) {
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const nx = x + dx,
      ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= canvas || ny >= canvas) return true;
    if (mark[(ny * canvas + nx) * 4 + 3] < 40) return true;
  }
  return false;
}
function seedB(x, y) {
  if (x < 0 || y < 0 || x >= canvas || y >= canvas) return;
  const i = y * canvas + x;
  if (isB[i]) return;
  if (mark[i * 4 + 3] < 80) return; // stricter so AA bridges don't connect people
  isB[i] = 1;
  bq.push(i);
}

// Seed B only from opaque pixels that touch exterior (image-edge-connected transparent)
const extT = new Uint8Array(canvas * canvas);
const tq = [];
function seedT(x, y) {
  if (x < 0 || y < 0 || x >= canvas || y >= canvas) return;
  const i = y * canvas + x;
  if (extT[i]) return;
  if (mark[i * 4 + 3] >= 40) return;
  extT[i] = 1;
  tq.push(i);
}
for (let x = 0; x < canvas; x++) {
  seedT(x, 0);
  seedT(x, canvas - 1);
}
for (let y = 0; y < canvas; y++) {
  seedT(0, y);
  seedT(canvas - 1, y);
}
while (tq.length) {
  const i = tq.shift();
  const x = i % canvas;
  const y = (i / canvas) | 0;
  seedT(x + 1, y);
  seedT(x - 1, y);
  seedT(x, y + 1);
  seedT(x, y - 1);
  // When exterior transparent touches an opaque neighbor, that neighbor is B rim
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    seedB(x + dx, y + dy);
  }
}
while (bq.length) {
  const i = bq.shift();
  const x = i % canvas;
  const y = (i / canvas) | 0;
  // 4-connected with high alpha to avoid AA bridges into people
  seedB(x + 1, y);
  seedB(x - 1, y);
  seedB(x, y + 1);
  seedB(x, y - 1);
}

// Expand B slightly into low-alpha fringe of the letter
for (let pass = 0; pass < 3; pass++) {
  const add = [];
  for (let y = 1; y < canvas - 1; y++) {
    for (let x = 1; x < canvas - 1; x++) {
      const i = y * canvas + x;
      if (isB[i]) continue;
      if (mark[i * 4 + 3] < 18) continue;
      let near = false;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        if (isB[(y + dy) * canvas + (x + dx)]) {
          near = true;
          break;
        }
      }
      if (near) add.push(i);
    }
  }
  for (const i of add) isB[i] = 1;
}

let bCount = 0,
  pCount = 0;
const phone = Buffer.alloc(canvas * canvas * 4, 0);
for (let i = 0; i < canvas * canvas; i++) {
  const o = i * 4;
  const a = mark[o + 3];
  if (a < 18) continue;
  phone[o + 3] = a;
  if (isB[i]) {
    phone[o] = 255;
    phone[o + 1] = 255;
    phone[o + 2] = 255;
    bCount++;
  } else {
    // light grey people (readable on blue header)
    phone[o] = 220;
    phone[o + 1] = 224;
    phone[o + 2] = 230;
    pCount++;
  }
}
console.log({ bCount, pCount, canvas });

await sharp(phone, { raw: { width: canvas, height: canvas, channels: 4 } })
  .png()
  .toFile(`${outDir}/bhishi-mark-white.png`);

// Debug overlay
const dbg = Buffer.alloc(canvas * canvas * 4);
for (let i = 0; i < canvas * canvas; i++) {
  const o = i * 4;
  if (mark[o + 3] < 18) continue;
  dbg[o + 3] = 255;
  if (isB[i]) {
    dbg[o] = 255;
    dbg[o + 1] = 255;
    dbg[o + 2] = 255;
  } else {
    dbg[o] = 255;
    dbg[o + 1] = 80;
    dbg[o + 2] = 80;
  }
}
await sharp(dbg, { raw: { width: canvas, height: canvas, channels: 4 } })
  .png()
  .toFile(`${outDir}/_debug-people.png`);

console.log("done");
