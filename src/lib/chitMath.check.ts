import type { Chit, ChitMember } from "../types";
import {
  appliedDividend,
  balanceAfterCycle,
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
const bids = [90000, 98000, 85000, 95000, 99000];
const collect = [100000, 90100, 98100, 85100, 95100];
const expectDiv = [0, 1980, 380, 2980, 980];
const expectBal = [9900, 1900, 14900, 4900, 900];
for (let i = 0; i < 5; i++) {
  book.currentCycle = i + 1;
  const each = collect[i] / 5;
  collectAll(book, each);
  assert(appliedDividend(book, i + 1) === expectDiv[i], `applied div month ${i + 1} ${appliedDividend(book, i + 1)}`);
  auction(book, `m${i + 1}`, bids[i]);
  const bal = balanceAfterCycle(book, i + 1);
  assert(bal === expectBal[i], `balance month ${i + 1} ${bal}`);
  assert(treasuryOf(book) === expectBal[i], `treasury month ${i + 1} ${treasuryOf(book)}`);
}

const lucky = chit({ members: members(5) });
collectAll(lucky, 20000);
const ld = settleWinner(lucky, "m1", 0, "lucky_draw");
lucky.auctions.push(ld);
assert(ld.commission === 5000, `lucky commission ${ld.commission}`);
assert(ld.payout === 95000, `lucky payout ${ld.payout}`);
assert(treasuryOf(lucky) === 0, `lucky cash ${treasuryOf(lucky)}`);

console.log("chit math ok");
