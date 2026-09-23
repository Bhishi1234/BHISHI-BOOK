import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api/client";
import { cycleDue, canCloseLastMonth, loanSettlementPlan, paidInCycle } from "./lib/chitMath";
import type {
  AuctionRecord,
  Chit,
  Customer,
  PaymentKind,
  PayMode,
  PlanId,
  Ticket,
  User,
} from "./types";

type Store = {
  ready: boolean;
  error: string | null;
  user: User | null;
  customers: Customer[];
  chits: Chit[];
  tickets: Ticket[];
  authHint: string;
  sendOtp: (phone: string, name?: string) => Promise<{ devOtp?: string }>;
  verifyOtp: (phone: string, otp: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  deactivateAccount: () => Promise<void>;
  updateProfile: (patch: Partial<User>) => Promise<void>;
  setPlan: (plan: PlanId) => Promise<void>;
  refresh: () => Promise<void>;
  addCustomer: (name: string, phone: string) => Promise<Customer>;
  addChit: (chit: Omit<Chit, "id" | "payments" | "status">) => Promise<string>;
  cancelChit: (id: string) => Promise<void>;
  addMember: (chitId: string, customerId: string) => Promise<void>;
  updateChitSettings: (chitId: string, patch: {
    memberVisible?: boolean;
    remindDays?: number[];
    name?: string;
    title?: string;
  }) => Promise<void>;
  recordPayment: (
    chitId: string,
    memberId: string,
    amount: number,
    kind?: PaymentKind,
    mode?: PayMode,
    slot?: number,
  ) => Promise<void>;
  recordAllPayments: (chitId: string) => Promise<void>;
  undoPayment: (chitId: string, paymentId: string) => Promise<void>;
  recordAuction: (
    chitId: string,
    winnerId: string,
    bid: number,
    method: AuctionRecord["method"],
    winnerSlot?: number,
  ) => Promise<AuctionRecord | null>;
  replaceCycleAward: (
    chitId: string,
    winnerId: string,
    bid: number,
    method: AuctionRecord["method"],
    winnerSlot?: number,
  ) => Promise<AuctionRecord | null>;
  settleBooksEqually: (chitId: string) => Promise<void>;
  luckyDraw: (chitId: string) => Promise<AuctionRecord | null>;
  closeCycle: (id: string) => Promise<void>;
  addTicket: (subject: string, message: string) => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

function upsertChit(list: Chit[], next: Chit) {
  const i = list.findIndex((c) => c.id === next.id);
  if (i < 0) return [next, ...list];
  const copy = list.slice();
  copy[i] = next;
  return copy;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [chits, setChits] = useState<Chit[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  async function reload() {
    try {
      const [me, cs, ch, ts] = await Promise.all([
        api.profile(),
        api.customers(),
        api.chits(),
        api.tickets(),
      ]);
      setUser(me);
      setCustomers(cs as Customer[]);
      setChits(ch);
      setTickets(ts as Ticket[]);
    } catch {
      setUser(null);
      setCustomers([]);
      setChits([]);
      setTickets([]);
    } finally {
      setReady(true);
    }
  }

  async function patchChit(id: string) {
    const next = await api.chit(id);
    setChits((prev) => upsertChit(prev, next));
    return next;
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await api.ensureActive?.();
      } catch {
        // Not signed in yet, or RPC unavailable — fine.
      }
      if (!cancelled) await reload();
    })();
    const unsub = api.onAuthChange(() => {
      void reload();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  async function guarded<T>(fn: () => Promise<T>): Promise<T> {
    try {
      setError(null);
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      setError(msg);
      throw e;
    }
  }

  const value = useMemo<Store>(
    () => ({
      ready,
      error,
      user,
      customers,
      chits,
      tickets,
      authHint: api.authHint(),
      sendOtp: (phone, name) => guarded(() => api.sendOtp(phone, name).then((r) => ({ devOtp: r.devOtp }))),
      verifyOtp: async (phone, otp, name) => {
        await guarded(() => api.verifyOtp(phone, otp, name));
        await reload();
      },
      logout: async () => {
        await api.logout();
        setUser(null);
        setCustomers([]);
        setChits([]);
        setTickets([]);
      },
      deactivateAccount: async () => {
        await guarded(() => api.deactivateAccount());
        setUser(null);
        setCustomers([]);
        setChits([]);
        setTickets([]);
      },
      updateProfile: async (patch) => {
        const next = await guarded(() => api.updateProfile(patch));
        setUser(next);
        if (patch.phone !== undefined) {
          await reload();
        }
      },
      setPlan: async (plan) => {
        const next = await guarded(() => api.setPlan(plan));
        setUser(next);
      },
      refresh: async () => {
        await reload();
      },
      addCustomer: async (name, phone) => {
        const c = (await guarded(() => api.addCustomer(name, phone))) as Customer;
        setCustomers((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
        return c;
      },
      addChit: async (chit) => {
        if (chit.mode === "organise") {
          if (!chit.members?.length) {
            throw new Error("Add members to every slot before creating this chit");
          }
          if (chit.members.length !== chit.membersCount) {
            throw new Error(`Fill all ${chit.membersCount} slots (currently ${chit.members.length})`);
          }
        }
        const created = await guarded(() => api.createChit(chit));
        setChits((prev) => upsertChit(prev, created));
        return created.id;
      },
      cancelChit: async (id) => {
        const next = await guarded(() => api.cancelChit(id));
        setChits((prev) => upsertChit(prev, next));
      },
      addMember: async (chitId, customerId) => {
        const next = await guarded(() => api.addMember(chitId, customerId));
        setChits((prev) => upsertChit(prev, next));
      },
      updateChitSettings: async (chitId, patch) => {
        const next = await guarded(() => api.updateChitSettings(chitId, patch));
        setChits((prev) => upsertChit(prev, next));
      },
      recordPayment: async (chitId, memberId, amount, kind, mode, slot) => {
        const next = await guarded(() => api.recordPayment(chitId, memberId, amount, kind, mode, slot));
        setChits((prev) => upsertChit(prev, next));
      },
      recordAllPayments: async (chitId) => {
        const chit = chits.find((c) => c.id === chitId);
        if (!chit) throw new Error("Not found");
        if (chit.status !== "running") throw new Error("Chit is not running");
        let next: Chit | null = null;
        await guarded(async () => {
          for (const member of chit.members) {
            const due = cycleDue(chit, member.customerId, chit.currentCycle, member.slot);
            const paid = paidInCycle(chit, member.customerId, chit.currentCycle, member.slot);
            const left = Math.max(0, due - paid);
            if (left > 0) {
              next = await api.recordPayment(chitId, member.customerId, left, "full", "cash", member.slot);
            }
          }
        });
        if (next) setChits((prev) => upsertChit(prev, next!));
        else await patchChit(chitId);
      },
      undoPayment: async (chitId, paymentId) => {
        const next = await guarded(() => api.undoPayment(chitId, paymentId));
        setChits((prev) => upsertChit(prev, next));
      },
      recordAuction: async (chitId, winnerId, bid, method, winnerSlot) => {
        const rec = await guarded(() => api.settlePayout(chitId, winnerId, bid, method, winnerSlot));
        await patchChit(chitId);
        return rec;
      },
      replaceCycleAward: async (chitId, winnerId, bid, method, winnerSlot) => {
        const rec = await guarded(() => api.replaceCycleAward(chitId, winnerId, bid, method, winnerSlot));
        await patchChit(chitId);
        return rec;
      },
      settleBooksEqually: async (chitId) => {
        await guarded(async () => {
          const chit = await api.chit(chitId);
          if (chit.type !== "loan") throw new Error("Settlement is only for loan bhishi");
          const plan = loanSettlementPlan(chit);
          if (!plan.length || plan.every((p) => p.amount <= 0)) {
            throw new Error("No cash on hand left to settle");
          }
          for (const row of plan) {
            if (row.amount > 0) {
              await api.settlePayout(chitId, row.memberId, row.amount, "settlement");
            }
          }
        });
        await patchChit(chitId);
      },
      luckyDraw: async (chitId) => {
        const rec = await guarded(() => api.luckyDraw(chitId));
        await patchChit(chitId);
        return rec;
      },
      closeCycle: async (id) => {
        const chit = chits.find((c) => c.id === id);
        if (chit) {
          const gate = canCloseLastMonth(chit);
          if (!gate.ok) throw new Error(gate.reason);
        }
        const next = await guarded(() => api.closeCycle(id));
        setChits((prev) => upsertChit(prev, next));
      },
      addTicket: async (subject, message) => {
        const t = (await guarded(() => api.addTicket(subject, message))) as Ticket;
        setTickets((prev) => [t, ...prev]);
      },
    }),
    [ready, error, user, customers, chits, tickets],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Store missing");
  return ctx;
}
