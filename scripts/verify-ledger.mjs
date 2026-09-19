const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { mockServer } = await import("../src/api/mockServer.ts");
mockServer.auth.verifyOtp("9876543210", "123456");
const user = mockServer.auth.profile();
console.log("user", user.phone, user.plan);
for (const existing of mockServer.chits.list()) {
  if (existing.mode === "organise" && existing.members.length) mockServer.chits.cancel(existing.id);
}

const ravi = mockServer.customers.create("Ravi", "9111111111");
const meera = mockServer.customers.create("Meera", "9222222222");
const chit = mockServer.chits.create({
  name: "Launch auction",
  type: "auction",
  frequency: "monthly",
  pot: 100000,
  instalment: 10000,
  membersCount: 2,
  commissionPct: 2,
  duration: 2,
  startDate: "2026-09-01",
  mode: "organise",
  members: [
    { customerId: ravi.id, slot: 1 },
    { customerId: meera.id, slot: 2 },
  ],
  auctions: [],
  currentCycle: 1,
});
console.log("created", chit.id, chit.members.length);

mockServer.collections.create(chit.id, ravi.id, 10000, "full", "upi");
mockServer.collections.create(chit.id, meera.id, 10000, "full", "cash");
const rec = mockServer.auctions.create(chit.id, ravi.id, 80000, "auction");
console.log("settle", rec.bid, rec.discount, rec.commission, rec.dividend, rec.payout);

const closed = mockServer.chits.closeCycle(chit.id);
console.log("closed", closed.currentCycle, closed.status);

try {
  mockServer.chits.create({
    name: "Second",
    type: "fixed",
    frequency: "monthly",
    pot: 50000,
    instalment: 5000,
    membersCount: 1,
    commissionPct: 0,
    duration: 1,
    startDate: "2026-09-01",
    mode: "organise",
    members: [{ customerId: ravi.id, slot: 1 }],
    auctions: [],
    currentCycle: 1,
  });
  console.log("CAP_FAIL");
} catch (e) {
  console.log("CAP", e.message);
}
