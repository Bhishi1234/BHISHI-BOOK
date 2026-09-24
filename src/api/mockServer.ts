import type {
  AuctionRecord,
  Chit,
  Customer,
  Payment,
  PaymentKind,
  Ticket,
  User,
} from "../types";
import { assertCanSettlePayout, canCloseCurrentCycle, canCloseLastMonth, chitHasStarted, computeInstalment, cycleDue, inferKind } from "../lib/chitMath";
import { uid } from "../lib/format";

const KEY = "bhishi-book-api-v8";

type Session = { token: string; user: User };
type Account = { phone: string; password: string; name: string; language: string };
type PendingSignup = { phone: string; name: string; password: string; language: string };
type PendingReset = { phone: string };

type Db = {
  session: Session | null;
  pendingEmail: string | null;
  pendingPhone: string | null;
  pendingSignup: PendingSignup | null;
  pendingReset: PendingReset | null;
  accounts: Account[];
  customers: Customer[];
  chits: Chit[];
  tickets: Ticket[];
  exitedSharedIds: string[];
  deletionFeedback: { reasons: string[]; note?: string; at: string }[];
};

const demoUser: User = { name: "Organiser", email: "", phone: "", plan: "free" };

function blankDb(): Db {
  return {
    session: null,
    pendingEmail: null,
    pendingPhone: null,
    pendingSignup: null,
    pendingReset: null,
    accounts: [],
    tickets: [],
    customers: [],
    chits: [],
    exitedSharedIds: [],
    deletionFeedback: [],
  };
}

function emptyDb(): Db {
  if (import.meta.env.PROD) return blankDb();
  return {
    session: null,
    pendingEmail: null,
    pendingPhone: null,
    pendingSignup: null,
    pendingReset: null,
    accounts: [],
    tickets: [],
    exitedSharedIds: [],
    deletionFeedback: [],
    customers: [
      { id: "c1", name: "ANIKET", phone: "9000000001" },
      { id: "c2", name: "Akadhs", phone: "9000000002" },
      { id: "c3", name: "Atien", phone: "9000000003" },
      { id: "c4", name: "Bdbfjf", phone: "9000000004" },
      { id: "c5", name: "Bfbfjf", phone: "9000000005" },
      { id: "c6", name: "Bjjj", phone: "9000000006" },
      { id: "c7", name: "Brbnm", phone: "9000000007" },
      { id: "c8", name: "Brbrjfk", phone: "9000000008" },
      { id: "c9", name: "Bsndkd", phone: "9000000009" },
      { id: "c10", name: "Priya M", phone: "9000000010" },
    ],
    chits: [
      {
        ...chitSeed("ch_test1", "tesT 1", "auction", 100000, 10000, "organise", 2),
        currentCycle: 2,
        payments: [
          ...["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"].map((id, i) => ({
            id: `p1${i}`,
            memberId: id,
            cycle: 1,
            amount: 10000,
            kind: "full" as const,
            date: "2026-09-20",
            mode: "cash" as const,
          })),
          ...["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"].map((id, i) => ({
            id: `p2${i}`,
            memberId: id,
            cycle: 2,
            amount: 5200,
            kind: "full" as const,
            date: "2026-09-20",
            mode: "cash" as const,
          })),
        ],
        auctions: [
          {
            cycle: 1,
            winnerId: "c1",
            bid: 50000,
            method: "auction",
            discount: 50000,
            commission: 2000,
            dividend: 4800,
            payout: 50000,
            arrearsWithheld: 0,
          },
        ],
        members: [
          { customerId: "c1", slot: 1, prizedCycle: 1 },
          { customerId: "c2", slot: 2 },
          { customerId: "c3", slot: 3 },
          { customerId: "c4", slot: 4 },
          { customerId: "c5", slot: 5 },
          { customerId: "c6", slot: 6 },
          { customerId: "c7", slot: 7 },
          { customerId: "c8", slot: 8 },
          { customerId: "c9", slot: 9 },
          { customerId: "c10", slot: 10 },
        ],
      },
      chitSeed("ch_auction", "Auction - ₹100000", "auction", 100000, 10000, "organise", 5),
      chitSeed("ch_loan1", "Loan - ₹100000", "loan", 100000, 10000, "organise", 0, 2),
      {
        ...chitSeed("ch_dudidu", "S dudidu", "fixed", 100000, 10000, "tracking", 0),
        members: [{ customerId: "c1", slot: 1 }],
      },
      {
        ...chitSeed("ch_djjd", "Djjd", "fixed", 50000, 5000, "tracking", 0),
        members: [{ customerId: "c2", slot: 1 }],
      },
      {
        ...chitSeed("ch_taga", "Taga", "fixed", 10000, 1000, "tracking", 0),
        members: [{ customerId: "c3", slot: 1 }],
        payments: [{ id: "pt1", memberId: "c3", cycle: 1, amount: 1000, kind: "full", date: "2026-01-05", mode: "cash" }],
      },
    ],
  };
}

function chitSeed(
  id: string,
  name: string,
  type: Chit["type"],
  pot: number,
  instalment: number,
  mode: Chit["mode"],
  commissionPct: number,
  interestRate?: number,
): Chit {
  return {
    id,
    name,
    type,
    frequency: "monthly",
    pot,
    instalment,
    membersCount: 10,
    commissionPct,
    duration: 10,
    startDate: "2026-09-01",
    mode,
    status: "running",
    members: [],
    auctions: [],
    payments: [],
    currentCycle: 1,
    interestRate,
  };
}

function read(): Db {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyDb();
    const db = JSON.parse(raw) as Db;
    if (!Array.isArray(db.exitedSharedIds)) db.exitedSharedIds = [];
    if (!Array.isArray(db.deletionFeedback)) db.deletionFeedback = [];
    if (!Array.isArray(db.accounts)) db.accounts = [];
    if (db.pendingSignup === undefined) db.pendingSignup = null;
    if (db.pendingReset === undefined) db.pendingReset = null;
    return db;
  } catch {
    return emptyDb();
  }
}

function write(db: Db) {
  localStorage.setItem(KEY, JSON.stringify(db));
  return db;
}

function needUser(db: Db) {
  if (!db.session) throw new Error("Unauthorized");
  return db.session.user;
}

/** Owned chits are always owner; optional demo shared chit when profile phone matches. */
function annotateViewerRole(chit: Chit, _user: User, _db: Db): Chit {
  return { ...chit, viewerRole: chit.viewerRole || "owner" };
}

function sharedDemoChits(user: User, exited: string[] = []): Chit[] {
  if (user.phone !== "9000000001") return [];
  const rows: Chit[] = [
    {
      ...chitSeed("ch_shared_demo", "Neighbour Auction", "auction", 100000, 20000, "organise", 2),
      duration: 5,
      membersCount: 5,
      memberVisible: true,
      viewerRole: "member",
      currentCycle: 2,
      members: [
        { customerId: "c1", slot: 1, prizedCycle: 1 },
        { customerId: "c2", slot: 2 },
        { customerId: "c3", slot: 3 },
        { customerId: "c4", slot: 4 },
        { customerId: "c5", slot: 5 },
      ],
      payments: [
        { id: "ps1", memberId: "c1", cycle: 1, amount: 20000, kind: "full", date: "2026-08-01", mode: "cash" },
        { id: "ps2", memberId: "c1", cycle: 2, amount: 10000, kind: "partial", date: "2026-09-01", mode: "upi" },
      ],
      auctions: [
        {
          cycle: 1,
          winnerId: "c2",
          bid: 80000,
          method: "auction",
          discount: 20000,
          commission: 2000,
          dividend: 3600,
          payout: 80000,
          arrearsWithheld: 0,
        },
      ],
    },
  ];
  return rows.filter((c) => !exited.includes(c.id));
}

export const mockServer = {
  meta: {
    types() {
      return [
        { id: "auction", label: "Auction chit" },
        { id: "fixed", label: "Fixed & committee" },
        { id: "loan", label: "Loan chit" },
      ];
    },
    frequencies() {
      return [
        { id: "daily", label: "Daily" },
        { id: "weekly", label: "Weekly" },
        { id: "biweekly", label: "Bi Weekly" },
        { id: "monthly", label: "Monthly" },
        { id: "quarterly", label: "Quarterly" },
        { id: "halfyearly", label: "Half Yearly" },
        { id: "yearly", label: "Yearly" },
      ];
    },
  },

  auth: {
    sendOtp(phone: string, _name?: string) {
      const digits = phone.replace(/\D/g, "").slice(-10);
      if (digits.length !== 10) throw new Error("phone must be 10 digits");
      const db = read();
      db.pendingPhone = digits;
      write(db);
      return { ok: true as const, provider: "MOCK", devOtp: "123456" };
    },
    /** Start signup: stash password until OTP verifies. */
    beginSignup(input: { name: string; phone: string; password: string; language?: string }) {
      const digits = input.phone.replace(/\D/g, "").slice(-10);
      if (digits.length !== 10) throw new Error("phone must be 10 digits");
      if ((input.password || "").length < 6) throw new Error("Password must be at least 6 characters");
      const db = read();
      if (db.accounts.some((a) => a.phone === digits)) {
        throw new Error("Account already exists — log in instead");
      }
      db.pendingSignup = {
        phone: digits,
        name: (input.name || "").trim() || "Organiser",
        password: input.password,
        language: input.language || "en",
      };
      db.pendingPhone = digits;
      write(db);
      return { ok: true as const, provider: "MOCK", devOtp: "123456" };
    },
    loginWithPassword(phone: string, password: string) {
      const digits = phone.replace(/\D/g, "").slice(-10);
      const db = read();
      const acc = db.accounts.find((a) => a.phone === digits);
      if (!acc || acc.password !== password) {
        throw new Error("Wrong phone or password");
      }
      db.session = {
        token: uid("tok"),
        user: {
          ...demoUser,
          phone: digits,
          name: acc.name,
          language: acc.language,
        },
      };
      write(db);
      return db.session;
    },
    beginPasswordReset(phone: string) {
      const digits = phone.replace(/\D/g, "").slice(-10);
      if (digits.length !== 10) throw new Error("phone must be 10 digits");
      const db = read();
      if (!db.accounts.some((a) => a.phone === digits)) {
        throw new Error("No account found for this number");
      }
      db.pendingReset = { phone: digits };
      db.pendingPhone = digits;
      write(db);
      return { ok: true as const, provider: "MOCK", devOtp: "123456" };
    },
    resetPassword(phone: string, otp: string, newPassword: string) {
      const digits = phone.replace(/\D/g, "").slice(-10);
      if (otp.replace(/\D/g, "").length !== 6) throw new Error("otp must be 6 digits");
      if ((newPassword || "").length < 6) throw new Error("Password must be at least 6 characters");
      const db = read();
      if (!db.pendingReset || db.pendingReset.phone !== digits) {
        throw new Error("Request a new OTP first");
      }
      const acc = db.accounts.find((a) => a.phone === digits);
      if (!acc) throw new Error("No account found for this number");
      db.accounts = db.accounts.map((a) => (a.phone === digits ? { ...a, password: newPassword } : a));
      db.pendingReset = null;
      db.pendingPhone = null;
      write(db);
      return { ok: true as const };
    },
    verifyOtp(phone: string, otp: string, name?: string) {
      const digits = phone.replace(/\D/g, "").slice(-10);
      if (otp.replace(/\D/g, "").length !== 6) throw new Error("otp must be 6 digits");
      const db = read();
      const pending = db.pendingSignup && db.pendingSignup.phone === digits ? db.pendingSignup : null;
      const display = (pending?.name || name || "").trim() || db.session?.user.name || "Organiser";
      const language = pending?.language || "en";
      if (pending) {
        db.accounts = [
          ...db.accounts.filter((a) => a.phone !== digits),
          { phone: digits, password: pending.password, name: display, language },
        ];
        db.pendingSignup = null;
      }
      db.session = {
        token: uid("tok"),
        user: {
          ...demoUser,
          phone: digits,
          name: display,
          language,
        },
      };
      db.pendingPhone = null;
      write(db);
      return db.session;
    },
    logout() {
      const db = read();
      db.session = null;
      write(db);
      return { ok: true };
    },
    profile() {
      return needUser(read());
    },
    updateProfile(patch: Partial<User>) {
      const db = read();
      needUser(db);
      const next = { ...db.session!.user, ...patch };
      if (patch.phone !== undefined) {
        const digits = String(patch.phone || "").replace(/\D/g, "").slice(-10);
        if (patch.phone && digits.length !== 10) throw new Error("phone must be 10 digits");
        next.phone = digits || "";
      }
      db.session = { ...db.session!, user: next };
      if (next.phone && (patch.language != null || patch.name != null || patch.phone !== undefined)) {
        db.accounts = db.accounts.map((a) =>
          a.phone === next.phone
            ? { ...a, name: next.name, language: next.language || a.language }
            : a,
        );
      }
      write(db);
      return db.session.user;
    },
    deactivate(reasons?: string[], note?: string) {
      const db = read();
      db.deletionFeedback.push({
        reasons: reasons || [],
        note: note || undefined,
        at: new Date().toISOString(),
      });
      db.session = null;
      write(db);
      return { ok: true };
    },
  },

  customers: {
    list() {
      needUser(read());
      return read().customers;
    },
    create(name: string, phone: string) {
      const db = read();
      needUser(db);
      const digits = phone.replace(/\D/g, "").slice(-10);
      if (digits.length !== 10) throw new Error("Phone must be 10 digits");
      const c: Customer = { id: uid("c"), name, phone: digits };
      db.customers.push(c);
      write(db);
      return c;
    },
    update(id: string, patch: { name?: string; phone?: string }) {
      const db = read();
      needUser(db);
      const i = db.customers.findIndex((c) => c.id === id);
      if (i < 0) throw new Error("Customer not found");
      let phone = db.customers[i].phone;
      if (patch.phone !== undefined) {
        const digits = String(patch.phone || "").replace(/\D/g, "").slice(-10);
        if (digits.length !== 10) throw new Error("Phone must be 10 digits");
        phone = digits;
      }
      db.customers[i] = {
        ...db.customers[i],
        name: patch.name?.trim() || db.customers[i].name,
        phone,
      };
      write(db);
      return db.customers[i];
    },
  },

  chits: {
    list() {
      const db = read();
      const user = needUser(db);
      return [
        ...db.chits.map((c) => annotateViewerRole(c, user, db)),
        ...sharedDemoChits(user, db.exitedSharedIds || []),
      ];
    },
    get(id: string) {
      const db = read();
      const user = needUser(db);
      const shared = sharedDemoChits(user, db.exitedSharedIds || []).find((c) => c.id === id);
      if (shared) return shared;
      const chit = db.chits.find((c) => c.id === id);
      if (!chit) throw new Error("Not found");
      return annotateViewerRole(chit, user, db);
    },
    create(input: Omit<Chit, "id" | "payments" | "status">) {
      const db = read();
      needUser(db);
      if (input.mode === "organise") {
        if (!input.members?.length) {
          throw new Error("Add members to every slot before creating this chit");
        }
        if (input.members.length !== input.membersCount) {
          throw new Error(`Fill all ${input.membersCount} slots (currently ${input.members.length})`);
        }
      }
      // Platform is free — unlimited organised groups.
      const chit: Chit = {
        ...input,
        id: uid("ch"),
        payments: [],
        auctions: input.auctions ?? [],
        status: "running",
      };
      db.chits.push(chit);
      write(db);
      return chit;
    },
    cancel(id: string, reasons?: string[]) {
      const db = read();
      needUser(db);
      db.chits = db.chits.map((c) =>
        c.id === id ? { ...c, status: "cancelled", cancelReasons: reasons || [] } : c,
      );
      write(db);
      return this.get(id);
    },
    exitAsMember(id: string) {
      const db = read();
      const user = needUser(db);
      if (!user.phone || user.phone.length < 10) {
        throw new Error("Add your phone on Profile before leaving a group");
      }
      const shared = sharedDemoChits(user, db.exitedSharedIds || []).find((c) => c.id === id);
      if (shared) {
        db.exitedSharedIds = [...(db.exitedSharedIds || []), id];
        write(db);
        return;
      }
      const chit = db.chits.find((c) => c.id === id);
      if (!chit || !chit.memberVisible || chit.status !== "running") {
        throw new Error("This group is not shared or is not running");
      }
      const matchIds = new Set(
        db.customers
          .filter((cu) => cu.phone === user.phone)
          .map((cu) => cu.id),
      );
      const before = chit.members.length;
      chit.members = chit.members.filter((m) => !matchIds.has(m.customerId));
      if (chit.members.length === before) {
        throw new Error("Could not match your phone to a member on this group");
      }
      write(db);
    },
    addMember(chitId: string, customerId: string) {
      const db = read();
      needUser(db);
      db.chits = db.chits.map((c) => {
        if (c.id !== chitId) return c;
        if (chitHasStarted(c)) {
          throw new Error("Cannot add members after the bhishi has started. Use Swap to replace a person on a seat.");
        }
        const slot = Math.max(0, ...c.members.map((m) => m.slot)) + 1;
        const members = [...c.members, { customerId, slot }];
        const n = members.length;
        return {
          ...c,
          members,
          membersCount: n,
          duration: n,
          instalment: computeInstalment(c.pot, n),
          repaymentTenure: c.repaymentTenure != null ? Math.min(c.repaymentTenure, n) : c.repaymentTenure,
        };
      });
      write(db);
      return this.get(chitId);
    },
    removeMember(chitId: string, slot: number) {
      const db = read();
      needUser(db);
      db.chits = db.chits.map((c) => {
        if (c.id !== chitId) return c;
        if (chitHasStarted(c)) {
          throw new Error("Cannot remove members after the bhishi has started. Use Swap instead.");
        }
        if (!c.members.some((m) => m.slot === slot)) throw new Error("Hand / slot not found");
        if (c.members.length <= 1) throw new Error("Keep at least one member in the group");
        const members = c.members.filter((m) => m.slot !== slot);
        const n = members.length;
        return {
          ...c,
          members,
          membersCount: n,
          duration: n,
          instalment: computeInstalment(c.pot, n),
          repaymentTenure: c.repaymentTenure != null ? Math.min(c.repaymentTenure, n) : c.repaymentTenure,
        };
      });
      write(db);
      return this.get(chitId);
    },
    swapMember(chitId: string, slot: number, newCustomerId: string) {
      const db = read();
      needUser(db);
      if (!db.customers.some((cu) => cu.id === newCustomerId)) {
        throw new Error("Customer is not in your directory");
      }
      db.chits = db.chits.map((c) => {
        if (c.id !== chitId) return c;
        if (!chitHasStarted(c)) {
          throw new Error("Before the bhishi starts, remove and add members instead of swapping");
        }
        const hand = c.members.find((m) => m.slot === slot);
        if (!hand) throw new Error("Hand / slot not found");
        const oldId = hand.customerId;
        if (oldId === newCustomerId) return c;
        const handsOfOld = c.members.filter((m) => m.customerId === oldId).length;
        const payments = c.payments.map((p) => {
          if (p.memberId !== oldId) return p;
          const match =
            p.slot === slot
            || (p.slot == null && handsOfOld === 1);
          return match ? { ...p, memberId: newCustomerId } : p;
        });
        const auctions = c.auctions.map((a) => {
          if (a.winnerId !== oldId) return a;
          const match =
            a.winnerSlot === slot
            || (a.winnerSlot == null && handsOfOld === 1);
          return match ? { ...a, winnerId: newCustomerId } : a;
        });
        return {
          ...c,
          payments,
          auctions,
          members: c.members.map((m) =>
            m.slot === slot ? { ...m, customerId: newCustomerId } : m,
          ),
        };
      });
      write(db);
      return this.get(chitId);
    },
    updateSettings(id: string, patch: {
      memberVisible?: boolean;
      remindDays?: number[];
      name?: string;
      title?: string;
    }) {
      const db = read();
      needUser(db);
      db.chits = db.chits.map((c) =>
        c.id === id
          ? {
              ...c,
              memberVisible: patch.memberVisible ?? c.memberVisible,
              remindDays: patch.remindDays ?? c.remindDays,
              name: patch.name?.trim() ? patch.name.trim() : c.name,
              title: patch.title !== undefined ? (patch.title.trim() || undefined) : c.title,
            }
          : c,
      );
      write(db);
      return this.get(id);
    },
    closeCycle(id: string) {
      const db = read();
      needUser(db);
      const chit = db.chits.find((c) => c.id === id);
      if (!chit) throw new Error("Not found");
      if (chit.status !== "running") throw new Error("Chit is not running");
      if (!chit.members.length) throw new Error("Add members before closing a cycle");
      if (chit.mode === "organise" && chit.type !== "loan" && !chit.auctions.some((a) => a.cycle === chit.currentCycle)) {
        throw new Error("Settle this cycle's winner before closing");
      }
      const collectGate = canCloseCurrentCycle(chit);
      if (!collectGate.ok) throw new Error(collectGate.reason);
      const gate = canCloseLastMonth(chit);
      if (!gate.ok) throw new Error(gate.reason);
      db.chits = db.chits.map((c) => {
        if (c.id !== id) return c;
        const next = c.currentCycle + 1;
        if (next > c.duration) {
          return { ...c, currentCycle: c.duration, status: "completed" as const };
        }
        return { ...c, currentCycle: next, status: "running" as const };
      });
      write(db);
      return this.get(id);
    },
  },

  collections: {
    create(chitId: string, memberId: string, amount: number, kind?: PaymentKind, mode?: Payment["mode"], slot?: number) {
      const db = read();
      needUser(db);
      db.chits = db.chits.map((c) => {
        if (c.id !== chitId) return c;
        if (c.status !== "running") throw new Error("Chit is not running");
        if (!c.members.some((m) => m.customerId === memberId && (slot == null || m.slot === slot))) {
          throw new Error("Not a member of this chit");
        }
        if (!(amount > 0)) throw new Error("Amount must be greater than 0");
        const due = cycleDue(c, memberId, c.currentCycle, slot);
        const payment: Payment = {
          id: uid("p"),
          memberId,
          slot,
          cycle: c.currentCycle,
          amount,
          kind: kind ?? inferKind(due, amount),
          date: new Date().toISOString(),
          mode: mode ?? "cash",
        };
        return { ...c, payments: [...c.payments, payment] };
      });
      write(db);
      return mockServer.chits.get(chitId);
    },
    listByChit(chitId: string) {
      return mockServer.chits.get(chitId).payments;
    },
    list() {
      needUser(read());
      return read().chits.flatMap((c) =>
        c.payments.map((p) => ({ ...p, chitId: c.id, chitName: c.name })),
      );
    },
    undo(chitId: string, paymentId: string) {
      const db = read();
      needUser(db);
      db.chits = db.chits.map((c) => {
        if (c.id !== chitId) return c;
        return { ...c, payments: c.payments.filter((p) => p.id !== paymentId) };
      });
      write(db);
      return mockServer.chits.get(chitId);
    },
  },

  auctions: {
    create(chitId: string, winnerId: string, bid: number, method: AuctionRecord["method"], winnerSlot?: number, interestRate?: number) {
      const db = read();
      needUser(db);
      let record: AuctionRecord | null = null;
      db.chits = db.chits.map((c) => {
        if (c.id !== chitId) return c;
        if (c.status !== "running") throw new Error("Chit is not running");
        const isLoan = c.type === "loan" && method === "fixed";
        const isSettlement = method === "settlement";
        if (isSettlement && c.type !== "loan") {
          throw new Error("Settlement is only for loan bhishi");
        }
        if (!isLoan && !isSettlement && c.auctions.some((a) => a.cycle === c.currentCycle && a.method !== "settlement")) {
          throw new Error("This cycle is already settled");
        }
        const winner = winnerSlot != null
          ? c.members.find((m) => m.customerId === winnerId && m.slot === winnerSlot)
          : c.members.find((m) => m.customerId === winnerId && !m.prizedCycle)
            || c.members.find((m) => m.customerId === winnerId);
        if (!winner) throw new Error("Winner is not a member of this chit");
        if (!isLoan && !isSettlement && winner.prizedCycle) {
          throw new Error("This member already won");
        }
        if (!bid || bid <= 0) throw new Error("Enter a loan / payout amount");
        record = assertCanSettlePayout(c, winnerId, bid, method, winner.slot, interestRate);
        const nextAuctions = isLoan || isSettlement
          ? [...c.auctions, record!]
          : [...c.auctions.filter((a) => a.cycle !== c.currentCycle), record!];
        let payments = c.payments;
        const auctionFirst =
          c.type === "auction" &&
          c.auctionStyle === "auction_first" &&
          (method === "auction" || method === "lucky_draw");
        if (auctionFirst && record) {
          const n = Math.max(1, c.members.length || c.membersCount || 1);
          let share = Math.round(record.bid / n);
          if (share * n < record.bid) share += 1;
          const already = payments
            .filter((p) => p.memberId === winnerId && p.cycle === c.currentCycle)
            .reduce((s, p) => s + p.amount, 0);
          if (share > already) {
            payments = [
              ...payments,
              {
                id: uid("p"),
                memberId: winnerId,
                cycle: c.currentCycle,
                amount: share - already,
                kind: "full" as const,
                date: new Date().toISOString().slice(0, 10),
                mode: "adjusted" as const,
                note: "Winner self-contribution (auction-first)",
              },
            ];
          }
        }
        return {
          ...c,
          auctions: nextAuctions,
          payments,
          members: isSettlement
            ? c.members
            : c.members.map((m) =>
                m.customerId === winnerId && m.slot === (record?.winnerSlot ?? winner.slot)
                  ? { ...m, prizedCycle: m.prizedCycle || c.currentCycle }
                  : m,
              ),
        };
      });
      write(db);
      if (!record) throw new Error("Could not settle this cycle");
      return record;
    },
    replaceCycleAward(chitId: string, winnerId: string, bid: number, method: AuctionRecord["method"], winnerSlot?: number) {
      const db = read();
      needUser(db);
      db.chits = db.chits.map((c) => {
        if (c.id !== chitId) return c;
        if (c.status !== "running") throw new Error("Chit is not running");
        const cycle = c.currentCycle;
        const old = c.auctions.find((a) => a.cycle === cycle && a.method !== "settlement");
        let members = c.members;
        let auctions = c.auctions;
        if (old) {
          auctions = c.auctions.filter((a) => !(a.cycle === cycle && a.method !== "settlement"));
          members = c.members.map((m) => {
            const same =
              m.customerId === old.winnerId &&
              (old.winnerSlot == null || m.slot === old.winnerSlot);
            if (same && m.prizedCycle === cycle) return { ...m, prizedCycle: undefined };
            return m;
          });
        }
        return { ...c, members, auctions };
      });
      write(db);
      return this.create(chitId, winnerId, bid, method, winnerSlot);
    },
    draw(chitId: string) {
      const chit = mockServer.chits.get(chitId);
      const pool = chit.members.filter((m) => !m.prizedCycle);
      if (!pool.length) throw new Error("No unprized members left");
      const winner = pool[Math.floor(Math.random() * pool.length)];
      return this.create(chitId, winner.customerId, chit.pot, "lucky_draw", winner.slot);
    },
  },

  support: {
    list() {
      needUser(read());
      return read().tickets;
    },
    create(subject: string, message: string) {
      const db = read();
      needUser(db);
      const t: Ticket = {
        id: uid("t"),
        subject,
        message,
        createdAt: new Date().toISOString(),
        status: "open",
      };
      db.tickets = [t, ...db.tickets];
      write(db);
      return t;
    },
  },
};

export function delay<T>(value: T, ms = 80): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
