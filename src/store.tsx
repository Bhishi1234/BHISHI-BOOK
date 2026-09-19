import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api/client";
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
  sendOtp: (email: string) => Promise<{ devOtp?: string }>;
  verifyOtp: (email: string, otp?: string) => Promise<void>;
  logout: () => Promise<void>;
  deactivateAccount: () => Promise<void>;
  updateProfile: (patch: Partial<User>) => Promise<void>;
  setPlan: (plan: PlanId) => Promise<void>;
  addCustomer: (name: string, phone: string) => Promise<Customer>;
  addChit: (chit: Omit<Chit, "id" | "payments" | "status">) => Promise<string>;
  cancelChit: (id: string) => Promise<void>;
  addMember: (chitId: string, customerId: string) => Promise<void>;
  updateChitSettings: (chitId: string, patch: { memberVisible?: boolean; remindDays?: number[] }) => Promise<void>;
  recordPayment: (
    chitId: string,
    memberId: string,
    amount: number,
    kind?: PaymentKind,
    mode?: PayMode,
  ) => Promise<void>;
  undoPayment: (chitId: string, paymentId: string) => Promise<void>;
  recordAuction: (
    chitId: string,
    winnerId: string,
    bid: number,
    method: AuctionRecord["method"],
  ) => Promise<AuctionRecord | null>;
  luckyDraw: (chitId: string) => Promise<AuctionRecord | null>;
  closeCycle: (id: string) => Promise<void>;
  addTicket: (subject: string, message: string) => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [chits, setChits] = useState<Chit[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  async function reload() {
    try {
      const me = await api.profile();
      const [cs, ch, ts] = await Promise.all([
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

  useEffect(() => {
    void reload();
    return api.onAuthChange(() => {
      void reload();
    });
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
      sendOtp: (email) => guarded(() => api.sendOtp(email).then((r) => ({ devOtp: r.devOtp }))),
      verifyOtp: async (email, otp) => {
        await guarded(() => api.verifyOtp(email, otp));
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
      },
      setPlan: async (plan) => {
        const next = await guarded(() => api.setPlan(plan));
        setUser(next);
      },
      addCustomer: async (name, phone) => {
        const c = await guarded(() => api.addCustomer(name, phone));
        await reload();
        return c as Customer;
      },
      addChit: async (chit) => {
        const created = await guarded(() => api.createChit(chit));
        await reload();
        return created.id;
      },
      cancelChit: async (id) => {
        await guarded(() => api.cancelChit(id));
        await reload();
      },
      addMember: async (chitId, customerId) => {
        await guarded(() => api.addMember(chitId, customerId));
        await reload();
      },
      updateChitSettings: async (chitId, patch) => {
        await guarded(() => api.updateChitSettings(chitId, patch));
        await reload();
      },
      recordPayment: async (chitId, memberId, amount, kind, mode) => {
        await guarded(() => api.recordPayment(chitId, memberId, amount, kind, mode));
        await reload();
      },
      undoPayment: async (chitId, paymentId) => {
        await guarded(() => api.undoPayment(chitId, paymentId));
        await reload();
      },
      recordAuction: async (chitId, winnerId, bid, method) => {
        const rec = await guarded(() => api.settlePayout(chitId, winnerId, bid, method));
        await reload();
        return rec;
      },
      luckyDraw: async (chitId) => {
        const rec = await guarded(() => api.luckyDraw(chitId));
        await reload();
        return rec;
      },
      closeCycle: async (id) => {
        await guarded(() => api.closeCycle(id));
        await reload();
      },
      addTicket: async (subject, message) => {
        await guarded(() => api.addTicket(subject, message));
        await reload();
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
