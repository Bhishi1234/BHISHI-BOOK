import { jsPDF } from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";
import type { AuctionRecord, Chit, Payment } from "../types";
import {
  balanceAfterCycle,
  baseInstalment,
  collectedThisCycle,
  commissionEarned,
  cycleDue,
  cycleLedger,
  displayCycle,
  expectedLifeCollections,
  expectedThisCycle,
  handLabel,
  interestCollected,
  loanDetailRows,
  loanFaceAmount,
  loanEffectiveTenure,
  loanMonthlyInterest,
  loanRepaymentSchedule,
  memberBalance,
  memberLedgerRows,
  moneyIn,
  moneyOut,
  outstandingOf,
  paidInCycle,
  paymentStatus,
  treasuryOf,
} from "./chitMath";
import { FREQ_LABEL, MODE_LABEL, TYPE_LABEL } from "./format";
import { isNativeApp } from "./native";

type Doc = jsPDF & { lastAutoTable?: { finalY: number } };
type Cell = string | number;
type Rgb = [number, number, number];

const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 282;
const TABLE_BOTTOM = 274;

/** Premium report palette — matches attached Award / Ledger mockups */
const BLUE: Rgb = [37, 99, 235]; // #2563eb
const BLUE_DEEP: Rgb = [30, 64, 175]; // #1e40af
const BLUE_NAVY: Rgb = [30, 58, 138]; // #1e3a8a
const BLUE_SOFT: Rgb = [239, 246, 255]; // #eff6ff
const BLUE_SOFT_2: Rgb = [219, 234, 254]; // #dbeafe
const BLUE_MID: Rgb = [147, 197, 253]; // #93c5fd
const INK: Rgb = [15, 23, 42];
const MUTED: Rgb = [100, 116, 139];
const LINE: Rgb = [226, 232, 240];
const GREEN: Rgb = [16, 185, 129];
const GREEN_SOFT: Rgb = [209, 250, 229];
const PURPLE: Rgb = [139, 92, 246];
const PURPLE_SOFT: Rgb = [237, 233, 254];
const ORANGE: Rgb = [249, 115, 22];
const ORANGE_SOFT: Rgb = [255, 237, 213];
const ROSE: Rgb = [244, 63, 94];
const TEAL: Rgb = [20, 184, 166];
const WHITE: Rgb = [255, 255, 255];
const SLATE: Rgb = [248, 250, 252];

const ICON_PALETTE: { fg: Rgb; bg: Rgb }[] = [
  { fg: BLUE, bg: BLUE_SOFT_2 },
  { fg: GREEN, bg: GREEN_SOFT },
  { fg: PURPLE, bg: PURPLE_SOFT },
  { fg: ORANGE, bg: ORANGE_SOFT },
  { fg: TEAL, bg: [204, 251, 241] },
  { fg: BLUE_DEEP, bg: BLUE_SOFT },
  { fg: ROSE, bg: [255, 228, 230] },
  { fg: MUTED, bg: SLATE },
];

function money(n: number) {
  const v = Math.round(Number(n) || 0);
  const abs = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.abs(v));
  return v < 0 ? `-Rs ${abs}` : `Rs ${abs}`;
}

function safeName(s: string) {
  return (s || "report").replace(/[^\w\-]+/g, "_").slice(0, 60);
}

function generatedStamp() {
  return new Date().toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function downloadBlob(doc: jsPDF, filename: string, opts?: SavePdfOpts) {
  return savePdf(doc, filename, opts);
}

export type SavePdfOpts = {
  mode?: "download" | "share";
  title?: string;
  text?: string;
};

async function savePdf(doc: jsPDF, filename: string, opts?: SavePdfOpts) {
  const mode = opts?.mode ?? (isNativeApp() ? "share" : "download");
  const title = opts?.title || filename;
  const text = opts?.text;

  if (mode === "download") {
    doc.save(filename);
    return;
  }

  if (isNativeApp()) {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const { Share } = await import("@capacitor/share");
      const dataUrl = doc.output("datauristring");
      const base64 = dataUrl.split(",")[1] || "";
      const path = filename.replace(/[^\w.\-]+/g, "_");
      await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache });
      const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
      await Share.share({ title, text, url: uri, dialogTitle: title });
      return;
    } catch {
      doc.save(filename);
      return;
    }
  }

  try {
    const blob = doc.output("blob");
    const file = new File([blob], filename, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title, text });
      return;
    }
  } catch {
    /* cancelled or unsupported */
  }

  doc.save(filename);
}

function ensureY(doc: Doc, y: number, need = 40) {
  if (y + need > TABLE_BOTTOM) {
    doc.addPage();
    return 22;
  }
  return y;
}

/** Compact brand mark — blue disc with people silhouettes. */
function drawBrandMark(doc: Doc, x: number, y: number, size = 9) {
  doc.setFillColor(...BLUE);
  doc.circle(x + size / 2, y + size / 2, size / 2, "F");
  doc.setFillColor(...WHITE);
  const cx = x + size / 2;
  const cy = y + size / 2;
  doc.circle(cx - size * 0.16, cy - size * 0.08, size * 0.11, "F");
  doc.circle(cx + size * 0.16, cy - size * 0.08, size * 0.11, "F");
  doc.circle(cx, cy - size * 0.18, size * 0.1, "F");
  doc.ellipse(cx - size * 0.16, cy + size * 0.18, size * 0.14, size * 0.12, "F");
  doc.ellipse(cx + size * 0.16, cy + size * 0.18, size * 0.14, size * 0.12, "F");
  doc.ellipse(cx, cy + size * 0.12, size * 0.12, size * 0.1, "F");
}

function drawIconBubble(
  doc: Doc,
  x: number,
  y: number,
  size: number,
  palette: { fg: Rgb; bg: Rgb },
  glyph: string,
) {
  doc.setFillColor(...palette.bg);
  doc.circle(x + size / 2, y + size / 2, size / 2, "F");
  doc.setTextColor(...palette.fg);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size * 0.55);
  doc.text(glyph, x + size / 2, y + size / 2 + size * 0.18, { align: "center" });
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "normal");
}

/** Top brand row + generated timestamp (mockup header). */
function reportHeader(doc: Doc, stamp = generatedStamp()) {
  drawBrandMark(doc, MARGIN, 10, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLUE_NAVY);
  doc.text("Bhishi Circle", MARGIN + 13, 14.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("Save Together. Grow Together.", MARGIN + 13, 18.5);

  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("Report Generated On", PAGE_W - MARGIN, 13.5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  doc.setFontSize(8);
  doc.text(stamp, PAGE_W - MARGIN, 18.5, { align: "right" });

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 22.5, PAGE_W - MARGIN, 22.5);
  doc.setTextColor(...INK);
}

function quoteNote(doc: Doc, text: string, x: number, y: number) {
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...BLUE_MID);
  const lines = doc.splitTextToSize(text, 48);
  doc.text(lines, x, y, { align: "right", angle: 8 });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...INK);
}

/** Large title block with optional pills + meta + decorative quote. */
function reportTitleBlock(
  doc: Doc,
  opts: {
    title: string;
    subtitle?: string;
    description?: string;
    pills?: string[];
    meta?: string;
    quote?: string;
  },
) {
  let y = 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...BLUE_NAVY);
  doc.text(opts.title.slice(0, 42), MARGIN, y + 8);
  y += 12;

  if (opts.subtitle) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BLUE);
    doc.text(opts.subtitle.slice(0, 70), MARGIN, y + 4);
    y += 7;
  }

  if (opts.description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const lines = doc.splitTextToSize(opts.description, CONTENT_W - 55);
    doc.text(lines, MARGIN, y + 3);
    y += 3 + lines.length * 4;
  }

  if (opts.pills?.length) {
    let px = MARGIN;
    for (const pill of opts.pills.slice(0, 4)) {
      const w = doc.getTextWidth(pill) + 8;
      doc.setFillColor(...BLUE_SOFT);
      doc.roundedRect(px, y, w, 6.5, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...BLUE_DEEP);
      doc.text(pill, px + 4, y + 4.4);
      px += w + 3;
    }
    y += 10;
  }

  if (opts.meta) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(opts.meta, MARGIN, y + 2);
    y += 8;
  }

  if (opts.quote) {
    quoteNote(doc, opts.quote, PAGE_W - MARGIN, 34);
  }

  doc.setTextColor(...INK);
  return Math.max(y + 2, 48);
}

/** Full-bleed blue hero with icon + primary amount (Award mockup). */
function heroMetricCard(
  doc: Doc,
  y: number,
  opts: { eyebrow: string; label: string; amountLabel: string; amount: string; glyph?: string },
) {
  y = ensureY(doc, y, 34);
  doc.setFillColor(...BLUE);
  doc.roundedRect(MARGIN, y, CONTENT_W, 28, 4, 4, "F");
  // Soft highlight on the right
  doc.setFillColor(59, 130, 246);
  doc.circle(PAGE_W - MARGIN - 8, y + 26, 14, "F");
  doc.setFillColor(...BLUE);
  doc.roundedRect(MARGIN, y, CONTENT_W - 20, 28, 4, 4, "F");

  drawIconBubble(doc, MARGIN + 6, y + 5.5, 17, { fg: BLUE, bg: WHITE }, opts.glyph || "★");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...WHITE);
  doc.text(opts.eyebrow, MARGIN + 28, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(191, 219, 254);
  doc.text(opts.label.toUpperCase(), MARGIN + 28, y + 19);

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.line(MARGIN + 95, y + 6, MARGIN + 95, y + 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(219, 234, 254);
  doc.text(opts.amountLabel, PAGE_W - MARGIN - 8, y + 10, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...WHITE);
  doc.text(opts.amount, PAGE_W - MARGIN - 8, y + 21, { align: "right" });
  doc.setTextColor(...INK);
  return y + 34;
}

/** Soft KPI cards with colored icon bubbles. */
function kpiGrid(doc: Doc, y: number, items: { label: string; value: string; glyph?: string }[], cols = 4) {
  const gap = 3.5;
  const rows = Math.ceil(items.length / cols);
  const cardH = 22;
  const need = rows * (cardH + gap);
  y = ensureY(doc, y, need + 4);
  const colW = (CONTENT_W - gap * (cols - 1)) / cols;

  items.forEach((item, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = MARGIN + col * (colW + gap);
    const cy = y + row * (cardH + gap);
    const pal = ICON_PALETTE[i % ICON_PALETTE.length]!;

    doc.setFillColor(...WHITE);
    doc.roundedRect(x, cy, colW, cardH, 3, 3, "F");
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, cy, colW, cardH, 3, 3, "S");

    drawIconBubble(doc, x + 3.5, cy + 4.5, 8, pal, item.glyph || "•");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(item.label, x + 14, cy + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...BLUE_NAVY);
    doc.text(item.value, x + 14, cy + 16);
  });

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "normal");
  return y + need + 2;
}

function sectionBar(doc: Doc, y: number, title: string, right?: string, glyph = "☰") {
  y = ensureY(doc, y, 22);
  doc.setFillColor(...BLUE_SOFT);
  doc.roundedRect(MARGIN, y, CONTENT_W, 10, 2.5, 2.5, "F");
  drawIconBubble(doc, MARGIN + 2.5, y + 1.2, 7.5, { fg: BLUE, bg: WHITE }, glyph);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...BLUE_NAVY);
  doc.text(title, MARGIN + 13, y + 6.6);
  if (right) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BLUE);
    doc.text(right, PAGE_W - MARGIN - 3, y + 6.6, { align: "right" });
  }
  doc.setTextColor(...INK);
  return y + 14;
}

/** Key/value detail rows inside a soft bordered card. */
function detailCard(doc: Doc, y: number, rows: [string, string][], opts?: { title?: string; right?: string; glyph?: string }) {
  if (opts?.title) {
    y = sectionBar(doc, y, opts.title, opts.right, opts.glyph);
  }
  const rowH = 9;
  const boxH = rows.length * rowH + 4;
  y = ensureY(doc, y, boxH + 6);

  doc.setFillColor(...WHITE);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 3, 3, "F");
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 3, 3, "S");

  rows.forEach(([k, v], i) => {
    const ry = y + 2 + i * rowH;
    if (i > 0) {
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.25);
      doc.line(MARGIN + 4, ry, PAGE_W - MARGIN - 4, ry);
    }
    const pal = ICON_PALETTE[i % ICON_PALETTE.length]!;
    drawIconBubble(doc, MARGIN + 4, ry + 1.2, 5.5, pal, "·");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(k, MARGIN + 13, ry + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BLUE_NAVY);
    doc.text(String(v), PAGE_W - MARGIN - 5, ry + 5, { align: "right" });
  });

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "normal");
  return y + boxH + 6;
}

/** Two-column KV grid (Chit details). */
function detailGrid2(doc: Doc, y: number, rows: [string, string][], title = "Chit details", glyph = "⚙") {
  y = sectionBar(doc, y, title, undefined, glyph);
  const mid = Math.ceil(rows.length / 2);
  const left = rows.slice(0, mid);
  const right = rows.slice(mid);
  const rowH = 8.5;
  const rowsN = Math.max(left.length, right.length);
  const boxH = rowsN * rowH + 6;
  y = ensureY(doc, y, boxH + 4);

  doc.setFillColor(...WHITE);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 3, 3, "F");
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 3, 3, "S");

  const colW = CONTENT_W / 2;
  for (let i = 0; i < rowsN; i++) {
    const ry = y + 4 + i * rowH;
    if (i > 0) {
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.2);
      doc.line(MARGIN + 4, ry - 1.5, PAGE_W - MARGIN - 4, ry - 1.5);
    }
    for (const [col, list] of [[0, left], [1, right]] as const) {
      const pair = list[i];
      if (!pair) continue;
      const x0 = MARGIN + col * colW;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(pair[0], x0 + 5, ry + 3.5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...BLUE_NAVY);
      doc.text(pair[1], x0 + colW - 5, ry + 3.5, { align: "right" });
    }
  }

  doc.setTextColor(...INK);
  return y + boxH + 6;
}

function amountFooterBar(doc: Doc, y: number, label: string, amount: string, glyph = "₹") {
  y = ensureY(doc, y, 28);
  doc.setFillColor(...BLUE);
  doc.roundedRect(MARGIN, y, CONTENT_W, 18, 3.5, 3.5, "F");
  drawIconBubble(doc, MARGIN + 5, y + 3.5, 11, { fg: BLUE, bg: WHITE }, glyph);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text(label, MARGIN + 20, y + 11);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.35);
  const splitX = PAGE_W - MARGIN - 55;
  doc.line(splitX, y + 4, splitX, y + 14);
  doc.setFontSize(14);
  doc.text(amount, PAGE_W - MARGIN - 6, y + 12, { align: "right" });
  doc.setTextColor(...INK);
  return y + 24;
}

function netPositionCard(doc: Doc, y: number, label: string, hint: string, amount: string) {
  y = ensureY(doc, y, 28);
  doc.setFillColor(...BLUE_SOFT);
  doc.roundedRect(MARGIN, y, CONTENT_W, 20, 3.5, 3.5, "F");
  doc.setDrawColor(...BLUE_MID);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, CONTENT_W, 20, 3.5, 3.5, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE_NAVY);
  doc.text(label, MARGIN + 6, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(hint, MARGIN + 6, y + 14.5);

  doc.setFillColor(...WHITE);
  doc.roundedRect(PAGE_W - MARGIN - 42, y + 3.5, 36, 13, 2.5, 2.5, "F");
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.5);
  doc.roundedRect(PAGE_W - MARGIN - 42, y + 3.5, 36, 13, 2.5, 2.5, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLUE);
  doc.text(amount, PAGE_W - MARGIN - 24, y + 12, { align: "center" });
  doc.setTextColor(...INK);
  return y + 26;
}

function disclaimerBox(doc: Doc, y: number, text: string) {
  y = ensureY(doc, y, 22);
  doc.setFillColor(...BLUE_SOFT);
  doc.roundedRect(MARGIN, y, CONTENT_W, 16, 2.5, 2.5, "F");
  drawIconBubble(doc, MARGIN + 3, y + 4, 8, { fg: BLUE, bg: WHITE }, "i");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...BLUE_DEEP);
  const lines = doc.splitTextToSize(text, CONTENT_W - 18);
  doc.text(lines, MARGIN + 14, y + 6.5);
  doc.setTextColor(...INK);
  return y + 20;
}

function barChart(
  doc: Doc,
  y: number,
  title: string,
  rows: { label: string; value: number }[],
) {
  if (!rows.length) return y;
  y = sectionBar(doc, y, title, undefined, "▦");
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  const barMax = 100;
  const boxTop = y;
  const boxH = Math.min(rows.length, 12) * 9 + 6;
  y = ensureY(doc, y, boxH + 4);

  doc.setFillColor(...WHITE);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 3, 3, "F");
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 3, 3, "S");

  let ry = y + 5;
  for (const row of rows.slice(0, 12)) {
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(row.label.slice(0, 22), MARGIN + 4, ry + 3.5);
    const w = (Math.abs(row.value) / max) * barMax;
    doc.setFillColor(...BLUE_SOFT_2);
    doc.roundedRect(MARGIN + 48, ry - 1, barMax, 5.5, 1.5, 1.5, "F");
    doc.setFillColor(...(row.value < 0 ? ROSE : BLUE));
    doc.roundedRect(MARGIN + 48, ry - 1, Math.max(2, w), 5.5, 1.5, 1.5, "F");
    doc.setTextColor(...BLUE_NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(money(row.value), MARGIN + 48 + barMax + 3, ry + 3.5);
    ry += 9;
  }
  void boxTop;
  doc.setTextColor(...INK);
  return y + boxH + 6;
}

const baseTableStyles = {
  font: "helvetica" as const,
  fontSize: 8,
  cellPadding: { top: 2.8, right: 2.4, bottom: 2.8, left: 2.4 },
  textColor: INK,
  lineColor: LINE,
  lineWidth: 0.15,
  valign: "middle" as const,
  overflow: "linebreak" as const,
};

const baseHeadStyles = {
  fillColor: BLUE_DEEP,
  textColor: WHITE,
  fontStyle: "bold" as const,
  fontSize: 8,
  cellPadding: { top: 3.4, right: 2.4, bottom: 3.4, left: 2.4 },
  halign: "left" as const,
};

function drawDataTable(
  doc: Doc,
  y: number,
  opts: {
    title: string;
    head: string[][];
    body: Cell[][];
    fontSize?: number;
    columnStyles?: UserOptions["columnStyles"];
    hint?: string;
    glyph?: string;
  },
) {
  y = sectionBar(doc, y, opts.title, undefined, opts.glyph || "☰");
  if (opts.hint) {
    doc.setFontSize(7.2);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(opts.hint, MARGIN, y, { maxWidth: CONTENT_W });
    y += 6;
  }

  if (!opts.body.length) {
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("No rows for this section.", MARGIN, y + 2);
    return y + 10;
  }

  autoTable(doc, {
    startY: y,
    head: opts.head,
    body: opts.body,
    margin: { left: MARGIN, right: MARGIN, top: 24, bottom: PAGE_H - TABLE_BOTTOM },
    styles: { ...baseTableStyles, fontSize: opts.fontSize ?? 8 },
    headStyles: baseHeadStyles,
    alternateRowStyles: { fillColor: BLUE_SOFT },
    bodyStyles: { fillColor: WHITE },
    showHead: "everyPage",
    rowPageBreak: "auto",
    theme: "grid",
    columnStyles: opts.columnStyles,
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFillColor(...BLUE_SOFT);
        doc.roundedRect(MARGIN, 12, CONTENT_W, 9, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...BLUE_NAVY);
        doc.text(`${opts.title}  ·  continued`, MARGIN + 4, 18);
        doc.setTextColor(...INK);
      }
    },
  });

  return (doc.lastAutoTable?.finalY || y) + 10;
}

function footer(doc: Doc, disclaimer?: string) {
  const pages = doc.getNumberOfPages();
  const year = new Date().getFullYear();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (i > 1) {
      drawBrandMark(doc, MARGIN, 6, 7);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...BLUE_NAVY);
      doc.text("Bhishi Circle", MARGIN + 9, 11);
    }

    if (disclaimer && i === pages) {
      const y = FOOTER_Y - 18;
      doc.setFillColor(...BLUE_SOFT);
      doc.roundedRect(MARGIN, y, CONTENT_W, 12, 2, 2, "F");
      drawIconBubble(doc, MARGIN + 2.5, y + 2, 7, { fg: BLUE, bg: WHITE }, "i");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...BLUE_DEEP);
      const lines = doc.splitTextToSize(disclaimer, CONTENT_W - 16);
      doc.text(lines.slice(0, 2), MARGIN + 12, y + 5);
    }

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, FOOTER_Y, PAGE_W - MARGIN, FOOTER_Y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`© Bhishi Circle ${year}`, MARGIN, FOOTER_Y + 5);
    doc.text(`Page ${i} of ${pages}`, PAGE_W / 2, FOOTER_Y + 5, { align: "center" });
    drawBrandMark(doc, PAGE_W - MARGIN - 22, FOOTER_Y + 1, 6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLUE);
    doc.setFontSize(7);
    doc.text("Bhishi Circle", PAGE_W - MARGIN, FOOTER_Y + 5.5, { align: "right" });
    doc.setTextColor(...INK);
  }
}

function startReport(doc: Doc) {
  reportHeader(doc);
}

/**
 * Full chit books PDF — premium ledger layout matching mockup.
 */
export function downloadChitReportPdf(chit: Chit, names: Record<string, string>, opts?: SavePdfOpts) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as Doc;
  const cycle = displayCycle(chit);
  const typeLabel = TYPE_LABEL[chit.type] || chit.type;
  startReport(doc);

  let y = reportTitleBlock(doc, {
    title: chit.name,
    pills: [typeLabel, chit.status, FREQ_LABEL[chit.frequency] || chit.frequency],
    meta: `Started ${new Date(chit.startDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} · Month ${cycle} of ${chit.duration} · ${chit.members.length} of ${chit.membersCount} slots`,
    quote: "Strong Communities\nBuild Wealth.",
  });

  y = kpiGrid(doc, y, [
    { label: "Pot / face", value: money(chit.pot), glyph: "₹" },
    { label: "Instalment", value: money(baseInstalment(chit)), glyph: "⇄" },
    { label: "Cash on hand", value: money(treasuryOf(chit)), glyph: "◉" },
    { label: "Outstanding", value: money(outstandingOf(chit)), glyph: "!" },
    { label: "Money in", value: money(moneyIn(chit)), glyph: "↓" },
    { label: "Money out", value: money(moneyOut(chit)), glyph: "↑" },
    { label: "Commission earned", value: money(commissionEarned(chit)), glyph: "%" },
    {
      label: chit.type === "loan" ? "Interest collected" : "Life expected",
      value: chit.type === "loan" ? money(interestCollected(chit)) : money(expectedLifeCollections(chit)),
      glyph: "★",
    },
  ]);

  y = detailGrid2(doc, y, [
    ["Bhishi / chit", chit.name],
    ["Type", typeLabel],
    ["Award method", chit.type === "fixed" ? "Fixed order" : typeLabel],
    ["Month", `Month ${cycle} of ${chit.duration}`],
    ["Pot / face", money(chit.pot)],
    ["Instalment", money(baseInstalment(chit))],
    ["Status", chit.status],
    ["Hands", `${chit.members.length} / ${chit.membersCount}`],
  ], "Chit details", "☰");

  const ledger = memberLedgerRows(chit);
  y = drawDataTable(doc, y, {
    title: chit.type === "loan" ? "Member ledger (deposits only)" : "Member ledger (per hand)",
    glyph: "☰",
    head: [[
      "Hand",
      chit.type === "loan" ? "Deposits" : "Paid in",
      chit.type === "loan" ? "Loan out" : "Received",
      chit.type === "loan" ? "Interest paid" : "Dividends",
      "Net",
    ]],
    body: ledger.map((row) => {
      const hands = chit.members.filter((m) => m.customerId === row.customerId).length;
      const label = handLabel(names[row.customerId] || "Member", row.slot, hands);
      return [
        label + (row.prizedCycle ? ` (M${row.prizedCycle})` : ""),
        money(row.paid),
        money(chit.type === "loan" ? row.loanOut : row.received),
        money(chit.type === "loan" ? row.interestPaid : row.dividend),
        money(row.net),
      ];
    }),
    columnStyles: {
      1: { halign: "right" },
      2: {halign: "right" },
      3: {halign: "right" },
      4: {halign: "right", fontStyle: "bold" },
    },
  });

  const netTotal = ledger.reduce((s, r) => s + r.net, 0);
  y = netPositionCard(
    doc,
    y,
    "Net position by hand",
    "Sum of paid − received (− dividends) across all seats",
    money(netTotal),
  );

  y = barChart(
    doc,
    y,
    "Net by hand",
    ledger.map((row) => ({
      label: handLabel(names[row.customerId] || "?", row.slot, 2),
      value: row.net,
    })),
  );

  const cycleRows: Cell[][] = [];
  for (let c = 1; c <= Math.max(cycle, chit.duration); c++) {
    if (c > cycle && chit.status === "running") break;
    const led = cycleLedger(chit, c);
    cycleRows.push([
      c,
      money(led.collected),
      money(led.payout),
      money(led.commission),
      money(led.dividend || led.dividendPaid),
      money(balanceAfterCycle(chit, c)),
    ]);
  }
  y = drawDataTable(doc, y, {
    title: "Month-by-month summary",
    glyph: "▦",
    head: [["Month", "Collected", "Payouts", "Commission", "Dividend / cut", "Till after"]],
    body: cycleRows,
    columnStyles: {
      0: {halign: "center", cellWidth: 16 },
      1: {halign: "right" },
      2: {halign: "right" },
      3: {halign: "right" },
      4: {halign: "right" },
      5: {halign: "right", fontStyle: "bold" },
    },
  });

  y = barChart(
    doc,
    y,
    "Collections by month",
    cycleRows.map((_, idx) => {
      const c = Number(cycleRows[idx]![0]);
      return { label: `Month ${c}`, value: cycleLedger(chit, c).collected };
    }),
  );

  const pays = [...chit.payments].sort((a, b) => a.cycle - b.cycle || a.date.localeCompare(b.date));
  y = drawDataTable(doc, y, {
    title: "Collection register",
    glyph: "☰",
    hint: "All receipts recorded for this bhishi, ordered by month then date.",
    head: [["#", "Date", "Month", "Member / hand", "Mode", "Kind", "Amount"]],
    body: pays.map((p, i): Cell[] => {
      const hands = chit.members.filter((m) => m.customerId === p.memberId).length;
      const who = p.slot != null
        ? handLabel(names[p.memberId] || p.memberId, p.slot, hands)
        : (names[p.memberId] || p.memberId);
      return [
        i + 1,
        new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        p.cycle,
        who,
        MODE_LABEL[p.mode || "cash"] || String(p.mode || "cash"),
        p.kind,
        money(p.amount),
      ];
    }),
    fontSize: 7.5,
    columnStyles: {
      0: { cellWidth: 10,halign: "center" },
      2: {halign: "center", cellWidth: 14 },
      6: {halign: "right", fontStyle: "bold" },
    },
  });

  y = drawDataTable(doc, y, {
    title: "Payouts & awards",
    glyph: "★",
    head: [["Month", "Winner", "Method", "Bid / face", "Paid out", "Commission", "Discount", "Dividend"]],
    body: chit.auctions.map((a) => {
      const hands = chit.members.filter((m) => m.customerId === a.winnerId).length;
      const who = a.winnerSlot != null
        ? handLabel(names[a.winnerId] || a.winnerId, a.winnerSlot, hands)
        : names[a.winnerId] || a.winnerId;
      return [
        a.cycle,
        who,
        a.method,
        money(a.bid),
        money(a.payout),
        money(a.commission || 0),
        money(a.discount || 0),
        money(a.dividend || 0),
      ];
    }),
    fontSize: 7.5,
    columnStyles: {
      0: {halign: "center", cellWidth: 14 },
      3: {halign: "right" },
      4: {halign: "right", fontStyle: "bold" },
      5: {halign: "right" },
      6: {halign: "right" },
      7: {halign: "right" },
    },
  });

  if (chit.type === "loan" && loanDetailRows(chit).length) {
    y = drawDataTable(doc, y, {
      title: "Loan schedule",
      glyph: "₹",
      head: [["Borrower", "Month", "Face", "Interest cut", "Net paid", "Repay window", "Share / mo"]],
      body: loanDetailRows(chit).map((row) => {
        const hands = chit.members.filter((m) => m.customerId === row.memberId).length;
        return [
          handLabel(names[row.memberId] || row.memberId, row.slot ?? 1, hands),
          row.cycle,
          money(row.face),
          money(row.upfrontInterest),
          money(row.netPaidOut),
          `M${row.repayFrom}–M${row.repayTo} (${row.tenure} mo)`,
          `${money(row.principalSharePerMonth)} + ${money(row.interestPerMonth)} int`,
        ];
      }),
      fontSize: 7.5,
      columnStyles: {
        1: {halign: "center", cellWidth: 14 },
        2: {halign: "right" },
        3: {halign: "right" },
        4: {halign: "right", fontStyle: "bold" },
      },
    });
  }

  y = drawDataTable(doc, y, {
    title: "Balances by hand",
    glyph: "=",
    head: [["Hand", "Total due", "Total paid", "Outstanding", "This month due", "This month paid"]],
    body: chit.members.map((m) => {
      const bal = memberBalance(chit, m.customerId, m.slot);
      const hands = chit.members.filter((x) => x.customerId === m.customerId).length;
      return [
        handLabel(names[m.customerId] || m.customerId, m.slot, hands),
        money(bal.due),
        money(bal.paid),
        money(Math.max(0, bal.outstanding)),
        money(cycleDue(chit, m.customerId, cycle, m.slot)),
        money(paidInCycle(chit, m.customerId, cycle, m.slot)),
      ];
    }),
    columnStyles: {
      1: {halign: "right" },
      2: {halign: "right" },
      3: {halign: "right", fontStyle: "bold" },
      4: {halign: "right" },
      5: {halign: "right" },
    },
  });

  footer(
    doc,
    "This chit ledger is generated by Bhishi Circle for the group organiser. It is not a tax invoice or legal bond.",
  );
  downloadBlob(doc, `${safeName(chit.name)}-ledger-report.pdf`, opts);
}

/** Single receipt PDF — premium slip. */
export function downloadReceiptPdf(
  chit: Chit,
  payment: Payment,
  names: Record<string, string>,
  organiserName?: string,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as Doc;
  startReport(doc);

  const hands = chit.members.filter((m) => m.customerId === payment.memberId).length;
  const memberLabel = payment.slot != null
    ? handLabel(names[payment.memberId] || payment.memberId, payment.slot, hands)
    : names[payment.memberId] || payment.memberId;

  let y = reportTitleBlock(doc, {
    title: "Payment Receipt",
    subtitle: `${chit.name} · Month ${payment.cycle}`,
    description: "Official collection slip for your bhishi records.",
    quote: "Every hapta\nbuilds trust.",
  });

  y = heroMetricCard(doc, y, {
    eyebrow: "Received",
    label: "Payment receipt",
    amountLabel: "Amount received",
    amount: money(payment.amount),
    glyph: "✓",
  });

  y = kpiGrid(doc, y, [
    { label: "Month", value: `${payment.cycle} / ${chit.duration}`, glyph: "#" },
    { label: "Mode", value: MODE_LABEL[payment.mode || "cash"] || String(payment.mode || "cash"), glyph: "⇄" },
    { label: "Kind", value: payment.kind, glyph: "★" },
    {
      label: "Date",
      value: new Date(payment.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      glyph: "◷",
    },
  ]);

  const rows: [string, string][] = [
    ["Received from", memberLabel],
    ["Bhishi / chit", chit.name],
    ["Type", TYPE_LABEL[chit.type] || chit.type],
    ["Cycle / month", `Month ${payment.cycle} of ${chit.duration}`],
    ["Payment mode", MODE_LABEL[payment.mode || "cash"] || payment.mode || "cash"],
    ["Kind", payment.kind],
    ["Receipt id", payment.id],
  ];
  if (organiserName) rows.push(["Recorded by", organiserName]);

  y = detailCard(doc, y, rows, { title: "Receipt details", right: memberLabel, glyph: "☰" });
  y = amountFooterBar(doc, y, "Amount received", money(payment.amount), "₹");
  y = disclaimerBox(
    doc,
    y,
    "This is a computer-generated receipt from Bhishi Circle for record-keeping. It is not a tax invoice.",
  );

  footer(doc);
  downloadBlob(doc, `${safeName(chit.name)}-receipt-${payment.cycle}-${safeName(memberLabel)}.pdf`);
}

/** Day-book / collection register PDF. */
export function downloadDayBookPdf(
  title: string,
  receipts: Array<Payment & { chitName: string }>,
  names: Record<string, string>,
  summary: { collected: number; byMode: Record<string, number> },
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as Doc;
  startReport(doc);

  let y = reportTitleBlock(doc, {
    title: "Collection Register",
    subtitle: "Day book",
    description: title,
    quote: "Clear books.\nClear trust.",
  });

  y = heroMetricCard(doc, y, {
    eyebrow: "Collected",
    label: "Day book total",
    amountLabel: "Total collected",
    amount: money(summary.collected),
    glyph: "₹",
  });

  y = kpiGrid(doc, y, [
    { label: "Receipts", value: String(receipts.length), glyph: "#" },
    { label: "Cash", value: money(summary.byMode.cash || 0), glyph: "◉" },
    { label: "UPI", value: money(summary.byMode.upi || 0), glyph: "⇄" },
    { label: "Bank", value: money(summary.byMode.bank || 0), glyph: "☰" },
  ]);

  const byChit = new Map<string, number>();
  for (const p of receipts) {
    byChit.set(p.chitName, (byChit.get(p.chitName) || 0) + p.amount);
  }
  y = barChart(
    doc,
    y,
    "Collections by chit",
    [...byChit.entries()].map(([label, value]) => ({ label, value })),
  );

  y = drawDataTable(doc, y, {
    title: "Receipt listing",
    glyph: "☰",
    head: [["#", "Date", "Chit", "Member", "Month", "Mode", "Amount"]],
    body: [...receipts]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((p, i): Cell[] => [
        i + 1,
        new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        p.chitName,
        names[p.memberId] || p.memberId,
        p.cycle,
        MODE_LABEL[p.mode || "cash"] || String(p.mode || "cash"),
        money(p.amount),
      ]),
    fontSize: 7.5,
    columnStyles: {
      0: { cellWidth: 10,halign: "center" },
      4: {halign: "center", cellWidth: 14 },
      6: {halign: "right", fontStyle: "bold" },
    },
  });

  footer(
    doc,
    "This day book is generated by Bhishi Circle for organiser records. It is not a tax invoice or legal bond.",
  );
  downloadBlob(doc, `${safeName(title)}-day-book.pdf`);
}

export { downloadChitCsv } from "./exportCsv";

/** Current-month dues snapshot. */
export function downloadMonthDuesPdf(chit: Chit, names: Record<string, string>) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as Doc;
  const cycle = displayCycle(chit);
  startReport(doc);

  let y = reportTitleBlock(doc, {
    title: chit.name,
    subtitle: `Month ${cycle} collection sheet`,
    pills: [TYPE_LABEL[chit.type] || chit.type, FREQ_LABEL[chit.frequency] || chit.frequency],
    meta: `${chit.members.length} hands · Expected vs collected this hapta`,
    quote: "Collect with\nclarity.",
  });

  y = kpiGrid(doc, y, [
    { label: "Expected", value: money(expectedThisCycle(chit)), glyph: "★" },
    { label: "Collected", value: money(collectedThisCycle(chit)), glyph: "✓" },
    { label: "Outstanding", value: money(outstandingOf(chit)), glyph: "!" },
    { label: "Cash on hand", value: money(treasuryOf(chit)), glyph: "◉" },
  ]);

  y = drawDataTable(doc, y, {
    title: "Dues by hand",
    glyph: "☰",
    head: [["Hand", "Due", "Paid", "Balance", "Status"]],
    body: chit.members.map((m) => {
      const d = cycleDue(chit, m.customerId, cycle, m.slot);
      const paid = paidInCycle(chit, m.customerId, cycle, m.slot);
      const st = paymentStatus(chit, m.customerId, cycle, m.slot);
      const hands = chit.members.filter((x) => x.customerId === m.customerId).length;
      return [
        handLabel(names[m.customerId] || m.customerId, m.slot, hands),
        money(d),
        money(paid),
        money(Math.max(0, d - paid)),
        st,
      ];
    }),
    fontSize: 9,
    columnStyles: {
      1: {halign: "right" },
      2: {halign: "right" },
      3: {halign: "right", fontStyle: "bold" },
      4: {halign: "center" },
    },
  });

  footer(doc, "This dues sheet is generated by Bhishi Circle for organiser records. It is not a tax invoice.");
  downloadBlob(doc, `${safeName(chit.name)}-month-${cycle}-dues.pdf`);
}

/** Loan disbursal + repayment schedule. */
export function downloadLoanReportPdf(
  chit: Chit,
  auction: AuctionRecord,
  names: Record<string, string>,
  organiserName?: string,
  opts?: SavePdfOpts,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as Doc;
  const face = loanFaceAmount(auction);
  const tenure = loanEffectiveTenure(chit, auction.cycle);
  const rate = auction.interestRate ?? chit.interestRate ?? 0;
  const interestMo = loanMonthlyInterest(chit, face, rate);
  const slot = auction.winnerSlot ?? 1;
  const hands = chit.members.filter((m) => m.customerId === auction.winnerId).length;
  const borrower = handLabel(names[auction.winnerId] || auction.winnerId, slot, hands);
  const schedule = loanRepaymentSchedule(chit, auction);
  const totalInterest =
    Math.max(0, Number(auction.discount) || 0)
    + schedule.reduce((s, r) => s + r.interest, 0);
  const totalRepay = schedule.reduce((s, r) => s + r.principal + r.interest, 0);
  const totalDueWithDeposit = schedule.reduce((s, r) => s + r.total, 0);

  startReport(doc);
  let y = reportTitleBlock(doc, {
    title: "Loan Disbursal Report",
    subtitle: `Monthly loan summary – ${borrower}`,
    description: "Face amount, interest cut, net paid out, and full repayment schedule.",
    quote: "Fair loans.\nClear books.",
  });

  y = heroMetricCard(doc, y, {
    eyebrow: "Loan",
    label: "Borrower receives",
    amountLabel: "Net paid out",
    amount: money(auction.payout),
    glyph: "₹",
  });

  y = kpiGrid(doc, y, [
    { label: "Face loan", value: money(face), glyph: "₹" },
    { label: "Interest cut now", value: money(auction.discount || 0), glyph: "%" },
    { label: "Borrower receives", value: money(auction.payout), glyph: "↓" },
    { label: "Commission", value: money(auction.commission || 0), glyph: "★" },
  ]);

  const detailRows: [string, string][] = [
    ["Borrower", borrower],
    ["Bhishi / chit", chit.name],
    ["Loan month", `Month ${auction.cycle} of ${chit.duration}`],
    ["Repayment window", `Month ${auction.cycle + 1} – ${auction.cycle + tenure} (${tenure} mo)`],
    ["Hapta (deposit)", money(baseInstalment(chit))],
    ["Interest / month", `${money(interestMo)} (${rate}% of face)`],
    ["Principal / month", money(Math.ceil(face / tenure))],
    ["Total interest (life)", money(totalInterest)],
    ["Principal + interest to repay", money(totalRepay)],
    ["All dues with hapta (schedule)", money(totalDueWithDeposit)],
  ];
  if (organiserName) detailRows.push(["Recorded by", organiserName]);

  y = detailCard(doc, y, detailRows, { title: "Loan details", right: borrower, glyph: "☰" });
  y = amountFooterBar(doc, y, "Amount handed to borrower", money(auction.payout), "₹");

  y = drawDataTable(doc, y, {
    title: "Repayment schedule",
    glyph: "▦",
    hint: "Each month: hapta + interest (if due) + principal share. First repay month skips interest when already cut at disbursal.",
    head: [["#", "Month", "Hapta", "Interest", "Principal", "Total due", "Note"]],
    body: schedule.map((r): Cell[] => [
      r.monthIndex,
      `M${r.cycle}`,
      money(r.deposit),
      money(r.interest),
      money(r.principal),
      money(r.total),
      r.note || "—",
    ]),
    fontSize: 7.5,
    columnStyles: {
      0: { cellWidth: 10,halign: "center" },
      1: { cellWidth: 16,halign: "center" },
      2: {halign: "right" },
      3: {halign: "right" },
      4: {halign: "right" },
      5: {halign: "right", fontStyle: "bold" },
      6: { cellWidth: 42 },
    },
  });

  footer(
    doc,
    "This loan report is generated by Bhishi Circle for the bhishi group and the borrower. It is not a tax invoice or legal bond.",
  );
  downloadBlob(doc, `${safeName(chit.name)}-loan-${safeName(borrower)}-m${auction.cycle}.pdf`, opts);
}

/** Award / payout report — matches attached premium mockup. */
export function downloadAwardReportPdf(
  chit: Chit,
  auction: AuctionRecord,
  names: Record<string, string>,
  organiserName?: string,
  opts?: SavePdfOpts,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as Doc;
  const slot = auction.winnerSlot ?? 1;
  const hands = chit.members.filter((m) => m.customerId === auction.winnerId).length;
  const winner = handLabel(names[auction.winnerId] || auction.winnerId, slot, hands);
  const methodLabel =
    auction.method === "lucky_draw"
      ? "Lucky draw"
      : auction.method === "auction"
        ? "Auction"
        : auction.method === "settlement"
          ? "Settlement"
          : "Fixed / committee";

  startReport(doc);
  let y = reportTitleBlock(doc, {
    title: "Award / Payout Report",
    subtitle: "Monthly Payout Summary – Handpicked for You",
    description: "Clear record of this month’s award for the winner and the circle.",
    quote: "Your Contribution Builds\na Stronger Community.",
  });

  y = heroMetricCard(doc, y, {
    eyebrow: "Award",
    label: "Award payout",
    amountLabel: "Total Payout Amount",
    amount: money(auction.payout),
    glyph: "★",
  });

  y = kpiGrid(doc, y, [
    { label: "Award face", value: money(auction.bid), glyph: "₹" },
    { label: "Discount / kasr", value: money(auction.discount || 0), glyph: "%" },
    { label: "Winner receives", value: money(auction.payout), glyph: "↓" },
    { label: "Commission", value: money(auction.commission || 0), glyph: "★" },
  ]);

  const detailRows: [string, string][] = [
    ["Winner", winner],
    ["Award Type", methodLabel],
    ["Month", `Month ${auction.cycle} of ${chit.duration}`],
    ["Bhishi / chit", chit.name],
    ["Type", TYPE_LABEL[chit.type] || chit.type],
    ["Pot / face", money(chit.pot)],
    ["Instalment (hapta)", money(baseInstalment(chit))],
  ];
  if ((auction.dividend || 0) > 0) {
    detailRows.push(["Dividend / adjustment", money(auction.dividend || 0)]);
  }
  if (organiserName) detailRows.push(["Recorded by", organiserName]);

  y = detailCard(doc, y, detailRows, {
    title: "Award Details",
    right: winner,
    glyph: "☰",
  });

  y = amountFooterBar(doc, y, "Award Payout (You will receive)", money(auction.payout), "₹");
  y = disclaimerBox(
    doc,
    y,
    "This award report is generated by Bhishi Circle for the bahishi group and the winner. It is not a tax invoice or legal bond.",
  );

  footer(doc);
  downloadBlob(doc, `${safeName(chit.name)}-award-${safeName(winner)}-m${auction.cycle}.pdf`, opts);
}
