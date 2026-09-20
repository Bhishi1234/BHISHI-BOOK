import type {
  AuctionRecord,
  Chit,
  Customer,
  Payment,
  PaymentKind,
  PlanId,
  Ticket,
  User,
} from "../types";
import { assertCanSettlePayout, cycleDue, inferKind } from "../lib/chitMath";
import { normalizeEmail } from "../lib/email";
import { uid } from "../lib/format";

const KEY = "bhishi-book-api-v8";

type Session = { token: string; user: User };
type Account = { email: string; password: string };
type Db = {
  session: Session | null;
  pendingEmail: string | null;
  pendingPhone: string | null;
  accounts: Account[];
  customers: Customer[];
  chits: Chit[];
  tickets: Ticket[];
};

const demoUser: User = { name: "Organiser", email: "", phone: "", plan: "free" };

function blankDb(): Db {
  return {
    session: null,
    pendingEmail: null,
    pendingPhone: null,
    accounts: [],
    tickets: [],
    customers: [],
    chits: [],
  };
}

function emptyDb(): Db {
  if (import.meta.env.PROD) return blankDb();
  return {
    session: null,
    pendingEmail: null,
    pendingPhone: null,
    accounts: [],
    tickets: [],
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
    return JSON.parse(raw) as Db;
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
    signUp(email: string, password: string) {
      const addr = normalizeEmail(email);
      if (password.length < 6) throw new Error("Password must be at least 6 characters");
      const db = read();
      db.accounts = db.accounts ?? [];
      if (db.accounts.some((a) => a.email === addr)) throw new Error("An account with this email already exists");
      db.accounts.push({ email: addr, password });
      write(db);
      return { ok: true as const, needsVerification: false };
    },
    signIn(email: string, password: string) {
      const addr = normalizeEmail(email);
      const db = read();
      const account = (db.accounts ?? []).find((a) => a.email === addr);
      if (!account || account.password !== password) throw new Error("Invalid email or password");
      db.session = {
        token: uid("tok"),
        user: {
          ...demoUser,
          email: addr,
          name: db.session?.user.name || addr.split("@")[0] || "Organiser",
        },
      };
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
      db.session = { ...db.session!, user: { ...db.session!.user, ...patch } };
      write(db);
      return db.session.user;
    },
    setPlan(plan: PlanId) {
      return this.updateProfile({ plan, billingMode: "subscription" });
    },
    deactivate() {
      const db = read();
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
      const c: Customer = { id: uid("c"), name, phone };
      db.customers.push(c);
      write(db);
      return c;
    },
  },

  chits: {
    list() {
      needUser(read());
      return read().chits;
    },
    get(id: string) {
      needUser(read());
      const chit = read().chits.find((c) => c.id === id);
      if (!chit) throw new Error("Not found");
      return chit;
    },
    create(input: Omit<Chit, "id" | "payments" | "status">) {
      const db = read();
      const user = needUser(db);
      const active = db.chits.filter((c) => c.status === "running" && c.mode === "organise" && c.members.length > 0).length;
      const cap = user.plan === "free" ? 1 : user.plan === "pro" ? 5 : 999;
      if (input.mode === "organise" && active >= cap) {
        throw new Error(`Your ${user.plan} plan allows ${cap} active organised chit(s)`);
      }
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
    cancel(id: string) {
      const db = read();
      needUser(db);
      db.chits = db.chits.map((c) => (c.id === id ? { ...c, status: "cancelled" } : c));
      write(db);
      return this.get(id);
    },
    addMember(chitId: string, customerId: string) {
      const db = read();
      needUser(db);
      db.chits = db.chits.map((c) => {
        if (c.id !== chitId) return c;
        if (c.members.some((m) => m.customerId === customerId)) return c;
        if (c.members.length >= c.membersCount) throw new Error("All slots are filled");
        return {
          ...c,
          members: [...c.members, { customerId, slot: c.members.length + 1 }],
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
    create(chitId: string, memberId: string, amount: number, kind?: PaymentKind, mode?: Payment["mode"], note?: string) {
      const db = read();
      needUser(db);
      db.chits = db.chits.map((c) => {
        if (c.id !== chitId) return c;
        if (c.status !== "running") throw new Error("Chit is not running");
        if (!c.members.some((m) => m.customerId === memberId)) throw new Error("Not a member of this chit");
        if (!(amount > 0)) throw new Error("Amount must be greater than 0");
        const due = cycleDue(c, memberId, c.currentCycle);
        const payment: Payment = {
          id: uid("p"),
          memberId,
          cycle: c.currentCycle,
          amount,
          kind: kind ?? inferKind(due, amount),
          date: new Date().toISOString(),
          mode: mode ?? "cash",
          note,
        };
        return { ...c, payments: [...c.payments, payment] };
      });
      write(db);
      return this.listByChit(chitId);
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
      return this.listByChit(chitId);
    },
  },

  auctions: {
    create(chitId: string, winnerId: string, bid: number, method: AuctionRecord["method"]) {
      const db = read();
      needUser(db);
      let record: AuctionRecord | null = null;
      db.chits = db.chits.map((c) => {
        if (c.id !== chitId) return c;
        if (c.status !== "running") throw new Error("Chit is not running");
        const isLoan = c.type === "loan" && method === "fixed";
        const isSettlement = method === "settlement";
        if (!isLoan && !isSettlement && c.auctions.some((a) => a.cycle === c.currentCycle && a.method !== "settlement")) {
          throw new Error("This cycle is already settled");
        }
        const winner = c.members.find((m) => m.customerId === winnerId);
        if (!winner) throw new Error("Winner is not a member of this chit");
        if (!isLoan && !isSettlement && winner.prizedCycle) {
          throw new Error("This member already won");
        }
        if (!bid || bid <= 0) throw new Error("Enter a loan / payout amount");
        record = assertCanSettlePayout(c, winnerId, bid, method);
        return {
          ...c,
          auctions: isLoan || isSettlement
            ? [...c.auctions, record!]
            : [...c.auctions.filter((a) => a.cycle !== c.currentCycle), record!],
          members: isSettlement
            ? c.members
            : c.members.map((m) =>
                m.customerId === winnerId
                  ? { ...m, prizedCycle: m.prizedCycle || c.currentCycle }
                  : m,
              ),
        };
      });
      write(db);
      if (!record) throw new Error("Could not settle this cycle");
      return record;
    },
    draw(chitId: string) {
      const chit = mockServer.chits.get(chitId);
      const pool = chit.members.filter((m) => !m.prizedCycle);
      if (!pool.length) throw new Error("No unprized members left");
      const winner = pool[Math.floor(Math.random() * pool.length)];
      return this.create(chitId, winner.customerId, chit.pot, "lucky_draw");
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
