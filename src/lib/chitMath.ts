import type { AuctionRecord, Chit, PaymentKind } from "../types";

export function baseInstalment(chit: Chit) {
  if (chit.instalment) return chit.instalment;
  if (!chit.membersCount) return 0;
  return Math.round(chit.pot / chit.membersCount);
}

export function memberCount(chit: Chit) {
  return Math.max(1, chit.members.length || chit.membersCount || 1);
}

/** Foreman's cut each settled cycle. % is of the pot, taken every month. */
export function commissionAmount(chit: Chit) {
  if (chit.commissionKind === "amount" && (chit.commissionValue || 0) > 0) {
    return Math.round(chit.commissionValue || 0);
  }
  return Math.round((chit.pot * (chit.commissionPct || 0)) / 100);
}

/** Dividend from an auction: (discount − commission) split across every member. */
export function dividendFromAuction(chit: Chit, auction: Pick<AuctionRecord, "bid" | "commission" | "method">) {
  if (auction.method && auction.method !== "auction") return 0;
  const discount = Math.max(0, chit.pot - auction.bid);
  return Math.floor(Math.max(0, discount - (auction.commission || 0)) / memberCount(chit));
}

export function appliedDividend(chit: Chit, cycle: number) {
  if (chit.type !== "auction") return 0;
  if ((chit.adjustmentStyle || "every_month") === "at_end") {
    if (cycle !== chit.duration) return 0;
    return chit.auctions
      .filter((a) => a.cycle < cycle)
      .reduce((s, a) => s + dividendFromAuction(chit, a), 0);
  }
  const prev = chit.auctions.find((a) => a.cycle === cycle - 1);
  return prev ? dividendFromAuction(chit, prev) : 0;
}

export function paidInCycle(chit: Chit, memberId: string, cycle: number) {
  return chit.payments
    .filter((p) => p.memberId === memberId && p.cycle === cycle)
    .reduce((s, p) => s + p.amount, 0);
}

export function rawCycleDue(chit: Chit, memberId: string, cycle: number) {
  const base = baseInstalment(chit);
  if (chit.type === "auction") {
    return Math.max(0, base - appliedDividend(chit, cycle));
  }
  if (chit.type === "base_premium" || (chit.type === "fixed" && chit.premiumAmount)) {
    const member = chit.members.find((m) => m.customerId === memberId);
    if (member?.prizedCycle && cycle >= member.prizedCycle) {
      return Math.round(chit.premiumAmount ?? base * 1.2);
    }
  }
  if (chit.type === "loan" && chit.interestRate) {
    const member = chit.members.find((m) => m.customerId === memberId);
    if (member?.prizedCycle && cycle > member.prizedCycle) {
      return Math.round(base + (base * chit.interestRate) / 100);
    }
    return base;
  }
  return base;
}

export function surplusBefore(chit: Chit, memberId: string, cycle: number) {
  let surplus = 0;
  for (let c = 1; c < cycle; c++) {
    surplus += paidInCycle(chit, memberId, c) - rawCycleDue(chit, memberId, c);
  }
  return surplus;
}

export function cycleDue(chit: Chit, memberId: string, cycle: number) {
  const raw = rawCycleDue(chit, memberId, cycle);
  const carry = surplusBefore(chit, memberId, cycle);
  if (carry >= 0) return Math.max(0, raw - carry);
  return raw + Math.abs(carry);
}

export function memberBalance(chit: Chit, memberId: string) {
  let due = 0;
  let paid = 0;
  for (let c = 1; c <= chit.currentCycle; c++) {
    due += rawCycleDue(chit, memberId, c);
    paid += paidInCycle(chit, memberId, c);
  }
  return { due, paid, outstanding: Math.max(0, due - paid) };
}

export function chitProgress(chit: Chit) {
  if (!chit.duration) return 0;
  if (chit.members.length && chit.payments.length) {
    const totals = chit.members.map((m) => memberBalance(chit, m.customerId));
    const due = totals.reduce((s, t) => s + t.due, 0);
    const paid = totals.reduce((s, t) => s + t.paid, 0);
    if (due > 0) return Math.min(100, Math.round((paid / due) * 100));
  }
  return Math.min(100, Math.round(((chit.currentCycle - 1) / chit.duration) * 100));
}

export function collectedThisCycle(chit: Chit) {
  return chit.payments
    .filter((p) => p.cycle === chit.currentCycle)
    .reduce((s, p) => s + p.amount, 0);
}

export function moneyIn(chit: Chit) {
  return chit.payments.reduce((s, p) => s + p.amount, 0);
}

export function payoutsOf(chit: Chit) {
  return chit.auctions.reduce((s, a) => s + a.payout, 0);
}

export function moneyOut(chit: Chit) {
  return payoutsOf(chit) + commissionEarned(chit);
}

export function treasuryOf(chit: Chit) {
  return moneyIn(chit) - moneyOut(chit);
}

export function expectedThisCycle(chit: Chit) {
  return chit.members.reduce((s, m) => s + rawCycleDue(chit, m.customerId, chit.currentCycle), 0);
}

export function commissionEarned(chit: Chit) {
  return chit.auctions.reduce((s, a) => s + (a.commission || 0), 0);
}

export function interestCollected(chit: Chit) {
  if (chit.type !== "loan" || !chit.interestRate) return 0;
  const rate = chit.interestRate;
  const base = baseInstalment(chit);
  return chit.members.reduce((sum, m) => {
    if (!m.prizedCycle) return sum;
    let extra = 0;
    for (let c = m.prizedCycle + 1; c <= chit.currentCycle; c++) {
      extra += paidInCycle(chit, m.customerId, c) > 0
        ? Math.round((base * rate) / 100)
        : 0;
    }
    return sum + extra;
  }, 0);
}

export function outstandingOf(chit: Chit) {
  return chit.members.reduce(
    (s, m) => s + memberBalance(chit, m.customerId).outstanding,
    0,
  );
}

export function settleWinner(
  chit: Chit,
  winnerId: string,
  bid: number,
  method: AuctionRecord["method"],
): AuctionRecord {
  const commission = commissionAmount(chit);
  let safeBid: number;
  let dividend = 0;
  if (method === "auction") {
    safeBid = Math.min(chit.pot, Math.max(0, bid));
    const discount = Math.max(0, chit.pot - safeBid);
    dividend = Math.floor(Math.max(0, discount - commission) / memberCount(chit));
  } else if (method === "lucky_draw") {
    safeBid = Math.max(0, chit.pot - commission);
  } else {
    // fixed / loan: principal paid out; commission leaves the till separately
    safeBid = Math.max(0, bid || chit.pot);
  }
  const discount = Math.max(0, chit.pot - Math.min(safeBid, chit.pot));
  const arrearsWithheld = memberBalance(chit, winnerId).outstanding;
  const payout = Math.max(0, safeBid - arrearsWithheld);
  return {
    cycle: chit.currentCycle,
    winnerId,
    bid: safeBid,
    method,
    discount,
    commission,
    dividend,
    payout,
    arrearsWithheld,
  };
}

export function paymentStatus(chit: Chit, memberId: string, cycle: number) {
  const due = cycleDue(chit, memberId, cycle);
  const paid = paidInCycle(chit, memberId, cycle);
  if (due === 0 && paid === 0) return "due" as const;
  if (paid >= due && due > 0) return paid > due ? ("advance" as const) : ("paid" as const);
  if (paid > 0) return "partial" as const;
  return "due" as const;
}

export function collectedCount(chit: Chit) {
  return chit.members.filter((m) => paymentStatus(chit, m.customerId, chit.currentCycle) !== "due").length;
}

/** Auction / lucky draw only after this month has collections, or cash on hand goes negative. */
export function canSettleCycle(chit: Chit) {
  if (!chit.members.length) return false;
  return collectedThisCycle(chit) > 0;
}

export function assertCanSettlePayout(
  chit: Chit,
  winnerId: string,
  bid: number,
  method: AuctionRecord["method"],
) {
  if (!canSettleCycle(chit)) {
    throw new Error("Record this month's collections before the auction");
  }
  const rec = settleWinner(chit, winnerId, bid, method);
  const available = treasuryOf(chit);
  if (rec.payout + rec.commission > Math.max(0, available)) {
    throw new Error("Payout plus commission is more than cash on hand. Collect remaining dues or lower the winning bid.");
  }
  return rec;
}

export function cycleLedger(chit: Chit, cycle: number) {
  const collected = chit.payments.filter((p) => p.cycle === cycle).reduce((s, p) => s + p.amount, 0);
  const a = chit.auctions.find((x) => x.cycle === cycle);
  return {
    collected,
    payout: a?.payout || 0,
    commission: a?.commission || 0,
    dividend: appliedDividend(chit, cycle),
  };
}

export function balanceAfterCycle(chit: Chit, cycle: number) {
  let bal = 0;
  for (let c = 1; c <= cycle; c++) {
    const row = cycleLedger(chit, c);
    bal += row.collected - row.payout - row.commission;
  }
  return bal;
}

export function inferKind(due: number, amount: number): PaymentKind {
  if (amount > due) return "advance";
  if (amount < due) return "partial";
  return "full";
}
