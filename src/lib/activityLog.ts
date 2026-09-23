import type { AuctionRecord, Chit, Payment } from "../types";

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
  memberName: string;
  slot?: number;
  amount?: number;
  cycle: number;
  paymentKind?: string;
  mode?: string;
  method?: string;
  bid?: number;
  interestRate?: number;
  discount?: number;
  commission?: number;
};

function payDate(p: Payment) {
  return p.date || "1970-01-01";
}

function auctionStamp(a: AuctionRecord, chit: Chit) {
  const d = new Date(chit.startDate);
  d.setMonth(d.getMonth() + Math.max(0, (a.cycle || 1) - 1));
  return d.toISOString().slice(0, 10);
}

/** Short date for activity rows (no seconds / long ISO). */
export function formatActivityAt(at: string, locale: string) {
  const raw = String(at || "").trim();
  if (!raw) return "";
  const d = new Date(raw.length <= 10 ? `${raw}T12:00:00` : raw);
  if (Number.isNaN(d.getTime())) {
    return raw.slice(0, 10);
  }
  const hasTime = raw.length > 10 && (raw.includes("T") || raw.includes(" "));
  if (hasTime) {
    return d.toLocaleString(locale, {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

/** Derived activity feed from payments + awards (no separate event table). */
export function buildActivityLog(
  chit: Chit,
  names: Record<string, string>,
): ActivityEntry[] {
  const rows: ActivityEntry[] = [];

  for (const p of chit.payments) {
    const who = names[p.memberId] || p.memberId;
    rows.push({
      id: `pay-${p.id || `${p.memberId}-${p.cycle}-${p.amount}-${p.date}`}`,
      at: payDate(p),
      kind: "payment",
      memberName: who,
      slot: p.slot,
      amount: p.amount,
      cycle: p.cycle,
      paymentKind: p.kind,
      mode: p.mode,
    });
  }

  for (const a of chit.auctions) {
    const who = names[a.winnerId] || a.winnerId;
    const at = auctionStamp(a, chit);
    if (a.method === "settlement") {
      rows.push({
        id: `auc-${a.id || `settle-${a.cycle}-${a.winnerId}`}`,
        at,
        kind: "settlement",
        memberName: who,
        slot: a.winnerSlot,
        amount: a.payout,
        cycle: a.cycle,
      });
    } else if (a.method === "fixed" && chit.type === "loan") {
      rows.push({
        id: `auc-${a.id || `loan-${a.cycle}-${a.winnerId}-${a.bid}`}`,
        at,
        kind: "loan",
        memberName: who,
        slot: a.winnerSlot,
        amount: a.payout,
        cycle: a.cycle,
        bid: a.bid,
        interestRate: a.interestRate,
        discount: a.discount,
      });
    } else if (a.method === "lucky_draw") {
      rows.push({
        id: `auc-${a.id || `ld-${a.cycle}-${a.winnerId}`}`,
        at,
        kind: "lucky_draw",
        memberName: who,
        slot: a.winnerSlot,
        amount: a.payout,
        cycle: a.cycle,
        commission: a.commission,
      });
    } else {
      rows.push({
        id: `auc-${a.id || `aw-${a.cycle}-${a.winnerId}-${a.method}`}`,
        at,
        kind: "award",
        memberName: who,
        slot: a.winnerSlot,
        amount: a.payout,
        cycle: a.cycle,
        method: a.method,
        bid: a.bid,
        commission: a.commission,
      });
    }
  }

  rows.sort((a, b) => {
    if (a.at !== b.at) return a.at < b.at ? 1 : -1;
    return (b.cycle || 0) - (a.cycle || 0);
  });
  return rows;
}
