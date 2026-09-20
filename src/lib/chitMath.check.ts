import type { Chit, ChitMember } from "../types";
import {
  appliedDividend,
  balanceAfterCycle,
  canSettleCycle,
  isLastAuctionCycle,
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
assert(rawCycleDue(af, "m2", 1) === 19000, `af share ${rawCycleDue(af, "m2", 1)}`);
assert(canSettleCycle(af) === true, "af can auction without collections");

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
assert(lg.payout === 200000, `loan payout ${lg.payout}`);
// not enough cash — assertCanSettle would throw; settleWinner itself allows amount
loan.payments = [];
collectAll(loan, 20000);
// only 100k cash — giving 100k is ok
const lg2 = settleWinner(loan, "m1", 100000, "fixed");
loan.auctions.push(lg2);
loan.members = loan.members.map((m) =>
  m.customerId === "m1" ? { ...m, prizedCycle: 1 } : m,
);
assert(lg2.payout === 100000, `loan 1L ${lg2.payout}`);
assert(treasuryOf(loan) === 100000 - 100000 - 100, `loan cash ${treasuryOf(loan)}`);

// second loan same cycle (extra cash)
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
assert(lg3.payout === 50000, `second loan ${lg3.payout}`);
loan.auctions.push(lg3);
loan.members = loan.members.map((m) =>
  m.customerId === "m2" ? { ...m, prizedCycle: 1 } : m,
);

loan.currentCycle = 2;
assert(rawCycleDue(loan, "m1", 2) === 20000 + 5000 + 25000, `m1 due ${rawCycleDue(loan, "m1", 2)}`);
assert(rawCycleDue(loan, "m3", 2) === 20000, `m3 due ${rawCycleDue(loan, "m3", 2)}`);

console.log("chit math ok");
