import { isNativeApp } from "./native";

export type LuckyDrawSharePayload = {
  chitName: string;
  cycle: number;
  duration: number;
  winnerName: string;
  payout: number;
  entrants: string[];
  drawnAt?: Date;
};

const WHEEL_PALETTE = [
  "#2f6fed",
  "#0f9f6e",
  "#0d9488",
  "#4f46e5",
  "#0284c8",
  "#059669",
  "#6366f1",
  "#0891b2",
  "#1d4ed8",
  "#047857",
];

function money(n: number) {
  const v = Math.round(Number(n) || 0);
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v)}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Build a WhatsApp-friendly result card (no DOM screenshot — lightweight canvas). */
export function renderLuckyDrawShareCard(payload: LuckyDrawSharePayload): HTMLCanvasElement {
  const W = 1080;
  const H = 1480;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Soft page background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#eef3ff");
  bg.addColorStop(0.45, "#f7f9fc");
  bg.addColorStop(1, "#eef7f3");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Top brand bar
  ctx.fillStyle = "#2f6fed";
  roundRect(ctx, 64, 56, W - 128, 72, 20);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 34px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Bhishi Circle", W / 2, 104);

  // Title
  ctx.fillStyle = "#0f172a";
  ctx.font = "800 54px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText("Lucky Draw Result", W / 2, 200);
  ctx.fillStyle = "#64748b";
  ctx.font = "500 28px 'Plus Jakarta Sans', system-ui, sans-serif";
  const sub = `${payload.chitName} — Round ${payload.cycle}`;
  ctx.fillText(sub.length > 42 ? `${sub.slice(0, 40)}…` : sub, W / 2, 248);

  // Wheel
  const cx = W / 2;
  const cy = 560;
  const R = 280;
  const n = Math.max(payload.entrants.length, 1);
  const seg = (Math.PI * 2) / n;
  const winnerIdx = Math.max(
    0,
    payload.entrants.findIndex((e) => e === payload.winnerName),
  );
  // Orient so winner sits under top pointer
  const start = -Math.PI / 2 - (winnerIdx + 0.5) * seg;

  for (let i = 0; i < n; i++) {
    const a0 = start + i * seg;
    const a1 = a0 + seg;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a0, a1);
    ctx.closePath();
    ctx.fillStyle = WHEEL_PALETTE[i % WHEEL_PALETTE.length]!;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Label
    const mid = a0 + seg / 2;
    const labelR = R * 0.62;
    const lx = cx + Math.cos(mid) * labelR;
    const ly = cy + Math.sin(mid) * labelR;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(mid + Math.PI / 2);
    ctx.fillStyle = "#fff";
    ctx.font = `700 ${n > 10 ? 18 : n > 6 ? 22 : 26}px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = payload.entrants[i] || `P${i + 1}`;
    const short = label.length > (n > 8 ? 8 : 12) ? `${label.slice(0, n > 8 ? 7 : 11)}…` : label;
    ctx.fillText(short, 0, 0);
    ctx.restore();
  }

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, R + 8, 0, Math.PI * 2);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 14;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, R + 8, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(47,111,237,0.25)";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Pointer — tip points down into the wheel
  ctx.fillStyle = "#e11d48";
  ctx.beginPath();
  ctx.moveTo(cx, cy - R + 10);
  ctx.lineTo(cx - 20, cy - R - 26);
  ctx.lineTo(cx + 20, cy - R - 26);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - R - 26, 9, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.strokeStyle = "#e11d48";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Hub
  ctx.beginPath();
  ctx.arc(cx, cy, 48, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.strokeStyle = "#2f6fed";
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = "#2f6fed";
  ctx.font = "800 28px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BC", cx, cy + 2);

  // Winner card
  const cardY = 900;
  roundRect(ctx, 80, cardY, W - 160, 280, 28);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.strokeStyle = "rgba(47,111,237,0.12)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Blue accent strip
  ctx.fillStyle = "#2f6fed";
  roundRect(ctx, 80, cardY, W - 160, 10, 0);
  ctx.fill();

  ctx.fillStyle = "#64748b";
  ctx.font = "700 26px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("WINNER", W / 2, cardY + 64);

  ctx.fillStyle = "#0f172a";
  ctx.font = "800 56px 'Plus Jakarta Sans', system-ui, sans-serif";
  const wName = payload.winnerName.length > 22 ? `${payload.winnerName.slice(0, 20)}…` : payload.winnerName;
  ctx.fillText(wName, W / 2, cardY + 130);

  ctx.fillStyle = "#0f9f6e";
  ctx.font = "800 48px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(money(payload.payout), W / 2, cardY + 200);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 24px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(`Month ${payload.cycle} of ${payload.duration}`, W / 2, cardY + 248);

  // Timestamp + verified
  const when = payload.drawnAt || new Date();
  const stamp = when.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  ctx.fillStyle = "#64748b";
  ctx.font = "500 24px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(stamp, W / 2, 1240);

  roundRect(ctx, W / 2 - 260, 1280, 520, 64, 32);
  ctx.fillStyle = "#ecfdf5";
  ctx.fill();
  ctx.strokeStyle = "#a7f3d0";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#047857";
  ctx.font = "700 26px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText("Verified random draw · Bhishi Circle", W / 2, 1322);

  return canvas;
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not create image"))),
      "image/jpeg",
      0.92,
    );
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result || "");
      resolve(s.includes(",") ? s.split(",")[1]! : s);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function shareLuckyDrawResult(payload: LuckyDrawSharePayload) {
  const canvas = renderLuckyDrawShareCard(payload);
  const blob = await canvasToBlob(canvas);
  const fileName = `lucky-draw-${payload.chitName.replace(/[^\w\-]+/g, "_").slice(0, 40)}-r${payload.cycle}.jpg`;
  const caption = [
    `Lucky Draw Result — ${payload.chitName}`,
    `Round ${payload.cycle}: *${payload.winnerName}* wins ${money(payload.payout)}`,
    "",
    "Verified random draw · Bhishi Circle",
  ].join("\n");

  if (isNativeApp()) {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const { Share } = await import("@capacitor/share");
      const base64 = await blobToBase64(blob);
      const path = fileName;
      await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache });
      const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
      await Share.share({
        title: "Lucky Draw Result",
        text: caption,
        url: uri,
        dialogTitle: "Share lucky draw result",
      });
      return;
    } catch {
      /* fall through */
    }
  }

  const file = new File([blob], fileName, { type: "image/jpeg" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "Lucky Draw Result",
        text: caption,
      });
      return;
    } catch {
      /* cancelled or unsupported */
    }
  }

  // Fallback: download image
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export { WHEEL_PALETTE };
