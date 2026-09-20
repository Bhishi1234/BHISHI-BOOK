import type { Chit, ChitMember } from "../types";
import {
  allocateLoanPaymentInCycle,
  appliedDividend,
  assertCanSettlePayout,
  balanceAfterCycle,
  canCloseLastMonth,
  canGiveLoan,
  canSettleCycle,
  handSacrificeAmount,
  handSacrificeDividendsReceived,
  isLastAuctionCycle,
  loanContributionPaid,
  loanPrincipalOf,
  loanPrincipalRepaid,
  memberLedgerRows,
  memberPaidTotal,
  paidInCycle,
  rawCycleDue,
  settleWinner,
  treasuryOf,
} from "./chitMath";

function chit(partial: Partial<Chit> & Pick<Chit, "members">): Chit {
  return {
    id: "t",
    name: "test",
    type: "auction",
    frequency: "monthly",
    pot: 100000,
    instalment: 20000,
    membersCount: partial.members.length,
    commissionPct: 5,
    commissionKind: "percent",
    commissionValue: 5,
    adjustmentStyle: "every_month",
    duration: 5,
    startDate: "2026-08-01",
    mode: "organise",
    status: "running",
    auctions: [],
    payments: [],
    currentCycle: 1,
    ...partial,
  };
}

function members(n: number): ChitMember[] {
  return Array.from({ length: n }, (_, i) => ({ customerId: `m${i + 1}`, slot: i + 1 }));
}

function collectAll(c: Chit, amount?: number) {
  for (const m of c.members) {
    const due = amount ?? 20000;
    c.payments.push({
      id: `p${c.payments.length}`,
      memberId: m.customerId,
      cycle: c.currentCycle,
      amount: due,
      kind: "full",
      date: "2026-01-01",
      mode: "cash",
    });
  }
}

function auction(c: Chit, winner: string, bid: number) {
  const rec = settleWinner(c, winner, bid, "auction");
  c.auctions.push(rec);
  c.members = c.members.map((m) =>
    m.customerId === winner ? { ...m, prizedCycle: c.currentCycle } : m,
  );
  return rec;
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const user = chit({ members: members(5) });
collectAll(user, 20000);
const r1 = auction(user, "m1", 95000);
assert(r1.commission === 5000, `commission ${r1.commission}`);
assert(r1.payout === 95000, `payout ${r1.payout}`);
assert(r1.dividend === 0, `dividend ${r1.dividend}`);
assert(treasuryOf(user) === 0, `cash after first auction ${treasuryOf(user)}`);

const book = chit({
  members: members(5),
  commissionPct: 0,
  commissionKind: "amount",
  commissionValue: 100,
});
const bids = [90000, 98000, 85000, 95000];
const collect = [100000, 90100, 98100, 85100];
const expectDiv = [0, 1980, 380, 2980];
const expectBal = [9900, 1900, 14900, 4900];
for (let i = 0; i < 4; i++) {
  book.currentCycle = i + 1;
  const each = collect[i] / 5;
  collectAll(book, each);
  assert(appliedDividend(book, i + 1) === expectDiv[i], `applied div month ${i + 1} ${appliedDividend(book, i + 1)}`);
  auction(book, `m${i + 1}`, bids[i]);
  const bal = balanceAfterCycle(book, i + 1);
  assert(bal === expectBal[i], `balance month ${i + 1} ${bal}`);
  assert(treasuryOf(book) === expectBal[i], `treasury month ${i + 1} ${treasuryOf(book)}`);
}

// Last cycle: remaining member takes all cash — till empties.
book.currentCycle = 5;
collectAll(book, 20000);
const cashBeforeLast = treasuryOf(book);
assert(cashBeforeLast > 0, "should have cash before last award");
assert(isLastAuctionCycle(book), "month 5 is last auction cycle");
const last = auction(book, "m5", 1);
assert(last.commission === 0, `last commission ${last.commission}`);
assert(last.dividend === 0, `last dividend ${last.dividend}`);
assert(last.bid === cashBeforeLast, `last bid ${last.bid} vs ${cashBeforeLast}`);
assert(treasuryOf(book) === 0, `last cash ${treasuryOf(book)}`);

// Collect-first: short stored instalment must still cover the pot so cash is not ₹1 light
const short = chit({
  members: members(3),
  pot: 100000,
  instalment: 33333,
  duration: 3,
  commissionPct: 0,
  commissionKind: "amount",
  commissionValue: 0,
  auctionStyle: "collect_first",
});
assert(rawCycleDue(short, "m1", 1) === 33334, `short instalment bumped ${rawCycleDue(short, "m1", 1)}`);
collectAll(short, rawCycleDue(short, "m1", 1));
assert(treasuryOf(short) === 100002, `short collect cash ${treasuryOf(short)}`);
const shortWin = settleWinner(short, "m1", 90000, "auction");
short.auctions.push(shortWin);
assert(shortWin.payout === 90000, `short payout ${shortWin.payout}`);
assert(treasuryOf({ ...short, auctions: [...short.auctions] }) === 100002 - 90000, `short cash after ${treasuryOf({ ...short, auctions: short.auctions })}`);

// Auction-first: bid then each pays bid÷n
const af = chit({
  members: members(5),
  auctionStyle: "auction_first",
  commissionPct: 0,
  commissionKind: "amount",
  commissionValue: 0,
});
assert(rawCycleDue(af, "m1", 1) === 20000, `af provisional due ${rawCycleDue(af, "m1", 1)}`);
const afRec = settleWinner(af, "m1", 95000, "auction");
af.auctions.push(afRec);
af.members = af.members.map((m) =>
  m.customerId === "m1" ? { ...m, prizedCycle: 1 } : m,
);
assert(afRec.bid === 95000, `af bid ${afRec.bid}`);
assert(afRec.commission === 0, `af commission ${afRec.commission}`);
assert(afRec.dividend === 0, `af dividend ${afRec.dividend}`);
assert(rawCycleDue(af, "m1", 1) === 19000, `af winner due ${rawCycleDue(af, "m1", 1)}`);
assert(rawCycleDue(af, "m2", 1) === 19000, `af share ${rawCycleDue(af, "m2", 1)}`);
assert(paidInCycle(af, "m1", 1) === 19000, `af winner paid-in ${paidInCycle(af, "m1", 1)}`);
assert(canSettleCycle(af) === true, "af can auction without collections");
assert(treasuryOf(af) === 0, `af cash after auction ${treasuryOf(af)}`);
for (const m of af.members) {
  if (m.customerId === "m1") continue;
  af.payments.push({
    id: `p-${m.customerId}-1`,
    memberId: m.customerId,
    cycle: 1,
    amount: 19000,
    kind: "full",
    date: "2026-01-01",
    mode: "cash",
  });
}
assert(treasuryOf(af) === 0, `af cash after collect ${treasuryOf(af)}`);
assert(balanceAfterCycle(af, 1) === 0, `af cycle bal after collect ${balanceAfterCycle(af, 1)}`);
assert(memberPaidTotal(af, "m1") === 19000, `af winner ledger paid ${memberPaidTotal(af, "m1")}`);
// Full pot taken next cycle → each member pays base instalment; till still ₹0
af.currentCycle = 2;
const afFull = settleWinner(af, "m2", 100000, "auction");
af.auctions.push(afFull);
af.members = af.members.map((m) =>
  m.customerId === "m2" ? { ...m, prizedCycle: 2 } : m,
);
assert(rawCycleDue(af, "m2", 2) === 20000, "af full-pot winner due");
assert(paidInCycle(af, "m2", 2) === 20000, "af full-pot winner paid-in");
assert(rawCycleDue(af, "m3", 2) === 20000, `af full-pot share ${rawCycleDue(af, "m3", 2)}`);
assert(treasuryOf(af) === 0, `af cash after full pot ${treasuryOf(af)}`);
assert(balanceAfterCycle(af, 2) === 0, `af cycle2 bal ${balanceAfterCycle(af, 2)}`);
for (const m of af.members) {
  if (m.customerId === "m2") continue;
  af.payments.push({
    id: `p-${m.customerId}-2`,
    memberId: m.customerId,
    cycle: 2,
    amount: 20000,
    kind: "full",
    date: "2026-02-01",
    mode: "cash",
  });
}
assert(treasuryOf(af) === 0, `af cash after month2 collect ${treasuryOf(af)}`);
assert(balanceAfterCycle(af, 2) === 0, `af bal after month2 collect ${balanceAfterCycle(af, 2)}`);

// Sacrifice hand: early take pot − one instalment; cash dividends to remaining; last takes full pot
const hs = chit({
  members: members(5),
  type: "hand_sacrifice",
  pot: 50000,
  instalment: 10000,
  duration: 5,
  commissionPct: 0,
  commissionKind: "amount",
  commissionValue: 0,
});
collectAll(hs, 10000);
assert(handSacrificeAmount(hs) === 10000, `hs sacrifice ${handSacrificeAmount(hs)}`);
const hs1 = settleWinner(hs, "m1", 50000, "fixed");
assert(hs1.payout === 40000, `hs1 payout ${hs1.payout}`);
assert(hs1.discount === 10000, `hs1 discount ${hs1.discount}`);
assert(hs1.dividend === 2500, `hs1 div ${hs1.dividend}`);
hs.auctions.push(hs1);
hs.members = hs.members.map((m) => (m.customerId === "m1" ? { ...m, prizedCycle: 1 } : m));
assert(treasuryOf(hs) === 0, `hs cash after m1 ${treasuryOf(hs)}`);
assert(handSacrificeDividendsReceived(hs, "m2") === 2500, `hs m2 div ${handSacrificeDividendsReceived(hs, "m2")}`);
assert(handSacrificeDividendsReceived(hs, "m1") === 0, "hs winner gets no cash div");

hs.currentCycle = 5;
hs.members = hs.members.map((m) =>
  ["m2", "m3", "m4"].includes(m.customerId) ? { ...m, prizedCycle: Number(m.customerId[1]) } : m,
);
collectAll(hs, 10000);
const hsLast = settleWinner(hs, "m5", 50000, "fixed");
assert(hsLast.bid === 50000, `hs last bid ${hsLast.bid}`);
assert(hsLast.discount === 0, `hs last discount ${hsLast.discount}`);
assert(hsLast.dividend === 0, `hs last div ${hsLast.dividend}`);

const lucky = chit({ members: members(5) });
collectAll(lucky, 20000);
const ld = settleWinner(lucky, "m1", 0, "lucky_draw");
lucky.auctions.push(ld);
assert(ld.commission === 5000, `lucky commission ${ld.commission}`);
assert(ld.payout === 95000, `lucky payout ${ld.payout}`);
assert(treasuryOf(lucky) === 0, `lucky cash ${treasuryOf(lucky)}`);

const loan = chit({
  members: members(5),
  type: "loan",
  commissionPct: 0,
  commissionKind: "amount",
  commissionValue: 100,
  interestRate: 5,
  repaymentTenure: 4,
  duration: 5,
});
collectAll(loan, 20000);
const lg = settleWinner(loan, "m1", 200000, "fixed");
assert(lg.discount === 10000, `loan upfront interest ${lg.discount}`);
// Only ₹1L cash on hand → net payout capped after commission
assert(lg.payout === 99900, `loan payout capped ${lg.payout}`);
loan.payments = [];
collectAll(loan, 20000);
const lg2 = settleWinner(loan, "m1", 100000, "fixed");
loan.auctions.push(lg2);
loan.members = loan.members.map((m) =>
  m.customerId === "m1" ? { ...m, prizedCycle: 1 } : m,
);
assert(lg2.discount === 5000, `loan 1L interest ${lg2.discount}`);
assert(lg2.payout === 95000, `loan 1L net ${lg2.payout}`);
assert(treasuryOf(loan) === 100000 - 95000 - 100, `loan cash ${treasuryOf(loan)}`);

loan.payments.push(
  ...loan.members.map((m, i) => ({
    id: `px${i}`,
    memberId: m.customerId,
    cycle: 1,
    amount: 20000,
    kind: "full" as const,
    date: "2026-01-02",
    mode: "cash" as const,
  })),
);
const lg3 = settleWinner(loan, "m2", 50000, "fixed");
assert(lg3.commission === 0, `second loan commission ${lg3.commission}`);
assert(lg3.discount === 2500, `second loan interest ${lg3.discount}`);
assert(lg3.payout === 47500, `second loan ${lg3.payout}`);
loan.auctions.push(lg3);
loan.members = loan.members.map((m) =>
  m.customerId === "m2" ? { ...m, prizedCycle: 1 } : m,
);

loan.currentCycle = 2;
// First repay month: upfront interest already cut → deposit + share only
assert(rawCycleDue(loan, "m1", 2) === 20000 + 0 + 25000, `m1 due ${rawCycleDue(loan, "m1", 2)}`);
assert(rawCycleDue(loan, "m3", 2) === 20000, `m3 due ${rawCycleDue(loan, "m3", 2)}`);

const late = chit({
  members: members(5),
  type: "loan",
  instalment: 10000,
  pot: 50000,
  commissionKind: "amount",
  commissionValue: 0,
  interestRate: 5,
  repaymentTenure: 4,
  duration: 5,
  currentCycle: 1,
});
for (let c = 1; c <= 3; c++) {
  late.currentCycle = c;
  collectAll(late, 10000);
}
const lateLoan = settleWinner(late, "m1", 20000, "fixed");
late.auctions.push(lateLoan);
late.members = late.members.map((m) =>
  m.customerId === "m1" ? { ...m, prizedCycle: 3 } : m,
);
assert(lateLoan.discount === 1000, `late upfront ${lateLoan.discount}`);
assert(lateLoan.payout === 19000, `late net ${lateLoan.payout}`);
late.currentCycle = 4;
assert(rawCycleDue(late, "m1", 4) === 10000 + 0 + 10000, `late m4 due ${rawCycleDue(late, "m1", 4)}`);
loan.currentCycle = 5;
assert(rawCycleDue(late, "m1", 5) === 10000 + 1000 + 10000, `late m5 due ${rawCycleDue(late, "m1", 5)}`);

// Multi-hand: same person, 2 slots → each hand independent (1× instalment each)
const multi = chit({
  members: [
    { customerId: "m1", slot: 1 },
    { customerId: "m1", slot: 2 },
    { customerId: "m2", slot: 3 },
  ],
  type: "fixed",
  pot: 30000,
  instalment: 10000,
  duration: 3,
  commissionKind: "amount",
  commissionValue: 0,
});
assert(rawCycleDue(multi, "m1", 1) === 20000, `multi m1 due ${rawCycleDue(multi, "m1", 1)}`);
assert(rawCycleDue(multi, "m1", 1, 1) === 10000, `multi m1 slot1 ${rawCycleDue(multi, "m1", 1, 1)}`);
assert(rawCycleDue(multi, "m1", 1, 2) === 10000, `multi m1 slot2 ${rawCycleDue(multi, "m1", 1, 2)}`);
assert(rawCycleDue(multi, "m2", 1) === 10000, `multi m2 due ${rawCycleDue(multi, "m2", 1)}`);
multi.payments = [];
for (const m of multi.members) {
  multi.payments.push({
    id: `pm${m.customerId}-${m.slot}`,
    memberId: m.customerId,
    slot: m.slot,
    cycle: 1,
    amount: rawCycleDue(multi, m.customerId, 1, m.slot),
    kind: "full",
    date: "2026-01-01",
    mode: "cash",
  });
}
assert(canCloseLastMonth({ ...multi, currentCycle: 1, duration: 3 }).ok, "not last month yet");
multi.currentCycle = 3;
assert(!canCloseLastMonth(multi).ok, "last month unpaid should block");
for (const m of multi.members) {
  multi.payments.push({
    id: `pm3${m.customerId}-${m.slot}`,
    memberId: m.customerId,
    slot: m.slot,
    cycle: 3,
    amount: rawCycleDue(multi, m.customerId, 3, m.slot),
    kind: "full",
    date: "2026-03-01",
    mode: "cash",
  });
}
// still outstanding for cycle 2
assert(!canCloseLastMonth(multi).ok, "cycle 2 outstanding blocks");
for (const m of multi.members) {
  multi.payments.push({
    id: `pm2${m.customerId}-${m.slot}`,
    memberId: m.customerId,
    slot: m.slot,
    cycle: 2,
    amount: rawCycleDue(multi, m.customerId, 2, m.slot),
    kind: "full",
    date: "2026-02-01",
    mode: "cash",
  });
}
assert(canCloseLastMonth(multi).ok, "last month clear should allow");

// Multi-hand loan: loan on slot 1 must not affect slot 2 dues
const multiLoan = chit({
  members: [
    { customerId: "m1", slot: 1 },
    { customerId: "m1", slot: 2 },
    { customerId: "m2", slot: 3 },
  ],
  type: "loan",
  pot: 30000,
  instalment: 10000,
  duration: 5,
  interestRate: 5,
  repaymentTenure: 4,
  commissionKind: "amount",
  commissionValue: 0,
});
for (const m of multiLoan.members) {
  multiLoan.payments.push({
    id: `ml1-${m.slot}`,
    memberId: m.customerId,
    slot: m.slot,
    cycle: 1,
    amount: 10000,
    kind: "full",
    date: "2026-01-01",
    mode: "cash",
  });
}
const ml = settleWinner(multiLoan, "m1", 20000, "fixed", 1);
multiLoan.auctions.push(ml);
assert(ml.winnerSlot === 1, `loan winnerSlot ${ml.winnerSlot}`);
assert(loanPrincipalOf(multiLoan, "m1", 1) === 20000, `slot1 principal ${loanPrincipalOf(multiLoan, "m1", 1)}`);
assert(loanPrincipalOf(multiLoan, "m1", 2) === 0, `slot2 must have no loan ${loanPrincipalOf(multiLoan, "m1", 2)}`);
multiLoan.currentCycle = 2;
assert(rawCycleDue(multiLoan, "m1", 2, 1) > 10000, `slot1 repay due ${rawCycleDue(multiLoan, "m1", 2, 1)}`);
assert(rawCycleDue(multiLoan, "m1", 2, 2) === 10000, `slot2 deposit only ${rawCycleDue(multiLoan, "m1", 2, 2)}`);
assert(canGiveLoan({ ...multiLoan, currentCycle: 4, duration: 5 }), "can loan before last");
assert(!canGiveLoan({ ...multiLoan, currentCycle: 5, duration: 5 }), "no loan on last month");
try {
  assertCanSettlePayout({ ...multiLoan, currentCycle: 5 }, "m1", 10000, "fixed", 2);
  assert(false, "last month loan should throw");
} catch (e) {
  assert(String(e).includes("last month"), `last month err ${e}`);
}

// Loan ledger: principal repayment must not inflate Paid in
multiLoan.currentCycle = 2;
const due2 = rawCycleDue(multiLoan, "m1", 2, 1);
multiLoan.payments.push({
  id: "ml-repay",
  memberId: "m1",
  slot: 1,
  cycle: 2,
  amount: due2,
  kind: "full",
  date: "2026-02-01",
  mode: "cash",
});
assert(loanContributionPaid(multiLoan, "m1", 1) === 20000, `contribution ${loanContributionPaid(multiLoan, "m1", 1)}`);
assert(loanPrincipalRepaid(multiLoan, "m1", 1) > 0, "principal repaid > 0");
const ledgerM1 = memberLedgerRows(multiLoan).find((r) => r.customerId === "m1" && r.slot === 1)!;
assert(ledgerM1.paid === 20000, `ledger paid deposits only ${ledgerM1.paid}`);
assert(ledgerM1.paid < due2 + 10000, "ledger paid less than total cash with principal");
const interestPart = allocateLoanPaymentInCycle(multiLoan, "m1", 2, 1).interest;
const unpaid = Math.max(0, ledgerM1.loanOut - loanPrincipalRepaid(multiLoan, "m1", 1));
assert(
  ledgerM1.net === unpaid - ledgerM1.paid - interestPart,
  `ledger net ${ledgerM1.net} vs unpaid ${unpaid} - paid ${ledgerM1.paid} - int ${interestPart}`,
);

console.log("chit math ok");
