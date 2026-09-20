import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Chit, Payment } from "../types";
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

type Doc = jsPDF & { lastAutoTable?: { finalY: number } };
type Cell = string | number;

const MARGIN = 14;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;

function money(n: number) {
  const v = Math.round(Number(n) || 0);
  const abs = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.abs(v));
  // Helvetica in jsPDF cannot draw ₹ — use ASCII "Rs" for clean PDFs.
  return v < 0 ? `-Rs ${abs}` : `Rs ${abs}`;
}

function safeName(s: string) {
  return (s || "report").replace(/[^\w\-]+/g, "_").slice(0, 60);
}

function downloadBlob(doc: jsPDF, filename: string) {
  doc.save(filename);
}

function brandHeader(doc: Doc, title: string, subtitle: string) {
  doc.setFillColor(15, 55, 70);
  doc.rect(0, 0, PAGE_W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Bhishi Book", MARGIN, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(title, MARGIN, 20);
  doc.text(subtitle, PAGE_W - MARGIN, 12, { align: "right" });
  doc.setTextColor(40, 40, 40);
}

function footer(doc: Doc) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Generated ${new Date().toLocaleString("en-IN")} · Page ${i} of ${pages} · Bhishi Book`,
      MARGIN,
      290,
    );
  }
}

function sectionTitle(doc: Doc, y: number, text: string) {
  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 55, 70);
  doc.text(text, MARGIN, y);
  doc.setDrawColor(15, 55, 70);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);
  doc.setTextColor(40, 40, 40);
  return y + 8;
}

function kpiRow(doc: Doc, y: number, items: { label: string; value: string }[]) {
  const colW = CONTENT_W / items.length;
  items.forEach((item, i) => {
    const x = MARGIN + i * colW;
    doc.setFillColor(245, 248, 250);
    doc.roundedRect(x, y, colW - 3, 16, 1, 1, "F");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(item.label, x + 2, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text(item.value, x + 2, y + 12);
    doc.setFont("helvetica", "normal");
  });
  return y + 22;
}

/** Simple horizontal bar chart (amounts). */
function barChart(
  doc: Doc,
  y: number,
  title: string,
  rows: { label: string; value: number }[],
) {
  if (!rows.length) return y;
  y = sectionTitle(doc, y, title);
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  const barMax = 90;
  for (const row of rows.slice(0, 12)) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(row.label.slice(0, 28), MARGIN, y + 3);
    const w = (Math.abs(row.value) / max) * barMax;
    if (row.value < 0) doc.setFillColor(180, 70, 70);
    else doc.setFillColor(30, 120, 110);
    doc.rect(MARGIN + 55, y - 2, Math.max(1, w), 5, "F");
    doc.text(money(row.value), MARGIN + 55 + barMax + 4, y + 3);
    y += 8;
  }
  return y + 4;
}

function ensureY(doc: Doc, y: number, need = 40) {
  if (y + need > 275) {
    doc.addPage();
    return 20;
  }
  return y;
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

  let y = 36;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Chit ledger report", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Started ${new Date(chit.startDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} · Month ${cycle} of ${chit.duration} · ${chit.members.length} of ${chit.membersCount} slots`,
    MARGIN,
    y,
  );
  y += 10;

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

  // Member ledger
  y = sectionTitle(doc, y, chit.type === "loan"
    ? "Member ledger (Paid in = monthly deposits only)"
    : "Member ledger (per hand)");
  const ledger = memberLedgerRows(chit);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
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
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 55, 70], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc.lastAutoTable?.finalY || y) + 10;

  y = barChart(
    doc,
    y,
    "Net position by hand",
    ledger.map((row) => ({
      label: handLabel(names[row.customerId] || "?", row.slot, 2),
      value: row.net,
    })),
  );

  // Cycle summary
  y = ensureY(doc, y, 50);
  y = sectionTitle(doc, y, "Month-by-month summary");
  const cycleRows: (string | number)[][] = [];
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
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Month", "Collected", "Payouts", "Commission", "Dividend / cut", "Till after"]],
    body: cycleRows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 55, 70], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc.lastAutoTable?.finalY || y) + 10;

  y = barChart(
    doc,
    y,
    "Collections by month",
    cycleRows.map((_, idx) => {
      const c = Number(cycleRows[idx][0]);
      return { label: `Month ${c}`, value: cycleLedger(chit, c).collected };
    }),
  );

  // Collections register
  y = ensureY(doc, y, 40);
  y = sectionTitle(doc, y, "Collection register (all receipts)");
  const pays = [...chit.payments].sort((a, b) => a.cycle - b.cycle || a.date.localeCompare(b.date));
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["#", "Date", "Month", "Member / hand", "Mode", "Kind", "Amount"]],
    body: pays.map((p, i): Cell[] => {
      const slot = p.slot;
      const hands = chit.members.filter((m) => m.customerId === p.memberId).length;
      const who = slot != null
        ? handLabel(names[p.memberId] || p.memberId, slot, hands)
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
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    headStyles: { fillColor: [15, 55, 70], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc.lastAutoTable?.finalY || y) + 10;

  // Payouts
  y = ensureY(doc, y, 40);
  y = sectionTitle(doc, y, "Payouts & awards");
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
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
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    headStyles: { fillColor: [15, 55, 70], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc.lastAutoTable?.finalY || y) + 10;

  if (chit.type === "loan" && loanDetailRows(chit).length) {
    y = ensureY(doc, y, 40);
    y = sectionTitle(doc, y, "Loan schedule");
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
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
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      headStyles: { fillColor: [15, 55, 70], textColor: 255 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 10;
  }

  // Outstanding by hand
  y = ensureY(doc, y, 40);
  y = sectionTitle(doc, y, "Balances by hand");
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
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
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 55, 70], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  footer(doc);
  downloadBlob(doc, `${safeName(chit.name)}-ledger-report.pdf`);
}

/** Single receipt PDF — printable slip. */
export function downloadReceiptPdf(
  chit: Chit,
  payment: Payment,
  names: Record<string, string>,
  organiserName?: string,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }) as Doc;
  brandHeader(doc, "Payment receipt", chit.name);

  let y = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 55, 70);
  doc.text("RECEIPT", MARGIN, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Receipt no. ${payment.id}`, MARGIN, y);
  doc.text(
    new Date(payment.date).toLocaleString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    PAGE_W - MARGIN,
    y,
    { align: "right" },
  );
  y += 12;

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 10;

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
    ["Amount received", money(payment.amount)],
  ];
  if (organiserName) rows.push(["Recorded by", organiserName]);

  for (const [k, v] of rows) {
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(k, MARGIN, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(11);
    doc.text(v, MARGIN + 55, y);
    doc.setFont("helvetica", "normal");
    y += 9;
  }

  y += 6;
  doc.setFillColor(240, 248, 246);
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 55, 70);
  doc.text("Amount", MARGIN + 4, y + 9);
  doc.setFontSize(16);
  doc.text(money(payment.amount), PAGE_W - MARGIN - 4, y + 14, { align: "right" });

  y += 36;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "This is a computer-generated receipt from Bhishi Book for record-keeping. It is not a tax invoice.",
    MARGIN,
    y,
    { maxWidth: CONTENT_W },
  );
  y += 14;
  doc.setDrawColor(180, 180, 180);
  doc.line(PAGE_W - MARGIN - 50, y, PAGE_W - MARGIN, y);
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

  let y = 36;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Day book", MARGIN, y);
  y += 8;

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

  y = ensureY(doc, y, 40);
  y = sectionTitle(doc, y, "Receipt listing");
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
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
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    headStyles: { fillColor: [15, 55, 70], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
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
  brandHeader(doc, `Month ${cycle} dues`, chit.name);
  let y = 36;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Month ${cycle} collection sheet`, MARGIN, y);
  y += 8;
  y = kpiRow(doc, y, [
    { label: "Expected", value: money(expectedThisCycle(chit)) },
    { label: "Collected", value: money(collectedThisCycle(chit)) },
    { label: "Outstanding", value: money(outstandingOf(chit)) },
    { label: "Cash on hand", value: money(treasuryOf(chit)) },
  ]);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
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
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 55, 70], textColor: 255 },
  });
  footer(doc);
  downloadBlob(doc, `${safeName(chit.name)}-month-${cycle}-dues.pdf`);
}
