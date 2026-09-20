import type { Chit } from "../types";
import { MODE_LABEL, TYPE_LABEL } from "./format";

function csvEscape(v: string | number) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Download this chit's books as a CSV table (ChitBook Settings → Export). */
export function downloadChitCsv(chit: Chit, names: Record<string, string>) {
  const lines: string[] = [];
  lines.push("Section,Field,Value");
  lines.push(["Meta", "Name", chit.name].map(csvEscape).join(","));
  lines.push(["Meta", "Type", TYPE_LABEL[chit.type] || chit.type].map(csvEscape).join(","));
  lines.push(["Meta", "Status", chit.status].map(csvEscape).join(","));
  lines.push(["Meta", "Pot", chit.pot].map(csvEscape).join(","));
  lines.push(["Meta", "Instalment", chit.instalment].map(csvEscape).join(","));
  lines.push(["Meta", "Duration", chit.duration].map(csvEscape).join(","));
  lines.push(["Meta", "Current cycle", chit.currentCycle].map(csvEscape).join(","));
  lines.push("");
  lines.push("Members,Slot,Name,CustomerId,PrizedCycle");
  for (const m of [...chit.members].sort((a, b) => a.slot - b.slot)) {
    lines.push(["Members", m.slot, names[m.customerId] || m.customerId, m.customerId, m.prizedCycle ?? ""].map(csvEscape).join(","));
  }
  lines.push("");
  lines.push("Payments,Id,Member,Slot,Cycle,Amount,Kind,Mode,Date");
  for (const p of chit.payments) {
    lines.push([
      "Payments",
      p.id,
      names[p.memberId] || p.memberId,
      p.slot ?? "",
      p.cycle,
      p.amount,
      p.kind,
      MODE_LABEL[p.mode || "cash"] || p.mode || "cash",
      p.date,
    ].map(csvEscape).join(","));
  }
  lines.push("");
  lines.push("Payouts,Cycle,Winner,Slot,Method,Bid,Payout,Commission,Dividend,Discount");
  for (const a of chit.auctions) {
    lines.push([
      "Payouts",
      a.cycle,
      names[a.winnerId] || a.winnerId,
      a.winnerSlot ?? "",
      a.method,
      a.bid,
      a.payout,
      a.commission,
      a.dividend,
      a.discount ?? 0,
    ].map(csvEscape).join(","));
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${chit.name.replace(/[^\w\-]+/g, "_") || "chit"}-ledger.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
