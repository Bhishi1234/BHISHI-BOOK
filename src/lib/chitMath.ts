import type { AuctionRecord, Chit, PaymentKind } from "../types";

export function baseInstalment(chit: Chit) {
  if (chit.instalment) return chit.instalment;
  if (!chit.membersCount) return 0;
  return computeInstalment(chit.pot, chit.membersCount);
}

/** Monthly due so N × instalment always covers the pot (avoids ₹1 shortfalls from rounding). */
export function computeInstalment(pot: number, members: number) {
  if (!members || pot <= 0) return 0;
  let inst = Math.round(pot / members);
  if (inst * members < pot) inst += 1;
  return inst;
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
  // Auction-first: this month's due is bid÷n — no carry-forward dividend credit.
  if (chit.auctionStyle === "auction_first") return 0;
  if ((chit.adjustmentStyle || "every_month") === "at_end") {
    if (cycle !== chit.duration) return 0;
    return chit.auctions
      .filter((a) => a.cycle < cycle)
      .reduce((s, a) => s + dividendFromAuction(chit, a), 0);
  }
  const prev = chit.auctions.find((a) => a.cycle === cycle - 1);
  return prev ? dividendFromAuction(chit, prev) : 0;
}

export function isAuctionFirst(chit: Chit) {
  return chit.type === "auction" && chit.auctionStyle === "auction_first";
}

/** Winning auction / lucky-draw row for a cycle, if any. */
export function auctionOfCycle(chit: Chit, cycle: number) {
  return chit.auctions.find(
    (a) => a.cycle === cycle && (!a.method || a.method === "auction" || a.method === "lucky_draw"),
  );
}

/**
 * Auction-first monthly share: each member pays winning bid ÷ N.
 * Face value / provision stays the pot; dues switch to the bid split after auction.
 */
export function auctionFirstShare(chit: Chit, cycle: number) {
  const n = memberCount(chit);
  const a = auctionOfCycle(chit, cycle);
  if (a) return computeInstalment(a.bid, n);
  return baseInstalment(chit);
}

export function paidInCycle(chit: Chit, memberId: string, cycle: number) {
  return chit.payments
    .filter((p) => p.memberId === memberId && p.cycle === cycle)
    .reduce((s, p) => s + p.amount, 0);
}

export function rawCycleDue(chit: Chit, memberId: string, cycle: number) {
  const base = baseInstalment(chit);
  if (chit.type === "auction") {
    if (isAuctionFirst(chit)) {
      const win = auctionOfCycle(chit, cycle);
      // Winner receives the bid; the other members settle bid ÷ N to them.
      if (win && win.winnerId === memberId) return 0;
      return auctionFirstShare(chit, cycle);
    }
    return Math.max(0, base - appliedDividend(chit, cycle));
  }
  if (chit.type === "base_premium" || chit.type === "fixed") {
    const member = chit.members.find((m) => m.customerId === memberId);
    const prized = member?.prizedCycle;
    if (!prized) return base;

    const policy = chit.winningMonthPolicy || "normal";
    if (cycle === prized && policy === "nothing") return 0;

    const useAfterWin =
      cycle > prized
      || (cycle === prized && policy === "premium");

    if (useAfterWin && (chit.fixedPayMode === "premium" || chit.type === "base_premium" || chit.premiumAmount || chit.winnerInterestPct)) {
      if (chit.winnerPayKind === "interest" && (chit.winnerInterestPct || 0) > 0) {
        // Interest (%) of pot, charged monthly after win (ChitBook Fixed).
        return Math.round((chit.pot * (chit.winnerInterestPct || 0)) / 100);
      }
      if (chit.premiumAmount != null && chit.premiumAmount > 0) {
        return Math.round(chit.premiumAmount);
      }
      if (chit.type === "base_premium") return Math.round(base * 1.2);
    }
    return base;
  }
  if (chit.type === "loan") {
    return loanCycleDue(chit, memberId, cycle);
  }
  return base;
}

/** Total principal this member has taken (loan disbursements only). */
export function loanPrincipalOf(chit: Chit, memberId: string) {
  return chit.auctions
    .filter((a) => a.winnerId === memberId && a.method === "fixed")
    .reduce((s, a) => s + a.payout, 0);
}

export function firstLoanCycle(chit: Chit, memberId: string) {
  const cycles = chit.auctions
    .filter((a) => a.winnerId === memberId && a.method === "fixed")
    .map((a) => a.cycle);
  return cycles.length ? Math.min(...cycles) : 0;
}

/**
 * Loan bhishi due = deposit + interest on principal + amortised principal share.
 * Interest and principal start the month AFTER the loan is given (ChitBook-style).
 */
export function loanCycleDue(chit: Chit, memberId: string, cycle: number) {
  const base = baseInstalment(chit);
  const principal = loanPrincipalOf(chit, memberId);
  if (!principal) return base;
  const start = firstLoanCycle(chit, memberId);
  if (!start || cycle <= start) return base;
  const rate = chit.interestRate || 0;
  const interest = Math.round((principal * rate) / 100);
  const tenure = Math.max(
    1,
    chit.repaymentTenure || Math.max(1, chit.duration - start),
  );
  const monthIndex = cycle - start; // 1 = first repayment month
  const principalShare = monthIndex >= 1 && monthIndex <= tenure
    ? Math.ceil(principal / tenure)
    : 0;
  // Last instalment adjustment so total principal shares ≈ principal
  let share = principalShare;
  if (monthIndex === tenure) {
    const prior = Math.ceil(principal / tenure) * (tenure - 1);
    share = Math.max(0, principal - prior);
  }
  return base + interest + share;
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

export function displayCycle(chit: Chit) {
  return Math.min(Math.max(1, chit.currentCycle || 1), Math.max(1, chit.duration || 1));
}

/** Last auction month: remaining member takes all cash; no discount / dividend / commission. */
export function isLastAuctionCycle(chit: Chit) {
  if (chit.type !== "auction") return false;
  const cycle = displayCycle(chit);
  const unprized = chit.members.filter((m) => !m.prizedCycle).length;
  return cycle >= chit.duration || unprized <= 1;
}

export function memberBalance(chit: Chit, memberId: string) {
  let due = 0;
  let paid = 0;
  const through = displayCycle(chit);
  for (let c = 1; c <= through; c++) {
    due += rawCycleDue(chit, memberId, c);
    paid += paidInCycle(chit, memberId, c);
  }
  return { due, paid, outstanding: Math.max(0, due - paid) };
}

export function chitProgress(chit: Chit) {
  if (!chit.duration) return 0;
  if (chit.status === "completed") return 100;
  if (chit.members.length && chit.payments.length) {
    const totals = chit.members.map((m) => memberBalance(chit, m.customerId));
    const due = totals.reduce((s, t) => s + t.due, 0);
    const paid = totals.reduce((s, t) => s + t.paid, 0);
    if (due > 0) return Math.min(100, Math.round((paid / due) * 100));
  }
  return Math.min(100, Math.round(((displayCycle(chit) - 1) / chit.duration) * 100));
}

export function collectedThisCycle(chit: Chit) {
  const cyc = displayCycle(chit);
  return chit.payments
    .filter((p) => p.cycle === cyc)
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

/**
 * Cash on hand.
 * Auction-first is peer settlement: members pay the winning bid split, which funds
 * the winner. Outflow only counts up to what was collected that cycle — so the till
 * stays ₹0 once the bid is fully settled (never goes negative right after auction).
 */
export function treasuryOf(chit: Chit) {
  if (!isAuctionFirst(chit)) {
    return moneyIn(chit) - moneyOut(chit);
  }
  let bal = 0;
  const through = Math.max(displayCycle(chit), ...chit.payments.map((p) => p.cycle), 0);
  for (let c = 1; c <= through; c++) {
    const collected = chit.payments
      .filter((p) => p.cycle === c)
      .reduce((s, p) => s + p.amount, 0);
    const a = auctionOfCycle(chit, c);
    if (a) {
      // Pass-through of the winning amount (+ any commission) as collections arrive.
      const settle = a.payout + (a.commission || 0);
      bal += collected - Math.min(settle, collected);
    } else {
      bal += collected;
    }
  }
  return bal;
}

/** Dividend pools already realised from auctions held (discount − commission). */
export function dividendsHeld(chit: Chit) {
  if (chit.type !== "auction") return 0;
  return chit.auctions
    .filter((a) => !a.method || a.method === "auction")
    .reduce((s, a) => s + dividendFromAuction(chit, a) * memberCount(chit), 0);
}

/**
 * Lifetime collections if every remaining month paid at today's known dues.
 * Held auction dividends already reduce the contribution schedule.
 */
export function expectedLifeCollections(chit: Chit) {
  const n = memberCount(chit);
  const base = baseInstalment(chit) * n * chit.duration;
  if (chit.type === "auction") return Math.max(0, base - dividendsHeld(chit));
  if (chit.type === "base_premium" || (chit.type === "fixed" && chit.premiumAmount)) {
    let total = 0;
    for (let c = 1; c <= chit.duration; c++) {
      for (const m of chit.members) total += rawCycleDue(chit, m.customerId, c);
      // empty slots still expected at base until filled
      const empty = Math.max(0, n - chit.members.length);
      total += empty * baseInstalment(chit);
    }
    return total || base;
  }
  return base;
}

/**
 * Planned pot after foreman commission. Dividends already held are deducted
 * so the figure drops as auctions settle (ChitBook overview copy).
 */
export function plannedPot(chit: Chit) {
  const lifeComm = commissionAmount(chit) * chit.duration;
  return Math.max(0, expectedLifeCollections(chit) - lifeComm);
}

export function plannedPerMember(chit: Chit) {
  return Math.round(plannedPot(chit) / memberCount(chit));
}

/** Cash a member has paid into the chit (all receipts). */
export function memberPaidTotal(chit: Chit, memberId: string) {
  return chit.payments
    .filter((p) => p.memberId === memberId)
    .reduce((s, p) => s + p.amount, 0);
}

/** Cash a member received from pot / loan / settlement payouts. */
export function memberReceivedTotal(chit: Chit, memberId: string) {
  return chit.auctions
    .filter((a) => a.winnerId === memberId)
    .reduce((s, a) => s + a.payout, 0);
}

/** Dividend credited to every member from auctions held (₹ / member, cumulative). */
export function memberDividendTotal(chit: Chit) {
  if (chit.type !== "auction") return 0;
  return chit.auctions
    .filter((a) => !a.method || a.method === "auction")
    .reduce((s, a) => s + (a.dividend || dividendFromAuction(chit, a)), 0);
}

/** Total dividend pool distributed across all auctions (all members combined). */
export function dividendsDistributed(chit: Chit) {
  return memberDividendTotal(chit) * memberCount(chit);
}

export function memberLedgerRows(chit: Chit) {
  const divEach = memberDividendTotal(chit);
  return chit.members.map((m) => {
    const paid = memberPaidTotal(chit, m.customerId);
    const received = memberReceivedTotal(chit, m.customerId);
    return {
      customerId: m.customerId,
      slot: m.slot,
      prizedCycle: m.prizedCycle,
      paid,
      received,
      dividend: divEach,
      net: received + divEach - paid,
    };
  });
}

export function isFixedLike(chit: Chit) {
  return chit.type === "fixed" || chit.type === "base_premium";
}

/** Next unprized member in slot order (Fixed / Base+premium payout queue). */
export function nextBySlot(chit: Chit) {
  return [...chit.members]
    .filter((m) => !m.prizedCycle)
    .sort((a, b) => a.slot - b.slot)[0];
}

export function expectedThisCycle(chit: Chit) {
  const cyc = displayCycle(chit);
  return chit.members.reduce((s, m) => s + rawCycleDue(chit, m.customerId, cyc), 0);
}

export function commissionEarned(chit: Chit) {
  return chit.auctions.reduce((s, a) => s + (a.commission || 0), 0);
}

export function interestCollected(chit: Chit) {
  if (chit.type !== "loan" || !chit.interestRate) return 0;
  const rate = chit.interestRate;
  const through = displayCycle(chit);
  return chit.members.reduce((sum, m) => {
    const principal = loanPrincipalOf(chit, m.customerId);
    if (!principal) return sum;
    const start = firstLoanCycle(chit, m.customerId);
    let extra = 0;
    for (let c = start + 1; c <= through; c++) {
      if (paidInCycle(chit, m.customerId, c) > 0) {
        extra += Math.round((principal * rate) / 100);
      }
    }
    return sum + extra;
  }, 0);
}

export function loansThisCycle(chit: Chit) {
  const cyc = displayCycle(chit);
  return chit.auctions.filter((a) => a.cycle === cyc && a.method === "fixed");
}

export function settlementsOf(chit: Chit) {
  return chit.auctions.filter((a) => a.method === "settlement");
}

export function outstandingLoanPrincipal(chit: Chit) {
  return chit.members.reduce((s, m) => s + loanPrincipalOf(chit, m.customerId), 0);
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
  const alreadyLoanedThisCycle = chit.auctions.some(
    (a) => a.cycle === chit.currentCycle && a.method === "fixed",
  );
  const lastAuction = (method === "auction" || method === "lucky_draw") && isLastAuctionCycle(chit);
  const auctionFirst = isAuctionFirst(chit) && (method === "auction" || method === "lucky_draw");
  // Auction-first: members settle the bid peer-to-peer (bid ÷ N each). No foreman cut from the till.
  const commission =
    method === "settlement" || lastAuction || auctionFirst
      ? 0
      : method === "fixed" && chit.type === "loan" && alreadyLoanedThisCycle
        ? 0
        : method === "lucky_draw" || method === "auction" || method === "fixed"
          ? commissionAmount(chit)
          : 0;
  let safeBid: number;
  let dividend = 0;
  if (lastAuction && auctionFirst) {
    safeBid = Math.max(0, chit.pot);
  } else if (lastAuction) {
    safeBid = Math.max(0, treasuryOf(chit));
  } else if (method === "auction") {
    safeBid = Math.min(chit.pot, Math.max(0, bid));
    if (!auctionFirst) {
      const discount = Math.max(0, chit.pot - safeBid);
      dividend = Math.floor(Math.max(0, discount - commission) / memberCount(chit));
    }
  } else if (method === "lucky_draw") {
    safeBid = Math.max(0, chit.pot - commission);
  } else if (method === "fixed" && (chit.type === "fixed" || chit.type === "base_premium")) {
    const maxPayout = Math.max(0, treasuryOf(chit) - commission);
    safeBid = Math.min(Math.max(0, Number(bid) || 0), maxPayout);
  } else {
    safeBid = Math.max(0, Number(bid) || 0);
  }
  const discount = method === "auction" && !lastAuction && !auctionFirst ? Math.max(0, chit.pot - safeBid) : 0;
  // Auction-first: full bid is what the winner gets; peers settle bid ÷ N separately.
  const arrearsWithheld = method === "settlement" || auctionFirst
    ? 0
    : memberBalance(chit, winnerId).outstanding;
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
  if (due === 0) return paid > 0 ? ("advance" as const) : ("paid" as const);
  if (paid >= due) return paid > due ? ("advance" as const) : ("paid" as const);
  if (paid > 0) return "partial" as const;
  return "due" as const;
}

export function collectedCount(chit: Chit) {
  return chit.members.filter((m) => paymentStatus(chit, m.customerId, chit.currentCycle) !== "due").length;
}

/** Auction unlocked: collect-first needs receipts; auction-first can bid immediately. */
export function canSettleCycle(chit: Chit) {
  if (!chit.members.length) return false;
  if (isAuctionFirst(chit)) return true;
  return collectedThisCycle(chit) > 0;
}

export function assertCanSettlePayout(
  chit: Chit,
  winnerId: string,
  bid: number,
  method: AuctionRecord["method"],
) {
  const auctionFirst = isAuctionFirst(chit) && (method === "auction" || method === "lucky_draw");
  if (method !== "settlement" && !canSettleCycle(chit)) {
    throw new Error("Record this month's collections before the auction");
  }
  const lastAuction = (method === "auction" || method === "lucky_draw") && isLastAuctionCycle(chit);
  if (!lastAuction && (!bid || bid <= 0)) {
    throw new Error("Enter an amount greater than zero");
  }
  const rec = settleWinner(chit, winnerId, bid, method);
  if (!auctionFirst) {
    const available = treasuryOf(chit);
    if (rec.payout + rec.commission > Math.max(0, available) + 0.001) {
      throw new Error(
        `Amount plus commission (₹${rec.payout + rec.commission}) is more than cash on hand (₹${Math.max(0, available)}). Collect more dues first, or lower the amount.`,
      );
    }
  }
  return rec;
}

export function cycleLedger(chit: Chit, cycle: number) {
  const collected = chit.payments.filter((p) => p.cycle === cycle).reduce((s, p) => s + p.amount, 0);
  const rows = chit.auctions.filter((x) => x.cycle === cycle);
  const auctionRow = rows.find((x) => !x.method || x.method === "auction");
  return {
    collected,
    payout: rows.reduce((s, a) => s + a.payout, 0),
    commission: rows.reduce((s, a) => s + (a.commission || 0), 0),
    // Dividend generated by this cycle's auction (not the credit applied to next month's dues).
    dividend: auctionRow
      ? (auctionRow.dividend || dividendFromAuction(chit, auctionRow))
      : 0,
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
