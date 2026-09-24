import type { AuctionRecord, Chit, Payment } from "../types";
import { isAwardFirst } from "./chitMath";

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

/** Prefer a real payment timestamp from the same hapta; else startDate + cycle months. */
function auctionStamp(a: AuctionRecord, chit: Chit) {
  const sameCyclePays = chit.payments
    .filter((p) => p.cycle === a.cycle)
    .map((p) => payDate(p))
    .filter(Boolean)
    .sort();
  if (sameCyclePays.length) {
    // Award/loan usually after collections (or before in auction-first — still a real day).
    return sameCyclePays[sameCyclePays.length - 1];
  }
  const d = new Date(chit.startDate);
  if (Number.isNaN(d.getTime())) return chit.startDate || "1970-01-01";
  d.setMonth(d.getMonth() + Math.max(0, (a.cycle || 1) - 1));
  return d.toISOString().slice(0, 10);
}

function parseAt(at: string): number {
  const raw = String(at || "").trim();
  if (!raw) return 0;
  const d = new Date(raw.length <= 10 ? `${raw}T12:00:00` : raw);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/**
 * Within a hapta, later workflow steps rank higher for newest-first display.
 * collect-first: pay → award → settle
 * award-first: award → pay → settle
 */
function kindRank(kind: ActivityKind, awardFirst: boolean): number {
  if (kind === "settlement") return 30;
  if (kind === "payment") return awardFirst ? 20 : 10;
  if (kind === "award" || kind === "loan" || kind === "lucky_draw") return awardFirst ? 10 : 20;
  return 0;
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
  const awardFirst = isAwardFirst(chit);

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

  // Newest hapta first; within hapta, later workflow step first; then clock time.
  rows.sort((a, b) => {
    if (a.cycle !== b.cycle) return (b.cycle || 0) - (a.cycle || 0);
    const kr = kindRank(b.kind, awardFirst) - kindRank(a.kind, awardFirst);
    if (kr !== 0) return kr;
    const ta = parseAt(a.at);
    const tb = parseAt(b.at);
    if (ta !== tb) return tb - ta;
    if ((a.slot || 0) !== (b.slot || 0)) return (b.slot || 0) - (a.slot || 0);
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
  return rows;
}

/** Group newest-first feed into hapta sections (cycle DESC). */
export function groupActivityByCycle(rows: ActivityEntry[]): { cycle: number; rows: ActivityEntry[] }[] {
  const map = new Map<number, ActivityEntry[]>();
  for (const row of rows) {
    const c = row.cycle || 0;
    const list = map.get(c);
    if (list) list.push(row);
    else map.set(c, [row]);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([cycle, groupRows]) => ({ cycle, rows: groupRows }));
}
