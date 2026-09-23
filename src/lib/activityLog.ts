import type { AuctionRecord, Chit, Payment } from "../types";
import { inr } from "./format";

export type ActivityKind =
  | "payment"
  | "award"
  | "loan"
  | "settlement"
  | "lucky_draw"
  | "cycle";

export type ActivityEntry = {
  id: string;
  at: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  amount?: number;
  cycle?: number;
};

function payDate(p: Payment) {
  return p.date || "1970-01-01";
}

function auctionStamp(a: AuctionRecord, chit: Chit) {
  // Auctions don't store a date — approximate as start of that cycle month.
  const d = new Date(chit.startDate);
  d.setMonth(d.getMonth() + Math.max(0, (a.cycle || 1) - 1));
  return d.toISOString().slice(0, 10);
}

/** Derived activity feed from payments + awards (no separate event table). */
export function buildActivityLog(
  chit: Chit,
  names: Record<string, string>,
): ActivityEntry[] {
  const rows: ActivityEntry[] = [];

  for (const p of chit.payments) {
    const who = names[p.memberId] || p.memberId;
    const slot = p.slot != null ? ` · slot ${p.slot}` : "";
    rows.push({
      id: `pay-${p.id || `${p.memberId}-${p.cycle}-${p.amount}-${p.date}`}`,
      at: payDate(p),
      kind: "payment",
      title: `Collection · ${who}${slot}`,
      detail: `${p.kind}${p.mode ? ` · ${p.mode}` : ""} · month ${p.cycle}`,
      amount: p.amount,
      cycle: p.cycle,
    });
  }

  for (const a of chit.auctions) {
    const who = names[a.winnerId] || a.winnerId;
    const slot = a.winnerSlot != null ? ` · slot ${a.winnerSlot}` : "";
    const at = auctionStamp(a, chit);
    if (a.method === "settlement") {
      rows.push({
        id: `auc-${a.id || `settle-${a.cycle}-${a.winnerId}`}`,
        at,
        kind: "settlement",
        title: `Settlement · ${who}${slot}`,
        detail: `Final share · month ${a.cycle}`,
        amount: a.payout,
        cycle: a.cycle,
      });
    } else if (a.method === "fixed" && chit.type === "loan") {
      rows.push({
        id: `auc-${a.id || `loan-${a.cycle}-${a.winnerId}-${a.bid}`}`,
        at,
        kind: "loan",
        title: `Loan given · ${who}${slot}`,
        detail: `Face ${inr(a.bid)}${a.interestRate != null ? ` · ${a.interestRate}%` : ""}${a.discount ? ` · interest cut ${inr(a.discount)}` : ""} · month ${a.cycle}`,
        amount: a.payout,
        cycle: a.cycle,
      });
    } else if (a.method === "lucky_draw") {
      rows.push({
        id: `auc-${a.id || `ld-${a.cycle}-${a.winnerId}`}`,
        at,
        kind: "lucky_draw",
        title: `Lucky draw · ${who}${slot}`,
        detail: `Pot awarded · month ${a.cycle}${a.commission ? ` · commission ${inr(a.commission)}` : ""}`,
        amount: a.payout,
        cycle: a.cycle,
      });
    } else {
      rows.push({
        id: `auc-${a.id || `aw-${a.cycle}-${a.winnerId}-${a.method}`}`,
        at,
        kind: "award",
        title: `Award · ${who}${slot}`,
        detail: `${a.method === "auction" ? `Bid ${inr(a.bid)}` : "Fixed pot"}${a.commission ? ` · commission ${inr(a.commission)}` : ""} · month ${a.cycle}`,
        amount: a.payout,
        cycle: a.cycle,
      });
    }
  }

  rows.sort((a, b) => {
    if (a.at !== b.at) return a.at < b.at ? 1 : -1;
    return (b.cycle || 0) - (a.cycle || 0);
  });
  return rows;
}
