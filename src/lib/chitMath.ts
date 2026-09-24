import type { AuctionRecord, Chit, PaymentKind } from "../types";

export function baseInstalment(chit: Chit) {
  const n = memberCount(chit);
  const floor = computeInstalment(chit.pot, n);
  // Prefer stored instalment when it is intentional; normalize legacy ceil (+1) back to floor.
  if (chit.instalment && chit.instalment > 0) {
    if (chit.instalment === floor || chit.instalment === floor + 1) return floor;
    return chit.instalment;
  }
  return floor;
}

/**
 * Equal monthly share (floor). Remainder so N×share + rem = pot is applied on the
 * highest slot via {@link handInstalment} — Expected never exceeds the pot.
 */
export function computeInstalment(pot: number, members: number) {
  if (!members || pot <= 0) return 0;
  return Math.floor(pot / members);
}

export function potCoverRemainder(pot: number, members: number) {
  if (!members || pot <= 0) return 0;
  return pot - computeInstalment(pot, members) * members;
}

/** Per-hand instalment: floor for all, highest slot absorbs ₹ rem so totals equal pot. */
export function handInstalment(chit: Chit, slot: number) {
  const n = memberCount(chit);
  const floor = baseInstalment(chit);
  const rem = potCoverRemainder(chit.pot, n);
  if (rem <= 0 || !chit.members.length) return floor;
  const maxSlot = Math.max(...chit.members.map((m) => m.slot));
  return slot === maxSlot ? floor + rem : floor;
}

export function memberCount(chit: Chit) {
  return Math.max(1, chit.members.length || chit.membersCount || 1);
}

/** Foreman's cut each settled cycle. % is of the pot, taken every month. */
export function commissionAmount(chit: Chit) {
  if (chit.commissionKind === "amount") {
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

/** Auction-only: peer settle winning bid ÷ N (subset of award-first). */
export function isAuctionFirst(chit: Chit) {
  return chit.type === "auction" && chit.auctionStyle === "auction_first";
}

/**
 * Hapta order: award / auction / loan first, then collect, then close.
 * Stored in auction_style for every bhishi type (collect_first | auction_first).
 */
export function isAwardFirst(chit: Chit) {
  return chit.auctionStyle === "auction_first";
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

export function paidInCycle(chit: Chit, memberId: string, cycle: number, slot?: number) {
  const cash = chit.payments
    .filter((p) => paymentMatchesHand(chit, p, memberId, cycle, slot))
    .reduce((s, p) => s + p.amount, 0);
  return cash + auctionFirstSelfCredit(chit, memberId, cycle, cash, slot);
}

/** Whether a payment belongs to this hand (slot). Legacy receipts without slot → lowest slot only. */
export function paymentMatchesHand(
  chit: Chit,
  p: { memberId: string; cycle: number; slot?: number },
  memberId: string,
  cycle: number,
  slot?: number,
) {
  if (p.memberId !== memberId || p.cycle !== cycle) return false;
  if (slot == null) return true;
  if (p.slot != null) return p.slot === slot;
  const first = firstSlotOf(chit, memberId);
  return first === slot;
}

export function firstSlotOf(chit: Chit, customerId: string) {
  const hands = handsOf(chit, customerId);
  if (!hands.length) return 1;
  return Math.min(...hands.map((h) => h.slot));
}

/**
 * Auction-first: the winning hand still “pays” their bid÷N share (to themselves).
 */
export function auctionFirstSelfCredit(
  chit: Chit,
  memberId: string,
  cycle: number,
  cashPaid = 0,
  slot?: number,
) {
  if (!isAuctionFirst(chit)) return 0;
  const a = auctionOfCycle(chit, cycle);
  if (!a || a.winnerId !== memberId) return 0;
  const winSlot = a.winnerSlot ?? firstSlotOf(chit, memberId);
  if (slot != null && slot !== winSlot) return 0;
  // When aggregating all hands (slot omitted), only credit once on the winning hand path —
  // callers summing per-hand should pass slot; customer-level sum passes slot=undefined once.
  if (slot == null && handsOf(chit, memberId).length > 1) {
    // Credit only when this aggregate call is used; avoid double-count by attaching to face share once.
  }
  const share = auctionFirstShare(chit, cycle);
  return Math.max(0, share - cashPaid);
}

/** Hands (slots) for one person in this chit. */
export function handsOf(chit: Chit, customerId: string) {
  return chit.members.filter((m) => m.customerId === customerId);
}

export function handCount(chit: Chit, customerId: string) {
  return Math.max(1, handsOf(chit, customerId).length);
}

export function uniqueMemberIds(chit: Chit) {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const m of chit.members) {
    if (seen.has(m.customerId)) continue;
    seen.add(m.customerId);
    ids.push(m.customerId);
  }
  return ids;
}

/** Display label for one hand. */
export function handLabel(name: string, slot: number, totalHands: number) {
  if (totalHands <= 1) return name;
  return `${name} · Slot ${slot}`;
}

export function memberHandLabel(chit: Chit, customerId: string, name: string) {
  const n = handsOf(chit, customerId).length;
  if (n <= 1) return name;
  return `${name} · ${n} hands`;
}

/**
 * Due for one hand (slot). Each hand is independent — never mirrors another hand.
 * Pass `slot` for a specific hand; omit to sum all hands of that person (customer views).
 */
export function rawCycleDue(chit: Chit, memberId: string, cycle: number, slot?: number) {
  const hands = slot != null
    ? handsOf(chit, memberId).filter((h) => h.slot === slot)
    : handsOf(chit, memberId);
  if (!hands.length) {
    // Not in chit / legacy single call without membership row
    return rawCycleDueOneHand(chit, { customerId: memberId, slot: slot ?? 1 }, cycle);
  }
  return hands.reduce((sum, hand) => sum + rawCycleDueOneHand(chit, hand, cycle), 0);
}

function rawCycleDueOneHand(chit: Chit, hand: { customerId: string; slot: number; prizedCycle?: number }, cycle: number) {
  const base = handInstalment(chit, hand.slot);
  const memberId = hand.customerId;
  const slot = hand.slot;

  if (chit.type === "auction") {
    if (isAuctionFirst(chit)) {
      const n = memberCount(chit);
      const a = auctionOfCycle(chit, cycle);
      if (a) {
        const floor = computeInstalment(a.bid, n);
        const rem = potCoverRemainder(a.bid, n);
        const maxSlot = Math.max(...chit.members.map((m) => m.slot), hand.slot);
        return hand.slot === maxSlot ? floor + rem : floor;
      }
      return base;
    }
    return Math.max(0, base - appliedDividend(chit, cycle));
  }
  if (chit.type === "fixed" || chit.type === "lucky_draw" || chit.type === "hand_sacrifice") {
    return base;
  }
  if (chit.type === "base_premium") {
    const prized = hand.prizedCycle;
    if (!prized) return base;
    const policy = chit.winningMonthPolicy || "normal";
    if (cycle === prized && policy === "nothing") return 0;
    const useAfterWin =
      cycle > prized
      || (cycle === prized && policy === "premium");
    if (useAfterWin) {
      if (chit.premiumAmount != null && chit.premiumAmount > 0) {
        return Math.round(chit.premiumAmount);
      }
      return Math.round(base * 1.2);
    }
    return base;
  }
  if (chit.type === "loan") {
    return loanCycleDue(chit, memberId, cycle, slot);
  }
  return base;
}

/** Face principal for this hand only (slot). */
export function loanPrincipalOf(chit: Chit, memberId: string, slot?: number) {
  return chit.auctions
    .filter((a) => a.winnerId === memberId && a.method === "fixed" && loanMatchesHand(chit, a, slot))
    .reduce((s, a) => s + loanFaceAmount(a), 0);
}

function loanMatchesHand(chit: Chit, a: AuctionRecord, slot?: number) {
  if (slot == null) return true;
  if (a.winnerSlot != null) return a.winnerSlot === slot;
  return slot === firstSlotOf(chit, a.winnerId);
}

/** Face loan amount (before upfront interest cut). */
export function loanFaceAmount(a: AuctionRecord) {
  const bid = Math.max(0, Number(a.bid) || 0);
  if (bid > 0) return bid;
  return (
    Math.max(0, Number(a.payout) || 0)
    + Math.max(0, Number(a.discount) || 0)
    + Math.max(0, Number(a.arrearsWithheld) || 0)
  );
}

export function firstLoanCycle(chit: Chit, memberId: string, slot?: number) {
  const cycles = chit.auctions
    .filter((a) => a.winnerId === memberId && a.method === "fixed" && loanMatchesHand(chit, a, slot))
    .map((a) => a.cycle);
  return cycles.length ? Math.min(...cycles) : 0;
}

/** Months left in the chit after the loan month (repayment window). */
export function loanRemainingMonths(chit: Chit, startCycle: number) {
  return Math.max(0, (chit.duration || 0) - startCycle);
}

/**
 * Repayment months for a loan taken in `startCycle`.
 * Never longer than the remaining bhishi tenure.
 */
export function loanEffectiveTenure(chit: Chit, startCycle: number) {
  const remaining = loanRemainingMonths(chit, startCycle);
  if (remaining <= 0) return 1;
  const configured =
    chit.repaymentTenure && chit.repaymentTenure > 0
      ? chit.repaymentTenure
      : remaining;
  return Math.max(1, Math.min(configured, remaining));
}

export function loanRateOf(
  chit: Chit,
  auction?: Pick<AuctionRecord, "interestRate"> | null,
  override?: number | null,
) {
  if (override != null && Number.isFinite(Number(override))) {
    return Math.max(0, Number(override));
  }
  if (auction?.interestRate != null && Number.isFinite(Number(auction.interestRate))) {
    return Math.max(0, Number(auction.interestRate));
  }
  return Math.max(0, chit.interestRate || 0);
}

export function loanMonthlyInterest(chit: Chit, principal: number, rateOverride?: number | null) {
  const rate = loanRateOf(chit, null, rateOverride);
  return Math.round((principal * rate) / 100);
}

/** Whether this chit cuts interest from the payout when the loan is given (default true). */
export function loanCutsInterestUpfront(chit: Chit) {
  return chit.loanInterestUpfront !== false;
}

export function loanHadUpfrontInterest(chit: Chit, memberId: string, slot?: number) {
  return chit.auctions.some(
    (a) =>
      a.winnerId === memberId
      && a.method === "fixed"
      && loanMatchesHand(chit, a, slot)
      && (Number(a.discount) || 0) > 0,
  );
}

/** Equal principal share for monthIndex (1..tenure) under EMI / reducing mode. */
function loanEmiPrincipalShare(face: number, tenure: number, monthIndex: number) {
  const baseShare = Math.ceil(face / tenure);
  if (monthIndex === tenure) {
    return Math.max(0, face - baseShare * (tenure - 1));
  }
  return baseShare;
}

/** Outstanding principal before repayment monthIndex (1-based) for EMI reducing schedule. */
function loanEmiOutstandingBefore(face: number, tenure: number, monthIndex: number) {
  if (monthIndex <= 1) return face;
  const baseShare = Math.ceil(face / tenure);
  return Math.max(0, face - baseShare * (monthIndex - 1));
}

/**
 * Interest + principal due in `cycle` for one loan auction row.
 * - end (balloon): straight-line interest on face; principal only on last month
 * - emi: equal principal slices; interest = rate × outstanding (reducing balance)
 */
export function loanAuctionPartsDue(
  chit: Chit,
  auction: AuctionRecord,
  cycle: number,
): { interest: number; principal: number; monthIndex: number; tenure: number } {
  const face = loanFaceAmount(auction);
  const start = auction.cycle;
  const tenure = loanEffectiveTenure(chit, start);
  const monthIndex = cycle - start;
  if (monthIndex < 1 || monthIndex > tenure || face <= 0) {
    return { interest: 0, principal: 0, monthIndex, tenure };
  }
  const hadUpfront = (Number(auction.discount) || 0) > 0;
  const balloon = (chit.loanPrincipalMode || "emi") === "end";
  const rate = loanRateOf(chit, auction);

  if (balloon) {
    const interestFlat = loanMonthlyInterest(chit, face, rate);
    const interest = hadUpfront && monthIndex === 1 ? 0 : interestFlat;
    const principal = monthIndex === tenure ? face : 0;
    return { interest, principal, monthIndex, tenure };
  }

  const outstanding = loanEmiOutstandingBefore(face, tenure, monthIndex);
  const interestReducing = loanMonthlyInterest(chit, outstanding, rate);
  const interest = hadUpfront && monthIndex === 1 ? 0 : interestReducing;
  const principal = loanEmiPrincipalShare(face, tenure, monthIndex);
  return { interest, principal, monthIndex, tenure };
}

function loansForHand(chit: Chit, memberId: string, slot?: number) {
  return chit.auctions.filter(
    (a) => a.winnerId === memberId && a.method === "fixed" && loanMatchesHand(chit, a, slot),
  );
}

/**
 * Loan due for one hand = deposit + interest + principal for that hand’s loan(s).
 */
export function loanCycleDue(chit: Chit, memberId: string, cycle: number, slot?: number) {
  const base = baseInstalment(chit);
  const loans = loansForHand(chit, memberId, slot);
  if (!loans.length) return base;
  let interest = 0;
  let principal = 0;
  for (const a of loans) {
    const part = loanAuctionPartsDue(chit, a, cycle);
    interest += part.interest;
    principal += part.principal;
  }
  return base + interest + principal;
}

/** Interest portion due in a repayment cycle for this hand. */
export function loanInterestDueInCycle(chit: Chit, memberId: string, cycle: number, slot?: number) {
  return loansForHand(chit, memberId, slot).reduce(
    (s, a) => s + loanAuctionPartsDue(chit, a, cycle).interest,
    0,
  );
}

/** Principal share due in a repayment cycle for this hand (0 before/after tenure). */
export function loanPrincipalDueInCycle(chit: Chit, memberId: string, cycle: number, slot?: number) {
  return loansForHand(chit, memberId, slot).reduce(
    (s, a) => s + loanAuctionPartsDue(chit, a, cycle).principal,
    0,
  );
}

/**
 * Split one cycle’s cash payment into deposit (monthly instalment), interest, and principal.
 * Order: deposit → interest → principal → leftover as deposit (advance).
 */
export function allocateLoanPaymentInCycle(
  chit: Chit,
  memberId: string,
  cycle: number,
  slot?: number,
) {
  const paid = paidInCycle(chit, memberId, cycle, slot);
  const depositDue = baseInstalment(chit);
  const interestDue = chit.type === "loan" ? loanInterestDueInCycle(chit, memberId, cycle, slot) : 0;
  const principalDue = chit.type === "loan" ? loanPrincipalDueInCycle(chit, memberId, cycle, slot) : 0;

  let left = Math.max(0, paid);
  const deposit = Math.min(left, depositDue);
  left -= deposit;
  const interest = Math.min(left, interestDue);
  left -= interest;
  const principal = Math.min(left, principalDue);
  left -= principal;
  return {
    deposit: deposit + left, // advances count toward contributions
    interest,
    principal,
  };
}

/**
 * Ledger “Paid in” for a loan hand = monthly deposits only (not principal repayment).
 */
export function loanContributionPaid(chit: Chit, memberId: string, slot?: number) {
  let total = 0;
  const through = displayCycle(chit);
  for (let c = 1; c <= through; c++) {
    total += allocateLoanPaymentInCycle(chit, memberId, c, slot).deposit;
  }
  return total;
}

/** Principal actually repaid from receipts (allocated). */
export function loanPrincipalRepaid(chit: Chit, memberId: string, slot?: number) {
  let total = 0;
  const through = displayCycle(chit);
  for (let c = 1; c <= through; c++) {
    total += allocateLoanPaymentInCycle(chit, memberId, c, slot).principal;
  }
  return total;
}

/** No new loans on the last month of the bhishi. */
export function canGiveLoan(chit: Chit) {
  return chit.type === "loan" && displayCycle(chit) < chit.duration;
}

export function surplusBefore(chit: Chit, memberId: string, cycle: number, slot?: number) {
  let surplus = 0;
  for (let c = 1; c < cycle; c++) {
    surplus += paidInCycle(chit, memberId, c, slot) - rawCycleDue(chit, memberId, c, slot);
  }
  return surplus;
}

export function cycleDue(chit: Chit, memberId: string, cycle: number, slot?: number) {
  const raw = rawCycleDue(chit, memberId, cycle, slot);
  const carry = surplusBefore(chit, memberId, cycle, slot);
  if (carry >= 0) return Math.max(0, raw - carry);
  return raw + Math.abs(carry);
}

export function displayCycle(chit: Chit) {
  return Math.min(Math.max(1, chit.currentCycle || 1), Math.max(1, chit.duration || 1));
}

/** True once any money or award has been recorded — members can only be swapped, not added/removed. */
export function chitHasStarted(chit: Chit) {
  if ((chit.currentCycle || 1) > 1) return true;
  if (chit.payments.length > 0) return true;
  if (chit.auctions.length > 0) return true;
  if (chit.members.some((m) => m.prizedCycle != null)) return true;
  return false;
}

/** Last auction month: remaining member takes all cash; no discount / dividend / commission. */
export function isLastAuctionCycle(chit: Chit) {
  if (chit.type !== "auction") return false;
  const cycle = displayCycle(chit);
  const unprized = chit.members.filter((m) => !m.prizedCycle).length;
  return cycle >= chit.duration || unprized <= 1;
}

export function memberBalance(chit: Chit, memberId: string, slot?: number) {
  let due = 0;
  let paid = 0;
  const through = displayCycle(chit);
  for (let c = 1; c <= through; c++) {
    due += rawCycleDue(chit, memberId, c, slot);
    paid += paidInCycle(chit, memberId, c, slot);
  }
  return { due, paid, outstanding: Math.max(0, due - paid) };
}

/**
 * Calendar start of hapta `cycle` (1-based), honouring frequency.
 * 15-day (biweekly) advances by 15 days; monthly by calendar month.
 */
export function cycleStartDate(
  chit: Pick<Chit, "startDate" | "frequency">,
  cycle: number,
): Date {
  const d = new Date(chit.startDate);
  if (Number.isNaN(d.getTime())) return d;
  const n = Math.max(0, (cycle || 1) - 1);
  switch (chit.frequency) {
    case "daily":
      d.setDate(d.getDate() + n);
      break;
    case "weekly":
      d.setDate(d.getDate() + n * 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + n * 15);
      break;
    case "monthly":
    default:
      d.setMonth(d.getMonth() + n);
      break;
  }
  return d;
}

/** End date of the bhishi = start of the cycle after the last hapta. */
export function chitEndDate(
  chit: Pick<Chit, "startDate" | "frequency" | "duration">,
): Date {
  return cycleStartDate(chit, (chit.duration || 1) + 1);
}

/** Total outstanding for one person across non-cancelled groups (all hands). */
export function customerOutstanding(
  chits: Chit[],
  customerId: string,
  opts?: { runningOnly?: boolean },
) {
  return chits.reduce((sum, ch) => {
    if (ch.status === "cancelled") return sum;
    if (opts?.runningOnly && ch.status !== "running") return sum;
    if (!ch.members.some((m) => m.customerId === customerId)) return sum;
    return (
      sum +
      ch.members
        .filter((m) => m.customerId === customerId)
        .reduce((hs, m) => hs + memberBalance(ch, customerId, m.slot).outstanding, 0)
    );
  }, 0);
}

export function chitProgress(chit: Chit) {
  if (!chit.duration) return 0;
  if (chit.status === "completed") return 100;
  if (chit.members.length && chit.payments.length) {
    const totals = chit.members.map((m) => memberBalance(chit, m.customerId, m.slot));
    const due = totals.reduce((s, t) => s + t.due, 0);
    const paid = totals.reduce((s, t) => s + t.paid, 0);
    if (due > 0) return Math.min(100, Math.round((paid / due) * 100));
  }
  return Math.min(100, Math.round(((displayCycle(chit) - 1) / chit.duration) * 100));
}

export function collectedThisCycle(chit: Chit) {
  const cyc = displayCycle(chit);
  if (isAuctionFirst(chit)) return auctionFirstCollectedInCycle(chit, cyc);
  return chit.payments
    .filter((p) => p.cycle === cyc)
    .reduce((s, p) => s + p.amount, 0);
}

export function moneyIn(chit: Chit) {
  let total = chit.payments.reduce((s, p) => s + p.amount, 0);
  if (!isAuctionFirst(chit)) return total;
  for (const a of chit.auctions) {
    if (a.method && a.method !== "auction" && a.method !== "lucky_draw") continue;
    const cash = chit.payments
      .filter((p) => p.memberId === a.winnerId && p.cycle === a.cycle)
      .reduce((s, p) => s + p.amount, 0);
    total += auctionFirstSelfCredit(chit, a.winnerId, a.cycle, cash);
  }
  return total;
}

export function payoutsOf(chit: Chit) {
  return chit.auctions.reduce((s, a) => s + a.payout, 0);
}

export function moneyOut(chit: Chit) {
  let out = payoutsOf(chit) + commissionEarned(chit);
  // Sacrifice-hand: discount is paid out as cash dividends to remaining players.
  if (isHandSacrifice(chit)) {
    out += chit.auctions
      .filter((a) => a.method !== "settlement")
      .reduce((s, a) => s + Math.max(0, Number(a.discount) || 0), 0);
  }
  return out;
}

/**
 * Cash on hand.
 * Auction-first is pure peer settlement of each winning bid (bid ÷ N each, including
 * the winner’s self-share). Payments may be recorded in any month — once the books
 * are funded, nothing sits in a till. Always ₹0 (unpaid amounts are Outstanding).
 */
export function treasuryOf(chit: Chit) {
  if (!isAuctionFirst(chit)) {
    return moneyIn(chit) - moneyOut(chit);
  }
  return 0;
}

/** Receipts + winner self-contribution for one auction-first cycle. */
export function auctionFirstCollectedInCycle(chit: Chit, cycle: number) {
  let collected = chit.payments
    .filter((p) => p.cycle === cycle)
    .reduce((s, p) => s + p.amount, 0);
  for (const m of chit.members) {
    const memberCash = chit.payments
      .filter((p) => p.memberId === m.customerId && p.cycle === cycle)
      .reduce((s, p) => s + p.amount, 0);
    collected += auctionFirstSelfCredit(chit, m.customerId, cycle, memberCash);
  }
  return collected;
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
  /** One hapta of deposits when every hand pays base share (remainder on max slot = pot). */
  const cycleBase = (() => {
    if (!chit.members.length) {
      return baseInstalment(chit) * n + potCoverRemainder(chit.pot, n);
    }
    let total = chit.members.reduce((s, m) => s + handInstalment(chit, m.slot), 0);
    const empty = Math.max(0, n - chit.members.length);
    if (empty) total += empty * baseInstalment(chit);
    return total;
  })();
  const base = cycleBase * chit.duration;
  if (chit.type === "auction") return Math.max(0, base - dividendsHeld(chit));
  if (chit.type === "base_premium" || (chit.type === "fixed" && chit.premiumAmount)) {
    let total = 0;
    for (let c = 1; c <= chit.duration; c++) {
      for (const m of chit.members) total += rawCycleDue(chit, m.customerId, c, m.slot);
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

/** Cash a member (or one hand) has paid into the chit. */
export function memberPaidTotal(chit: Chit, memberId: string, slot?: number) {
  let total = 0;
  const through = Math.max(
    displayCycle(chit),
    ...chit.payments.filter((p) => p.memberId === memberId).map((p) => p.cycle),
    ...chit.auctions.filter((a) => a.winnerId === memberId).map((a) => a.cycle),
    0,
  );
  for (let c = 1; c <= through; c++) {
    total += paidInCycle(chit, memberId, c, slot);
  }
  return total;
}

/** Cash a member (or one hand) received from pot / loan / settlement / hand-sacrifice dividends. */
export function memberReceivedTotal(chit: Chit, memberId: string, slot?: number) {
  const asWinner = chit.auctions
    .filter((a) => a.winnerId === memberId && loanMatchesHand(chit, a, slot))
    .reduce((s, a) => s + a.payout, 0);
  return asWinner + handSacrificeDividendsReceived(chit, memberId, slot);
}

/**
 * Cash dividends from sacrifice-hand months where this hand was still playing
 * (had not won yet) and was not that month’s winning hand.
 */
export function handSacrificeDividendsReceived(chit: Chit, memberId: string, slot?: number) {
  if (!isHandSacrifice(chit)) return 0;
  const hands = slot != null
    ? handsOf(chit, memberId).filter((h) => h.slot === slot)
    : handsOf(chit, memberId);
  let total = 0;
  for (const a of chit.auctions) {
    if (a.method === "settlement") continue;
    for (const hand of hands) {
      total += handSacrificeShareForHand(chit, a, hand.customerId, hand.slot);
    }
  }
  return total;
}

/** Per-hand cash share of a sacrifice-hand auction’s discount pool. */
export function handSacrificeShareForHand(
  chit: Chit,
  auction: AuctionRecord,
  memberId: string,
  slot: number,
) {
  const recipients = handSacrificeRecipientHands(chit, auction);
  const idx = recipients.findIndex((m) => m.customerId === memberId && m.slot === slot);
  if (idx < 0) return 0;
  const pool = Math.max(0, Number(auction.discount) || 0);
  if (!recipients.length || pool <= 0) return 0;
  const each = Math.floor(pool / recipients.length);
  const rem = pool - each * recipients.length;
  return each + (idx < rem ? 1 : 0);
}

/** @deprecated Prefer handSacrificeShareForHand — aggregates all hands of the person. */
export function handSacrificeShareForMember(
  chit: Chit,
  auction: AuctionRecord,
  memberId: string,
) {
  return handsOf(chit, memberId).reduce(
    (s, h) => s + handSacrificeShareForHand(chit, auction, memberId, h.slot),
    0,
  );
}

/** Unprized hands at award time, excluding the winning hand (slot order). */
export function handSacrificeRecipientHands(chit: Chit, auction: AuctionRecord) {
  const winSlot = auction.winnerSlot ?? firstSlotOf(chit, auction.winnerId);
  return [...chit.members]
    .filter((m) => {
      if (m.customerId === auction.winnerId && m.slot === winSlot) return false;
      if (m.prizedCycle && m.prizedCycle < auction.cycle) return false;
      return true;
    })
    .sort((a, b) => a.slot - b.slot);
}

/** Unprized member ids at award time (unique people). Prefer handSacrificeRecipientHands for multi-hand. */
export function handSacrificeRecipients(chit: Chit, auction: AuctionRecord) {
  return [...new Set(handSacrificeRecipientHands(chit, auction).map((m) => m.customerId))];
}

/** One full instalment left in the pot as cash dividends (e.g. ₹10k hand → ₹10k cut on ₹50k pot). */
export function handSacrificeAmount(chit: Chit) {
  return Math.max(0, Math.round(baseInstalment(chit)));
}

export function isLastHandSacrificeAward(chit: Chit) {
  return chit.members.filter((m) => !m.prizedCycle).length <= 1;
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
  if (isHandSacrifice(chit)) {
    return chit.members.map((m) => {
      const paid = memberPaidTotal(chit, m.customerId, m.slot);
      const potWon = chit.auctions
        .filter((a) => a.winnerId === m.customerId && a.method !== "settlement" && loanMatchesHand(chit, a, m.slot))
        .reduce((s, a) => s + a.payout, 0);
      const dividend = handSacrificeDividendsReceived(chit, m.customerId, m.slot);
      const received = potWon + dividend;
      return {
        customerId: m.customerId,
        slot: m.slot,
        prizedCycle: m.prizedCycle,
        paid,
        received,
        dividend,
        loanOut: 0,
        interestPaid: 0,
        net: received - paid,
      };
    });
  }
  if (chit.type === "loan") {
    return chit.members.map((m) => {
      // Paid in = monthly deposits only — principal repayment is excluded.
      const contribution = loanContributionPaid(chit, m.customerId, m.slot);
      const principalRepaid = loanPrincipalRepaid(chit, m.customerId, m.slot);
      let interestFromReceipts = 0;
      const through = displayCycle(chit);
      for (let c = 1; c <= through; c++) {
        interestFromReceipts += allocateLoanPaymentInCycle(chit, m.customerId, c, m.slot).interest;
      }
      const loanOut = chit.auctions
        .filter((a) => a.winnerId === m.customerId && a.method === "fixed" && loanMatchesHand(chit, a, m.slot))
        .reduce((s, a) => s + a.payout, 0);
      const settled = chit.auctions
        .filter((a) => a.winnerId === m.customerId && a.method === "settlement")
        .reduce((s, a) => s + a.payout, 0);
      // Split person-level settlement across that person’s hands so multi-hand nets stay fair.
      const handN = Math.max(1, handsOf(chit, m.customerId).length);
      const settledEach = Math.floor(settled / handN);
      const settledRem = settled - settledEach * handN;
      const settledHere = settledEach + (m.slot === firstSlotOf(chit, m.customerId) ? settledRem : 0);
      // Column shows all interest (upfront cut + monthly); net only subtracts monthly from receipts
      // because upfront is already reflected in a lower loan payout.
      const interestPaid = interestPaidByMember(chit, m.customerId, m.slot);
      const divTotal = loanInterestDividendShare(chit, m.customerId);
      const divEach = Math.floor(divTotal / handN);
      const divRem = divTotal - divEach * handN;
      const dividend = divEach + (m.slot === firstSlotOf(chit, m.customerId) ? divRem : 0);
      // Member is ahead by any unpaid principal (loan still outstanding) and by settlement cash;
      // behind by monthly deposits and interest paid from receipts. Fully repaid ⇒ unpaid = 0.
      // Upfront interest is already netted in a lower loanOut, so only receipt interest is subtracted.
      const unpaidPrincipal = Math.max(0, loanOut - principalRepaid);
      const net = unpaidPrincipal + settledHere - contribution - interestFromReceipts;
      return {
        customerId: m.customerId,
        slot: m.slot,
        prizedCycle: m.prizedCycle,
        paid: contribution,
        received: loanOut + settledHere,
        dividend,
        interestPaid,
        loanOut,
        principalRepaid,
        net,
      };
    });
  }
  const divEach = memberDividendTotal(chit);
  return chit.members.map((m) => {
    const paid = memberPaidTotal(chit, m.customerId, m.slot);
    const received = memberReceivedTotal(chit, m.customerId, m.slot);
    return {
      customerId: m.customerId,
      slot: m.slot,
      prizedCycle: m.prizedCycle,
      paid,
      received,
      dividend: divEach,
      loanOut: 0,
      interestPaid: 0,
      net: received + divEach - paid,
    };
  });
}

export function isFixedLike(chit: Chit) {
  return (
    chit.type === "fixed"
    || chit.type === "base_premium"
    || chit.type === "lucky_draw"
    || chit.type === "hand_sacrifice"
  );
}

export function isLuckyDrawChit(chit: Chit) {
  return chit.type === "lucky_draw" || chit.fixedStyle === "lucky_draw";
}

export function isHandSacrifice(chit: Chit) {
  return chit.type === "hand_sacrifice" || chit.fixedStyle === "hand_sacrifice";
}

/** Next unprized member in slot order (Fixed / Base+premium payout queue). */
export function nextBySlot(chit: Chit) {
  return [...chit.members]
    .filter((m) => !m.prizedCycle)
    .sort((a, b) => a.slot - b.slot)[0];
}

export function expectedThisCycle(chit: Chit) {
  const cyc = displayCycle(chit);
  return chit.members.reduce((s, m) => s + rawCycleDue(chit, m.customerId, cyc, m.slot), 0);
}

/** True when every hand has paid (or overpaid) this month’s dues. */
export function cycleFullyCollected(chit: Chit) {
  if (!chit.members.length) return false;
  const cyc = displayCycle(chit);
  return chit.members.every((m) => {
    const st = paymentStatus(chit, m.customerId, cyc, m.slot);
    return st === "paid" || st === "advance";
  });
}

/** Amount still unpaid for the current hapta (cycle dues − paid). */
export function remainingCollectionsThisCycle(chit: Chit) {
  const cyc = displayCycle(chit);
  return chit.members.reduce((s, m) => {
    const due = cycleDue(chit, m.customerId, cyc, m.slot);
    const paid = paidInCycle(chit, m.customerId, cyc, m.slot);
    return s + Math.max(0, due - paid);
  }, 0);
}

/**
 * Max funds available to give as a loan: cash on hand + still expected this month.
 * Allows award-first (loan before collect) without going beyond what the month will bring in.
 */
export function loanFundingCapacity(chit: Chit) {
  return Math.max(0, treasuryOf(chit)) + remainingCollectionsThisCycle(chit);
}

/** Max face loan amount that may be sanctioned (never above funding capacity). */
export function loanMaxFaceAmount(chit: Chit) {
  return Math.max(0, Math.floor(loanFundingCapacity(chit)));
}

export function commissionEarned(chit: Chit) {
  return chit.auctions.reduce((s, a) => s + (a.commission || 0), 0);
}

export function interestCollected(chit: Chit) {
  if (chit.type !== "loan") return 0;
  return chit.members.reduce((sum, m) => sum + interestPaidByMember(chit, m.customerId, m.slot), 0);
}

/** Interest this hand (or person) has paid in. */
export function interestPaidByMember(chit: Chit, memberId: string, slot?: number) {
  if (chit.type !== "loan") return 0;
  let total = 0;
  for (const a of chit.auctions) {
    if (a.winnerId === memberId && a.method === "fixed" && loanMatchesHand(chit, a, slot)) {
      total += Math.max(0, Number(a.discount) || 0);
    }
  }
  const through = displayCycle(chit);
  for (let c = 1; c <= through; c++) {
    if (paidInCycle(chit, memberId, c, slot) <= 0) continue;
    total += loanInterestDueInCycle(chit, memberId, c, slot);
  }
  return total;
}

/**
 * End-of-tenure interest dividend for one person: share of everyone else’s interest.
 */
export function loanInterestDividendShare(chit: Chit, memberId: string) {
  if (chit.type !== "loan") return 0;
  const people = uniqueMemberIds(chit);
  const n = people.length;
  if (n <= 1) return 0;
  const total = interestCollected(chit);
  const own = interestPaidByMember(chit, memberId);
  return Math.max(0, Math.floor((total - own) / (n - 1)));
}

/**
 * Final loan settlement: interest pool → dividends to other people, then leftover equally.
 */
export function loanSettlementPlan(chit: Chit) {
  const cash = Math.max(0, treasuryOf(chit));
  const people = uniqueMemberIds(chit);
  const n = people.length;
  if (!n || cash <= 0) return [] as { memberId: string; amount: number; interestPart: number; equalPart: number }[];

  const interestParts = people.map((id) => ({
    memberId: id,
    interestPart: loanInterestDividendShare(chit, id),
  }));
  let interestSum = interestParts.reduce((s, r) => s + r.interestPart, 0);
  const interestCap = Math.min(interestCollected(chit), cash);
  let remI = interestCap - interestSum;
  for (let i = 0; i < interestParts.length && remI > 0; i++) {
    interestParts[i].interestPart += 1;
    remI -= 1;
    interestSum += 1;
  }
  if (interestSum > interestCap) {
    let over = interestSum - interestCap;
    for (let i = interestParts.length - 1; i >= 0 && over > 0; i--) {
      const cut = Math.min(over, interestParts[i].interestPart);
      interestParts[i].interestPart -= cut;
      over -= cut;
    }
    interestSum = interestParts.reduce((s, r) => s + r.interestPart, 0);
  }

  const leftover = Math.max(0, cash - interestSum);
  const equal = Math.floor(leftover / n);
  const remE = leftover - equal * n;

  return interestParts.map((row, i) => {
    const equalPart = equal + (i < remE ? 1 : 0);
    return {
      memberId: row.memberId,
      interestPart: row.interestPart,
      equalPart,
      amount: row.interestPart + equalPart,
    };
  });
}

export function loansThisCycle(chit: Chit) {
  const cyc = displayCycle(chit);
  return chit.auctions.filter((a) => a.cycle === cyc && a.method === "fixed");
}

export function settlementsOf(chit: Chit) {
  return chit.auctions.filter((a) => a.method === "settlement");
}

export function outstandingLoanPrincipal(chit: Chit) {
  return chit.members.reduce((s, m) => s + loanPrincipalOf(chit, m.customerId, m.slot), 0);
}

/** Per-loan rows for overview: who (hand), when, face, cut, tenure, schedule. */
export function loanDetailRows(chit: Chit) {
  return chit.auctions
    .filter((a) => a.method === "fixed")
    .map((a) => {
      const face = loanFaceAmount(a);
      const tenure = loanEffectiveTenure(chit, a.cycle);
      const balloon = (chit.loanPrincipalMode || "emi") === "end";
      const rate = loanRateOf(chit, a);
      const interestMo = loanMonthlyInterest(chit, face, rate);
      const share = balloon ? face : Math.ceil(face / tenure);
      return {
        id: a.id,
        cycle: a.cycle,
        memberId: a.winnerId,
        slot: a.winnerSlot ?? firstSlotOf(chit, a.winnerId),
        face,
        upfrontInterest: Math.max(0, Number(a.discount) || 0),
        netPaidOut: a.payout,
        commission: a.commission || 0,
        tenure,
        remainingAtLoan: loanRemainingMonths(chit, a.cycle),
        interestRate: rate,
        interestPerMonth: interestMo,
        interestReducing: !balloon,
        principalSharePerMonth: share,
        principalAtEnd: balloon,
        repayFrom: a.cycle + 1,
        repayTo: a.cycle + tenure,
      };
    });
}

export type LoanScheduleRow = {
  monthIndex: number;
  cycle: number;
  deposit: number;
  interest: number;
  principal: number;
  total: number;
  note?: string;
};

/** Month-by-month repayment schedule for one loan award. */
export function loanRepaymentSchedule(chit: Chit, auction: AuctionRecord): LoanScheduleRow[] {
  const start = auction.cycle;
  const tenure = loanEffectiveTenure(chit, start);
  const deposit = baseInstalment(chit);
  const hadUpfront = (Number(auction.discount) || 0) > 0;
  const balloon = (chit.loanPrincipalMode || "emi") === "end";
  const rows: LoanScheduleRow[] = [];
  for (let i = 1; i <= tenure; i++) {
    const cycle = start + i;
    const part = loanAuctionPartsDue(chit, auction, cycle);
    rows.push({
      monthIndex: i,
      cycle,
      deposit,
      interest: part.interest,
      principal: part.principal,
      total: deposit + part.interest + part.principal,
      note: balloon && i === tenure
        ? "Principal due in full"
        : balloon
          ? "Interest only (+ hapta)"
          : hadUpfront && i === 1
            ? "Interest already cut at disbursal"
            : !balloon
              ? "Reducing-balance interest"
              : undefined,
    });
  }
  return rows;
}

export function outstandingOf(chit: Chit) {
  return chit.members.reduce(
    (s, m) => s + memberBalance(chit, m.customerId, m.slot).outstanding,
    0,
  );
}

/**
 * Last month may close only when every hand’s dues are fully paid (no outstanding).
 * Also blocks completing the chit while any hand still owes money.
 */
export function canCloseLastMonth(chit: Chit) {
  const cycle = displayCycle(chit);
  if (cycle < chit.duration) return { ok: true as const };
  if (outstandingOf(chit) > 0.001) {
    return {
      ok: false as const,
      reason: "Clear all outstanding dues before closing the last month.",
    };
  }
  for (const m of chit.members) {
    if (paymentStatus(chit, m.customerId, cycle, m.slot) === "due") {
      return {
        ok: false as const,
        reason: "Record every hand’s payment for this month before closing.",
      };
    }
  }
  if (!chit.members.length) {
    return {
      ok: false as const,
      reason: "Add members before closing the last month.",
    };
  }
  if (chit.type === "loan" && treasuryOf(chit) > 0.001) {
    return {
      ok: false as const,
      reason:
        "Run final settlement (interest dividends + leftover) on the Settlement tab before closing the last month.",
    };
  }
  return { ok: true as const };
}

export function settleWinner(
  chit: Chit,
  winnerId: string,
  bid: number,
  method: AuctionRecord["method"],
  winnerSlot?: number,
  interestRate?: number,
): AuctionRecord {
  const alreadyLoanedThisCycle = chit.auctions.some(
    (a) => a.cycle === chit.currentCycle && a.method === "fixed",
  );
  const lastAuction = (method === "auction" || method === "lucky_draw") && isLastAuctionCycle(chit);
  const auctionPeer = isAuctionFirst(chit) && (method === "auction" || method === "lucky_draw");
  const awardFirst = isAwardFirst(chit);
  const handSacrifice = isHandSacrifice(chit) && (method === "fixed" || method === "lucky_draw");
  const lastHand = handSacrifice && isLastHandSacrificeAward(chit);
  const loanRate = method === "fixed" && chit.type === "loan"
    ? loanRateOf(chit, null, interestRate)
    : 0;
  // Foreman commission on every award type (incl. auction-first peer), except last cycle / settlement / extra loans same month.
  const commission =
    method === "settlement" || lastAuction
      ? 0
      : method === "fixed" && chit.type === "loan" && alreadyLoanedThisCycle
        ? 0
        : method === "lucky_draw" || method === "auction" || method === "fixed"
          ? commissionAmount(chit)
          : 0;
  let safeBid: number;
  let dividend = 0;
  let discount = 0;
  if (handSacrifice) {
    // Early winners leave one full instalment as cash dividends for hands still playing.
    // Last remaining hand takes the full pot (no dividend pool).
    discount = lastHand ? 0 : handSacrificeAmount(chit);
    const facePrize = Math.max(0, chit.pot - discount - commission);
    if (awardFirst) {
      safeBid = facePrize;
    } else {
      const maxPayout = Math.max(0, treasuryOf(chit) - commission - discount);
      safeBid = Math.min(facePrize, maxPayout);
    }
    const winSlot =
      winnerSlot
      ?? chit.members.find((m) => m.customerId === winnerId && !m.prizedCycle)?.slot
      ?? firstSlotOf(chit, winnerId);
    const remaining = chit.members.filter((m) => {
      if (m.customerId === winnerId && m.slot === winSlot) return false;
      return !m.prizedCycle;
    }).length;
    dividend = remaining > 0 && discount > 0 ? Math.floor(discount / remaining) : 0;
  } else if (lastAuction && auctionPeer) {
    safeBid = Math.max(0, chit.pot);
  } else if (lastAuction) {
    safeBid = awardFirst ? Math.max(0, chit.pot - commission) : Math.max(0, treasuryOf(chit));
  } else if (method === "auction") {
    // Bid = amount the winner takes (face award). Never invent a different award in the books.
    safeBid = Math.min(chit.pot, Math.max(0, bid));
    if (!auctionPeer) {
      // Collect-first: cash must cover award + commission. Prefer keeping the entered award
      // when the till is funded; only clamp when cash is short.
      const available = Math.max(0, treasuryOf(chit));
      const maxPayout = Math.max(0, available - commission);
      if (safeBid > maxPayout) safeBid = maxPayout;
      discount = Math.max(0, chit.pot - safeBid);
      dividend = Math.floor(Math.max(0, discount - commission) / memberCount(chit));
    }
  } else if (method === "lucky_draw") {
    safeBid = Math.max(0, chit.pot - commission);
    if (!awardFirst) {
      const maxPayout = Math.max(0, treasuryOf(chit) - commission);
      safeBid = Math.min(safeBid, maxPayout);
    }
  } else if (method === "fixed" && chit.type === "loan") {
    // Face principal; clamp to cash on hand + still expected this month.
    const maxFace = loanMaxFaceAmount(chit);
    safeBid = Math.min(Math.max(0, Number(bid) || 0), maxFace);
    discount = loanCutsInterestUpfront(chit) ? loanMonthlyInterest(chit, safeBid, loanRate) : 0;
  } else if (method === "fixed" && (chit.type === "fixed" || chit.type === "base_premium" || chit.type === "lucky_draw" || chit.type === "hand_sacrifice")) {
    const requested = Math.max(0, Number(bid) || chit.pot);
    if (awardFirst) {
      // Award from organiser float — pot (minus commission when awarding the full face).
      safeBid = Math.min(requested, chit.pot);
      if (safeBid >= chit.pot && commission > 0) safeBid = Math.max(0, chit.pot - commission);
    } else {
      const maxPayout = Math.max(0, treasuryOf(chit) - commission);
      safeBid = Math.min(requested, maxPayout);
    }
  } else {
    safeBid = Math.max(0, Number(bid) || 0);
  }
  // Auction peer: full bid is what the winner gets; peers settle bid ÷ N separately.
  const arrearsWithheld = method === "settlement" || auctionPeer
    ? 0
    : memberBalance(chit, winnerId, winnerSlot).outstanding;
  let payout = Math.max(0, safeBid - arrearsWithheld);
  if (method === "fixed" && chit.type === "loan") {
    payout = Math.max(0, safeBid - discount - arrearsWithheld);
    // Cash leaving (payout + commission) must not exceed funding capacity.
    const capacity = loanFundingCapacity(chit);
    const maxNet = Math.max(0, capacity - commission);
    if (payout > maxNet) payout = maxNet;
  }
  return {
    cycle: chit.currentCycle,
    winnerId,
    winnerSlot: winnerSlot
      ?? chit.members.find((m) => m.customerId === winnerId && !m.prizedCycle)?.slot
      ?? chit.members.find((m) => m.customerId === winnerId)?.slot,
    bid: safeBid,
    method,
    discount,
    commission,
    dividend,
    payout,
    arrearsWithheld,
    interestRate: method === "fixed" && chit.type === "loan" ? loanRate : undefined,
  };
}

export function paymentStatus(chit: Chit, memberId: string, cycle: number, slot?: number) {
  const due = cycleDue(chit, memberId, cycle, slot);
  const paid = paidInCycle(chit, memberId, cycle, slot);
  if (due === 0) return paid > 0 ? ("advance" as const) : ("paid" as const);
  if (paid >= due) return paid > due ? ("advance" as const) : ("paid" as const);
  if (paid > 0) return "partial" as const;
  return "due" as const;
}

export function collectedCount(chit: Chit) {
  const cyc = displayCycle(chit);
  return chit.members.filter((m) => paymentStatus(chit, m.customerId, cyc, m.slot) !== "due").length;
}

/** Award unlocked: award-first can award immediately; collect-first needs every hand paid. */
export function canSettleCycle(chit: Chit) {
  if (!chit.members.length) return false;
  if (isAwardFirst(chit)) return true;
  return cycleFullyCollected(chit);
}

/** Close month: every hand must have paid this month’s dues (all bhishi types). */
export function canCloseCurrentCycle(chit: Chit) {
  if (!chit.members.length) {
    return { ok: false as const, reason: "Add members before closing a cycle" };
  }
  if (!cycleFullyCollected(chit)) {
    const left = remainingCollectionsThisCycle(chit);
    return {
      ok: false as const,
      reason: `Collect every hand’s dues for this month before closing (${Math.round(left)} still outstanding).`,
    };
  }
  return { ok: true as const };
}

export function assertCanSettlePayout(
  chit: Chit,
  winnerId: string,
  bid: number,
  method: AuctionRecord["method"],
  winnerSlot?: number,
  interestRate?: number,
) {
  if (method === "fixed" && chit.type === "loan" && !canGiveLoan(chit)) {
    throw new Error("No new loans on the last month — collect dues and settle leftover cash instead");
  }
  const awardFirst = isAwardFirst(chit);
  if (method !== "settlement" && !canSettleCycle(chit)) {
    throw new Error(
      awardFirst
        ? "Record this month's collections before the auction"
        : "Collect every hand’s full dues for this month before the award",
    );
  }
  const lastAuction = (method === "auction" || method === "lucky_draw") && isLastAuctionCycle(chit);
  if (!lastAuction && (!bid || bid <= 0)) {
    throw new Error("Enter an amount greater than zero");
  }
  if (method === "fixed" && chit.type === "loan" && interestRate != null && !Number.isFinite(Number(interestRate))) {
    throw new Error("Enter a valid interest rate for this loan");
  }
  const rec = settleWinner(chit, winnerId, bid, method, winnerSlot, interestRate);
  if (method === "fixed" && chit.type === "loan") {
    const capacity = loanFundingCapacity(chit);
    const maxFace = loanMaxFaceAmount(chit);
    if (bid > maxFace + 0.001) {
      throw new Error(
        `Loan amount (₹${bid}) cannot exceed cash on hand plus this month’s expected collections (₹${maxFace}).`,
      );
    }
    const need = rec.payout + rec.commission;
    if (need > capacity + 0.001) {
      throw new Error(
        `Loan payout plus commission (₹${need}) is more than cash on hand plus this month’s expected collections (₹${capacity}).`,
      );
    }
  } else if (!awardFirst) {
    const available = treasuryOf(chit);
    const need = rec.payout + rec.commission + (isHandSacrifice(chit) ? rec.discount : 0);
    if (need > Math.max(0, available) + 0.001) {
      throw new Error(
        `Amount plus commission${isHandSacrifice(chit) ? " and dividends" : ""} (₹${need}) is more than cash on hand (₹${Math.max(0, available)}). Collect more dues first, or lower the amount.`,
      );
    }
  }
  return rec;
}

export function cycleLedger(chit: Chit, cycle: number) {
  const collected = isAuctionFirst(chit)
    ? auctionFirstCollectedInCycle(chit, cycle)
    : chit.payments.filter((p) => p.cycle === cycle).reduce((s, p) => s + p.amount, 0);
  const rows = chit.auctions.filter((x) => x.cycle === cycle);
  const auctionRow = rows.find(
    (x) => !x.method || x.method === "auction" || x.method === "lucky_draw" || x.method === "fixed",
  );
  const dividendPaid = isHandSacrifice(chit)
    ? rows.reduce((s, a) => s + Math.max(0, Number(a.discount) || 0), 0)
    : 0;
  return {
    collected,
    payout: rows.reduce((s, a) => s + a.payout, 0),
    commission: rows.reduce((s, a) => s + (a.commission || 0), 0),
    dividendPaid,
    // Dividend generated by this cycle's auction (not the credit applied to next month's dues).
    dividend: auctionRow
      ? (auctionRow.dividend || (chit.type === "auction" ? dividendFromAuction(chit, auctionRow) : 0))
      : 0,
  };
}

export function balanceAfterCycle(chit: Chit, cycle: number) {
  if (isAuctionFirst(chit)) return 0;
  let bal = 0;
  for (let c = 1; c <= cycle; c++) {
    const row = cycleLedger(chit, c);
    bal += row.collected - row.payout - row.commission - (row.dividendPaid || 0);
  }
  return bal;
}

export function inferKind(due: number, amount: number): PaymentKind {
  if (amount > due) return "advance";
  if (amount < due) return "partial";
  return "full";
}
