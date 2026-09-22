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

const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 284;
const TABLE_BOTTOM = 278;
const CONTENT_START_Y = 60;

/** App brand blue — matches --blue / chit-hero */
const BLUE: [number, number, number] = [47, 111, 237];
const BLUE_SOFT: [number, number, number] = [237, 243, 255];
const BLUE_MID: [number, number, number] = [191, 214, 255];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const LINE: [number, number, number] = [226, 232, 240];
const GREEN: [number, number, number] = [15, 159, 110];
const ROSE: [number, number, number] = [225, 29, 72];
const TEAL: [number, number, number] = [13, 148, 136];
const WHITE: [number, number, number] = [255, 255, 255];
const SLATE: [number, number, number] = [248, 250, 252];

function money(n: number) {
  const v = Math.round(Number(n) || 0);
  const abs = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.abs(v));
  return v < 0 ? `-Rs ${abs}` : `Rs ${abs}`;
}

function safeName(s: string) {
  return (s || "report").replace(/[^\w\-]+/g, "_").slice(0, 60);
}

function downloadBlob(doc: jsPDF, filename: string) {
  void savePdf(doc, filename);
}

async function savePdf(doc: jsPDF, filename: string) {
  if (!isNativeApp()) {
    doc.save(filename);
    return;
  }
  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const dataUrl = doc.output("datauristring");
    const base64 = dataUrl.split(",")[1] || "";
    const path = filename.replace(/[^\w.\-]+/g, "_");
    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Cache,
    });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    await Share.share({
      title: filename,
      url: uri,
      dialogTitle: "Share Bhishi Circle report",
    });
  } catch {
    doc.save(filename);
  }
}

/** Soft page wash — page 1 keeps hero; later pages get a light top band. */
function paintPageChrome(doc: Doc, page: number) {
  if (page === 1) return;
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, PAGE_W, 12, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Bhishi Circle", MARGIN, 8);
  doc.setTextColor(...INK);
}

function brandHeader(doc: Doc, title: string, subtitle: string) {
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, PAGE_W, 16, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Bhishi Circle", MARGIN, 10.5);

  const heroY = 22;
  doc.setFillColor(...BLUE);
  doc.roundedRect(MARGIN, heroY, CONTENT_W, 30, 3.5, 3.5, "F");
  // Accent edge
  doc.setFillColor(33, 88, 210);
  doc.roundedRect(MARGIN, heroY, 4, 30, 3.5, 3.5, "F");
  doc.setFillColor(...BLUE);
  doc.rect(MARGIN + 2, heroY, 4, 30, "F");

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title.slice(0, 46), MARGIN + 10, heroY + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(220, 232, 255);
  doc.text(subtitle.slice(0, 72), MARGIN + 10, heroY + 22.5);
  doc.setTextColor(...INK);
}

function footer(doc: Doc) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    paintPageChrome(doc, i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.35);
    doc.line(MARGIN, FOOTER_Y, PAGE_W - MARGIN, FOOTER_Y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `Generated ${new Date().toLocaleString("en-IN")}`,
      MARGIN,
      FOOTER_Y + 5,
    );
    doc.text(
      `Page ${i} of ${pages}`,
      PAGE_W / 2,
      FOOTER_Y + 5,
      { align: "center" },
    );
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLUE);
    doc.text("Bhishi Circle", PAGE_W - MARGIN, FOOTER_Y + 5, { align: "right" });
    doc.setTextColor(...INK);
  }
}

function sectionTitle(doc: Doc, y: number, text: string) {
  y = ensureY(doc, y, 28);
  doc.setFillColor(...BLUE_SOFT);
  doc.roundedRect(MARGIN, y - 4, CONTENT_W, 11, 2, 2, "F");
  doc.setDrawColor(...BLUE_MID);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y - 4, MARGIN, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  doc.text(text, MARGIN + 5, y + 3.5);
  doc.setTextColor(...INK);
  return y + 12;
}

function docTitle(doc: Doc, y: number, title: string, meta: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(title, MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(meta, MARGIN, y);
  doc.setTextColor(...INK);
  return y + 9;
}

function kpiRow(doc: Doc, y: number, items: { label: string; value: string }[]) {
  y = ensureY(doc, y, 28);
  const gap = 3;
  const colW = (CONTENT_W - gap * (items.length - 1)) / items.length;
  items.forEach((item, i) => {
    const x = MARGIN + i * (colW + gap);
    doc.setFillColor(...WHITE);
    doc.roundedRect(x, y, colW, 20, 2.5, 2.5, "F");
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.35);
    doc.roundedRect(x, y, colW, 20, 2.5, 2.5, "S");
    doc.setFillColor(...BLUE);
    doc.rect(x, y, 1.6, 20, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(item.label, x + 5, y + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(item.value, x + 5, y + 15);
    doc.setFont("helvetica", "normal");
  });
  return y + 26;
}

function barChart(
  doc: Doc,
  y: number,
  title: string,
  rows: { label: string; value: number }[],
) {
  if (!rows.length) return y;
  y = sectionTitle(doc, y, title);
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  const barMax = 88;
  for (const row of rows.slice(0, 12)) {
    y = ensureY(doc, y, 12);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(row.label.slice(0, 26), MARGIN, y + 3.5);
    const w = (Math.abs(row.value) / max) * barMax;
    doc.setFillColor(...SLATE);
    doc.roundedRect(MARGIN + 52, y - 1.5, barMax, 6, 1.5, 1.5, "F");
    if (row.value < 0) doc.setFillColor(...ROSE);
    else doc.setFillColor(...TEAL);
    doc.roundedRect(MARGIN + 52, y - 1.5, Math.max(2, w), 6, 1.5, 1.5, "F");
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(money(row.value), MARGIN + 52 + barMax + 4, y + 3.5);
    doc.setFont("helvetica", "normal");
    y += 9;
  }
  return y + 4;
}

function ensureY(doc: Doc, y: number, need = 40) {
  if (y + need > TABLE_BOTTOM) {
    doc.addPage();
    return 20;
  }
  return y;
}

function drawKvBlock(doc: Doc, y: number, rows: [string, string][]) {
  for (const [k, v] of rows) {
    y = ensureY(doc, y, 14);
    doc.setFillColor(...SLATE);
    doc.roundedRect(MARGIN, y - 3.5, CONTENT_W, 10, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(k, MARGIN + 4, y + 2.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.setFontSize(9.5);
    doc.text(String(v), MARGIN + 60, y + 2.5);
    doc.setFont("helvetica", "normal");
    y += 11.5;
  }
  return y;
}

function amountBanner(doc: Doc, y: number, label: string, amount: string) {
  y = ensureY(doc, y, 30);
  doc.setFillColor(...BLUE);
  doc.roundedRect(MARGIN, y, CONTENT_W, 24, 3.5, 3.5, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 232, 255);
  doc.text(label, MARGIN + 7, y + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...WHITE);
  doc.text(amount, PAGE_W - MARGIN - 7, y + 16, { align: "right" });
  doc.setTextColor(...INK);
  return y + 32;
}

const baseTableStyles = {
  font: "helvetica" as const,
  fontSize: 8,
  cellPadding: { top: 2.6, right: 2.4, bottom: 2.6, left: 2.4 },
  textColor: INK,
  lineColor: LINE,
  lineWidth: 0.2,
  valign: "middle" as const,
  overflow: "linebreak" as const,
};

const baseHeadStyles = {
  fillColor: BLUE,
  textColor: WHITE,
  fontStyle: "bold" as const,
  fontSize: 8,
  cellPadding: { top: 3.2, right: 2.4, bottom: 3.2, left: 2.4 },
  halign: "left" as const,
};

/**
 * Draw a titled data table with:
 * - column headers on every page
 * - section title (and “continued”) on wrap pages
 */
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
  },
) {
  if (opts.hint) {
    y = sectionTitle(doc, y, opts.title);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(opts.hint, MARGIN, y, { maxWidth: CONTENT_W });
    y += 7;
  } else {
    y = sectionTitle(doc, y, opts.title);
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
    margin: { left: MARGIN, right: MARGIN, top: 26, bottom: PAGE_H - TABLE_BOTTOM },
    styles: {
      ...baseTableStyles,
      fontSize: opts.fontSize ?? 8,
    },
    headStyles: baseHeadStyles,
    alternateRowStyles: { fillColor: BLUE_SOFT },
    bodyStyles: { fillColor: WHITE },
    showHead: "everyPage",
    rowPageBreak: "auto",
    theme: "grid",
    columnStyles: opts.columnStyles,
    didDrawPage: (data) => {
      // Table-relative page 2+: repeat the section title above the column headers
      if (data.pageNumber > 1) {
        doc.setFillColor(...BLUE_SOFT);
        doc.roundedRect(MARGIN, 14, CONTENT_W, 9, 1.5, 1.5, "F");
        doc.setDrawColor(...BLUE);
        doc.setLineWidth(0.6);
        doc.line(MARGIN, 14, MARGIN, 23);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...BLUE);
        doc.text(`${opts.title}  ·  continued`, MARGIN + 4, 20);
        doc.setTextColor(...INK);
      }
    },
  });

  return (doc.lastAutoTable?.finalY || y) + 12;
}

/**
 * Full chit books PDF: cover KPIs, member ledger, cycle summary,
 * collections, payouts, loan details, charts.
 */
export function downloadChitReportPdf(chit: Chit, names: Record<string, string>) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as Doc;
  const cycle = displayCycle(chit);
  const typeLabel = TYPE_LABEL[chit.type] || chit.type;
  const subtitle = `${typeLabel} · ${chit.status} · ${FREQ_LABEL[chit.frequency] || chit.frequency}`;

  brandHeader(doc, chit.name, subtitle);

  let y = CONTENT_START_Y;
  y = docTitle(
    doc,
    y,
    "Chit ledger report",
    `Started ${new Date(chit.startDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} · Month ${cycle} of ${chit.duration} · ${chit.members.length} of ${chit.membersCount} slots`,
  );

  y = kpiRow(doc, y, [
    { label: "Pot / face", value: money(chit.pot) },
    { label: "Instalment", value: money(baseInstalment(chit)) },
    { label: "Cash on hand", value: money(treasuryOf(chit)) },
    { label: "Outstanding", value: money(outstandingOf(chit)) },
  ]);
  y = kpiRow(doc, y, [
    { label: "Money in", value: money(moneyIn(chit)) },
    { label: "Money out", value: money(moneyOut(chit)) },
    { label: "Commission earned", value: money(commissionEarned(chit)) },
    {
      label: chit.type === "loan" ? "Interest collected" : "Life expected",
      value: chit.type === "loan" ? money(interestCollected(chit)) : money(expectedLifeCollections(chit)),
    },
  ]);

  const ledger = memberLedgerRows(chit);
  y = drawDataTable(doc, y, {
    title: chit.type === "loan"
      ? "Member ledger (deposits only)"
      : "Member ledger (per hand)",
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
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right", fontStyle: "bold" },
    },
  });

  y = barChart(
    doc,
    y,
    "Net position by hand",
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
    head: [["Month", "Collected", "Payouts", "Commission", "Dividend / cut", "Till after"]],
    body: cycleRows,
    columnStyles: {
      0: { halign: "center", cellWidth: 16 },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right", fontStyle: "bold" },
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
      0: { cellWidth: 10, halign: "center" },
      2: { halign: "center", cellWidth: 14 },
      6: { halign: "right", fontStyle: "bold" },
    },
  });

  y = drawDataTable(doc, y, {
    title: "Payouts & awards",
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
      0: { halign: "center", cellWidth: 14 },
      3: { halign: "right" },
      4: { halign: "right", fontStyle: "bold" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
  });

  if (chit.type === "loan" && loanDetailRows(chit).length) {
    y = drawDataTable(doc, y, {
      title: "Loan schedule",
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
        1: { halign: "center", cellWidth: 14 },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right", fontStyle: "bold" },
      },
    });
  }

  y = drawDataTable(doc, y, {
    title: "Balances by hand",
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
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right", fontStyle: "bold" },
      4: { halign: "right" },
      5: {halign: "right" },
    },
  });

  footer(doc);
  downloadBlob(doc, `${safeName(chit.name)}-ledger-report.pdf`);
}

/** Single receipt PDF — printable slip matching app blue cards. */
export function downloadReceiptPdf(
  chit: Chit,
  payment: Payment,
  names: Record<string, string>,
  organiserName?: string,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as Doc;
  brandHeader(doc, chit.name, "Payment receipt");

  let y = CONTENT_START_Y;
  doc.setFillColor(...GREEN);
  doc.roundedRect(MARGIN, y, 34, 8, 2, 2, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PAID", MARGIN + 17, y + 5.5, { align: "center" });
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Receipt · ${payment.id}`, MARGIN + 38, y + 5.5);
  doc.text(
    new Date(payment.date).toLocaleString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    PAGE_W - MARGIN,
    y + 5.5,
    { align: "right" },
  );
  y += 16;

  const hands = chit.members.filter((m) => m.customerId === payment.memberId).length;
  const memberLabel = payment.slot != null
    ? handLabel(names[payment.memberId] || payment.memberId, payment.slot, hands)
    : names[payment.memberId] || payment.memberId;

  const rows: [string, string][] = [
    ["Received from", memberLabel],
    ["Bhishi / chit", chit.name],
    ["Type", TYPE_LABEL[chit.type] || chit.type],
    ["Cycle / month", `Month ${payment.cycle} of ${chit.duration}`],
    ["Payment mode", MODE_LABEL[payment.mode || "cash"] || payment.mode || "cash"],
    ["Kind", payment.kind],
  ];
  if (organiserName) rows.push(["Recorded by", organiserName]);

  y = drawKvBlock(doc, y, rows);
  y += 2;
  y = amountBanner(doc, y, "Amount received", money(payment.amount));

  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    "This is a computer-generated receipt from Bhishi Circle for record-keeping. It is not a tax invoice.",
    MARGIN,
    y,
    { maxWidth: CONTENT_W },
  );
  y += 16;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.4);
  doc.line(PAGE_W - MARGIN - 50, y, PAGE_W - MARGIN, y);
  doc.setFontSize(8);
  doc.text("Authorised signatory", PAGE_W - MARGIN, y + 5, { align: "right" });

  footer(doc);
  downloadBlob(doc, `${safeName(chit.name)}-receipt-${payment.cycle}-${safeName(memberLabel)}.pdf`);
}

/** Day-book / collection register PDF across filtered receipts. */
export function downloadDayBookPdf(
  title: string,
  receipts: Array<Payment & { chitName: string }>,
  names: Record<string, string>,
  summary: { collected: number; byMode: Record<string, number> },
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as Doc;
  brandHeader(doc, "Collection register", title);

  let y = CONTENT_START_Y;
  y = docTitle(doc, y, "Day book", title);

  y = kpiRow(doc, y, [
    { label: "Total collected", value: money(summary.collected) },
    { label: "Receipts", value: String(receipts.length) },
    { label: "Cash", value: money(summary.byMode.cash || 0) },
    { label: "UPI + Bank", value: money((summary.byMode.upi || 0) + (summary.byMode.bank || 0)) },
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
      0: { cellWidth: 10, halign: "center" },
      4: { halign: "center", cellWidth: 14 },
      6: {halign: "right", fontStyle: "bold" },
    },
  });

  footer(doc);
  downloadBlob(doc, `${safeName(title)}-day-book.pdf`);
}

/** Keep CSV for power users who want raw data. */
export { downloadChitCsv } from "./exportCsv";

/** Current-month dues snapshot. */
export function downloadMonthDuesPdf(chit: Chit, names: Record<string, string>) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as Doc;
  const cycle = displayCycle(chit);
  brandHeader(doc, chit.name, `Month ${cycle} dues`);
  let y = CONTENT_START_Y;
  y = docTitle(doc, y, `Month ${cycle} collection sheet`, `${chit.members.length} hands · ${FREQ_LABEL[chit.frequency] || chit.frequency}`);
  y = kpiRow(doc, y, [
    { label: "Expected", value: money(expectedThisCycle(chit)) },
    { label: "Collected", value: money(collectedThisCycle(chit)) },
    { label: "Outstanding", value: money(outstandingOf(chit)) },
    { label: "Cash on hand", value: money(treasuryOf(chit)) },
  ]);
  y = drawDataTable(doc, y, {
    title: "Dues by hand",
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
      1: { halign: "right" },
      2: {halign: "right" },
      3: {halign: "right", fontStyle: "bold" },
      4: {halign: "center" },
    },
  });
  footer(doc);
  downloadBlob(doc, `${safeName(chit.name)}-month-${cycle}-dues.pdf`);
}

/**
 * Single-loan report: face amount, interest cut, net paid out, and full repayment schedule.
 */
export function downloadLoanReportPdf(
  chit: Chit,
  auction: AuctionRecord,
  names: Record<string, string>,
  organiserName?: string,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as Doc;
  const face = loanFaceAmount(auction);
  const tenure = loanEffectiveTenure(chit, auction.cycle);
  const interestMo = loanMonthlyInterest(chit, face);
  const slot = auction.winnerSlot ?? 1;
  const hands = chit.members.filter((m) => m.customerId === auction.winnerId).length;
  const borrower = handLabel(names[auction.winnerId] || auction.winnerId, slot, hands);
  const schedule = loanRepaymentSchedule(chit, auction);
  const totalInterest =
    Math.max(0, Number(auction.discount) || 0)
    + schedule.reduce((s, r) => s + r.interest, 0);
  const totalRepay = schedule.reduce((s, r) => s + r.principal + r.interest, 0);
  const totalDueWithDeposit = schedule.reduce((s, r) => s + r.total, 0);

  brandHeader(doc, chit.name, "Loan report");

  let y = CONTENT_START_Y;
  y = docTitle(
    doc,
    y,
    "Loan disbursal report",
    `Month ${auction.cycle} of ${chit.duration} · Interest ${chit.interestRate ?? 0}% · Tenure ${tenure} months`,
  );

  y = kpiRow(doc, y, [
    { label: "Face loan", value: money(face) },
    { label: "Interest cut now", value: money(auction.discount || 0) },
    { label: "Borrower receives", value: money(auction.payout) },
    { label: "Commission", value: money(auction.commission || 0) },
  ]);

  const detailRows: [string, string][] = [
    ["Borrower", borrower],
    ["Bhishi / chit", chit.name],
    ["Loan month", `Month ${auction.cycle} of ${chit.duration}`],
    ["Repayment window", `Month ${auction.cycle + 1} – ${auction.cycle + tenure} (${tenure} mo)`],
    ["Hapta (deposit)", money(baseInstalment(chit))],
    ["Interest / month", `${money(interestMo)} (${chit.interestRate ?? 0}% of face)`],
    ["Principal / month", money(Math.ceil(face / tenure))],
    ["Total interest (life)", money(totalInterest)],
    ["Principal + interest to repay", money(totalRepay)],
    ["All dues with hapta (schedule)", money(totalDueWithDeposit)],
  ];
  if (organiserName) detailRows.push(["Recorded by", organiserName]);

  y = drawKvBlock(doc, y, detailRows);
  y += 2;
  y = amountBanner(doc, y, "Amount handed to borrower", money(auction.payout));

  y = drawDataTable(doc, y, {
    title: "Repayment schedule",
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

  y = ensureY(doc, y, 20);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    "This loan report is generated by Bhishi Circle for the bhishi group and the borrower. It is not a tax invoice or legal bond.",
    MARGIN,
    y,
    { maxWidth: CONTENT_W },
  );

  footer(doc);
  downloadBlob(doc, `${safeName(chit.name)}-loan-${safeName(borrower)}-m${auction.cycle}.pdf`);
}
